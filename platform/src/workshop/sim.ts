// 给 agent 用的模拟器：跑 N 秒，收集事件流，回一段人类可读的摘要。
import { transpile } from '../canvases/board/transpile'
import type { PinState } from '../canvases/board/BoardSvg'

export interface SimLive { pins: Record<string, PinState>; serial: string; running: boolean }
export interface SimOutcome { summary: string; ok: boolean }

export function runSim(code: string, seconds: number, onLive: (l: SimLive) => void): Promise<SimOutcome> {
  return new Promise((resolve) => {
    const r = transpile(code)
    if (!r.ok) { onLive({ pins: {}, serial: '', running: false }); resolve({ ok: false, summary: `模拟器不能跑这段代码：${r.line ? '第 ' + r.line + ' 行附近，' : ''}${r.message}` }); return }
    const w = new Worker(new URL('../canvases/board/sim.worker.ts', import.meta.url), { type: 'module' })
    const pins: Record<string, PinState> = {}
    let serial = ''
    const logs: string[] = []
    const transitions: Record<string, { t: number; level: number }[]> = {}
    const pwm: Record<string, Set<number>> = {}
    let error: string | null = null
    const t0 = performance.now()
    const live = () => onLive({ pins: { ...pins }, serial, running: true })
    w.onmessage = (ev: MessageEvent) => {
      const m = ev.data, t = performance.now() - t0
      if (m.type === 'pin') {
        pins[m.pin] = { ...pins[m.pin], ...(m.mode ? { mode: m.mode } : {}), ...(m.level !== undefined ? { level: m.level, pwm: undefined } : {}), ...(m.pwm !== undefined ? { pwm: m.pwm } : {}) }
        if (m.level !== undefined) (transitions[m.pin] ??= []).push({ t, level: m.level })
        if (m.pwm !== undefined) (pwm[m.pin] ??= new Set()).add(m.pwm)
        live()
      } else if (m.type === 'serial') { serial = (serial + m.text).slice(-3000); live() }
      else if (m.type === 'log') logs.push(m.text)
      else if (m.type === 'error') { error = m.message; finish() }
    }
    w.postMessage({ type: 'run', js: r.js })
    w.postMessage({ type: 'input', pin: 'PA0', level: 1 })
    const timer = setTimeout(finish, seconds * 1000)
    function finish() {
      clearTimeout(timer); w.terminate()
      onLive({ pins: { ...pins }, serial, running: false })
      const lines: string[] = []
      for (const [pin, tr] of Object.entries(transitions)) {
        const toggles = tr.filter((e, i) => i > 0 && e.level !== tr[i - 1].level)
        const gaps = toggles.slice(1).map((e, i) => e.t - toggles[i].t)
        const avg = gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 0
        lines.push(`${pin}（${pins[pin]?.mode ?? '未 pinMode'}）: 翻转 ${toggles.length} 次${avg ? `，平均间隔 ${avg.toFixed(0)}ms` : ''}，最后电平 ${tr[tr.length - 1].level}`)
      }
      for (const [pin, set] of Object.entries(pwm)) lines.push(`${pin}: PWM，${set.size} 个不同占空比`)
      const modesOnly = Object.entries(pins).filter(([p, s]) => s.mode && !transitions[p] && !pwm[p]).map(([p, s]) => `${p}: ${s.mode}`)
      if (modesOnly.length) lines.push('只配置未变化: ' + modesOnly.join(', '))
      const warn = logs.filter((l) => l.startsWith('⚠'))
      const summary = [
        error ? `运行出错: ${error}` : `跑了 ${seconds} 秒`,
        lines.length ? '引脚:\n' + lines.join('\n') : '引脚: 没有任何变化',
        serial ? '串口输出:\n' + serial.slice(-600) : '串口: 无输出',
        warn.length ? '警告:\n' + warn.join('\n') : '',
      ].filter(Boolean).join('\n')
      resolve({ ok: !error && warn.length === 0, summary })
    }
  })
}
