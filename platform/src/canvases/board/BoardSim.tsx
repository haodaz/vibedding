import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Editor } from './Editor'
import { BoardSvg, type PinState } from './BoardSvg'
import { transpile } from './transpile'
import { checkGoals, type GoalResult, type SimEvent } from './goals'
import { Mentor } from '../../components/Mentor'

export interface BoardSimProps {
  id: string
  code: string           // 初始代码
  goals?: string[]       // 目标检查器，如 ['pinmode:PC13', 'blink:PC13:500']
  task?: string          // 任务描述（给 AI 评审用）
  rubric?: string        // 验收标准（给 AI 评审用）
  height?: number
}

const REVIEW_PROMPT = (task: string, rubric: string, code: string, log: string) =>
  `我是零基础学 STM32 的门外汉，用 Arduino 框架。请评审我的代码：先说能不能达到目标，再按严重程度指出最多 3 个问题（每个说清楚为什么），不要重写整段代码。\n\n## 任务\n${task}\n\n## 验收标准\n${rubric}\n\n## 我的代码\n\`\`\`cpp\n${code}\n\`\`\`\n\n## 模拟器输出\n\`\`\`\n${log}\n\`\`\``

export function BoardSim({ id, code: initial, goals = [], task = '', rubric = '', height = 300 }: BoardSimProps) {
  const storeKey = 'sim:' + id
  const [code, setCode] = useState(() => { try { return localStorage.getItem(storeKey) ?? initial } catch { return initial } })
  const [running, setRunning] = useState(false)
  const [pins, setPins] = useState<Record<string, PinState>>({})
  const [serial, setSerial] = useState('')
  const [logs, setLogs] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [buttonDown, setButtonDown] = useState(false)
  const [goalResults, setGoalResults] = useState<GoalResult[] | null>(null)
  const [review, setReview] = useState<{ state: 'idle' | 'loading' | 'done' | 'nokey' | 'error'; text?: string }>({ state: 'idle' })
  const [serialIn, setSerialIn] = useState('')
  const worker = useRef<Worker | null>(null)
  const events = useRef<SimEvent[]>([])
  const t0 = useRef(0)

  useEffect(() => { try { localStorage.setItem(storeKey, code) } catch { /* ignore */ } }, [code, storeKey])

  const stop = useCallback(() => {
    worker.current?.terminate(); worker.current = null
    setRunning(false)
    if (goals.length) setGoalResults(checkGoals(goals, events.current))
  }, [goals])

  const run = () => {
    stop()
    setPins({}); setSerial(''); setLogs([]); setError(null); setGoalResults(null)
    events.current = []; t0.current = performance.now()
    const r = transpile(code)
    if (!r.ok) { setError((r.line ? `第 ${r.line} 行附近：` : '') + r.message); return }
    const w = new Worker(new URL('./sim.worker.ts', import.meta.url), { type: 'module' })
    worker.current = w
    w.onmessage = (ev: MessageEvent) => {
      const m = ev.data, t = performance.now() - t0.current
      if (m.type === 'pin') {
        events.current.push({ t, type: 'pin', pin: m.pin, level: m.level, mode: m.mode, pwm: m.pwm })
        setPins((p) => ({ ...p, [m.pin]: { ...p[m.pin], ...(m.mode ? { mode: m.mode } : {}), ...(m.level !== undefined ? { level: m.level, pwm: undefined } : {}), ...(m.pwm !== undefined ? { pwm: m.pwm } : {}) } }))
      } else if (m.type === 'serial') {
        events.current.push({ t, type: 'serial', text: m.text })
        setSerial((s) => (s + m.text).slice(-4000))
      } else if (m.type === 'log') {
        events.current.push({ t, type: 'log', text: m.text })
        setLogs((l) => [...l.slice(-30), `[${(t / 1000).toFixed(2)}s] ${m.text}`])
      } else if (m.type === 'error') {
        events.current.push({ t, type: 'error', text: m.message })
        setError('运行出错：' + m.message); stop()
      }
    }
    w.postMessage({ type: 'run', js: r.js })
    // 按键初始状态：松开（上拉 = 1）
    w.postMessage({ type: 'input', pin: 'PA0', level: 1 })
    setRunning(true)
  }

  const onButton = (down: boolean) => {
    setButtonDown(down)
    worker.current?.postMessage({ type: 'input', pin: 'PA0', level: down ? 0 : 1 })
  }

  useEffect(() => () => worker.current?.terminate(), [])

  const logText = useMemo(() => [
    goalResults ? '目标检查：\n' + goalResults.map((g) => `${g.ok ? '✔' : '✘'} ${g.label}：${g.detail}`).join('\n') : '',
    logs.length ? '运行日志：\n' + logs.join('\n') : '',
    serial ? '串口输出：\n' + serial.slice(-800) : '',
    error ?? '',
  ].filter(Boolean).join('\n\n'), [goalResults, logs, serial, error])

  const askReview = async () => {
    setReview({ state: 'loading' })
    try {
      const res = await fetch('/api/review', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code, task, rubric, log: logText }) })
      const j = await res.json()
      if (j.error === 'no-credentials') setReview({ state: 'nokey' })
      else if (j.error) setReview({ state: 'error', text: j.error })
      else setReview({ state: 'done', text: j.review })
    } catch (e) {
      setReview({ state: 'error', text: '连不上本地服务。确认 npm run dev 在跑（它会同时起 5174 端口的小服务）。' + (e as Error).message })
    }
  }
  const copyPrompt = async () => {
    await navigator.clipboard.writeText(REVIEW_PROMPT(task, rubric, code, logText))
    setReview({ state: 'nokey', text: '已复制。去 Claude / Cursor 粘贴。' })
  }

  const allOk = goalResults && goalResults.every((g) => g.ok)

  return (
    <div className={'canvas boardsim' + (running ? ' running' : '')}>
      <div className="canvas-head">
        <span className="canvas-title">▣ 虚拟板子 · {id}</span>
        <div className="chips">
          <button className={'chip primary' + (running ? ' stop' : '')} onClick={running ? stop : run}>{running ? '■ 停止' : '▶ 烧录并运行'}</button>
          <button className="chip" onClick={() => { stop(); setCode(initial) }}>↺ 恢复初始代码</button>
          <button className="chip ai" onClick={askReview} disabled={review.state === 'loading'}>{review.state === 'loading' ? '⋯ AI 在看' : '✦ AI 评审'}</button>
        </div>
      </div>
      <div className="boardsim-body">
        <div className="boardsim-editor">
          <Editor value={code} onChange={setCode} height={height} />
          {error && <div className="sim-error">✘ {error}</div>}
        </div>
        <div className="boardsim-side">
          <BoardSvg pins={pins} buttonDown={buttonDown} onButton={onButton} />
          <div className="serial">
            <div className="serial-head"><span>串口监视器 <em>115200</em></span><span className={'led ' + (running ? 'on' : '')} /></div>
            <pre className="serial-out">{serial || (running ? '' : '（运行后这里显示 Serial.print 的内容）')}</pre>
            <form className="serial-in" onSubmit={(e) => { e.preventDefault(); worker.current?.postMessage({ type: 'serialIn', text: serialIn + '\n' }); setSerialIn('') }}>
              <input value={serialIn} onChange={(e) => setSerialIn(e.target.value)} placeholder="给板子发一行（回车）" disabled={!running} />
            </form>
          </div>
          {logs.length > 0 && <pre className="sim-log">{logs.slice(-6).join('\n')}</pre>}
        </div>
      </div>
      {goalResults && (
        <div className={'goals ' + (allOk ? 'ok' : '')}>
          <div className="goals-head">{allOk ? '🎯 目标全部达成' : '目标检查（停止运行后自动评估）'}</div>
          {goalResults.map((g) => <div key={g.id} className={'goal ' + (g.ok ? 'ok' : 'no')}><span>{g.ok ? '✔' : '✘'}</span><b>{g.label}</b><span className="muted">{g.detail}</span></div>)}
        </div>
      )}
      {review.state !== 'idle' && <Mentor state={review.state} text={review.text} onCopy={copyPrompt} />}
    </div>
  )
}
