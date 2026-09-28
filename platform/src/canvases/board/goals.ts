// 任务目标检查器：对模拟器事件流做确定性判断（借鉴 companydata lab 的 rules/goals 思路）。
// 任务卡里用 goals: blink, serial-hello 这样声明。
export interface SimEvent { t: number; type: 'pin' | 'serial' | 'log' | 'error'; pin?: string; level?: number; mode?: string; pwm?: number; text?: string }

export interface GoalResult { id: string; label: string; ok: boolean; detail: string }

type Checker = (ev: SimEvent[], arg?: string) => GoalResult

const led = (ev: SimEvent[], pin = 'PC13') => ev.filter((e) => e.type === 'pin' && e.pin === pin && e.level !== undefined)

export const CHECKERS: Record<string, Checker> = {
  // blink 或 blink:PC13:500  → 引脚至少翻转 4 次，且周期接近给定毫秒（默认不限）
  blink: (ev, arg) => {
    const [pin = 'PC13', ms] = (arg ?? '').split(':').filter(Boolean)
    const w = led(ev, pin)
    const toggles = w.filter((e, i) => i > 0 && e.level !== w[i - 1].level)
    if (toggles.length < 4) return { id: 'blink', label: `${pin} 眨眼`, ok: false, detail: `只看到 ${toggles.length} 次翻转，需要至少 4 次（跑久一点，或者检查 loop）` }
    const gaps = toggles.slice(1).map((e, i) => e.t - toggles[i].t)
    const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length
    if (ms && Math.abs(avg - +ms) > +ms * 0.3) return { id: 'blink', label: `${pin} 眨眼`, ok: false, detail: `平均每 ${avg.toFixed(0)}ms 翻转一次，任务要求约 ${ms}ms` }
    return { id: 'blink', label: `${pin} 眨眼`, ok: true, detail: `翻转 ${toggles.length} 次，平均间隔 ${avg.toFixed(0)}ms` }
  },
  // pinmode:PC13 → 用过 pinMode 设置这个脚
  pinmode: (ev, arg = 'PC13') => {
    const ok = ev.some((e) => e.type === 'pin' && e.pin === arg && e.mode)
    return { id: 'pinmode', label: `pinMode 配置 ${arg}`, ok, detail: ok ? '有' : `没有对 ${arg} 调用 pinMode，真板子上会不工作` }
  },
  // serial:hello → 串口输出里包含这段文字
  serial: (ev, arg = '') => {
    const all = ev.filter((e) => e.type === 'serial').map((e) => e.text).join('')
    const ok = arg ? all.includes(arg) : all.length > 0
    return { id: 'serial', label: arg ? `串口打印 "${arg}"` : '串口有输出', ok, detail: ok ? '收到' : '串口里没看到' }
  },
  // serial-lines:5 → 串口至少输出 N 行
  'serial-lines': (ev, arg = '3') => {
    const n = ev.filter((e) => e.type === 'serial').map((e) => e.text ?? '').join('').split('\n').filter(Boolean).length
    return { id: 'serial-lines', label: `串口至少 ${arg} 行`, ok: n >= +arg, detail: `${n} 行` }
  },
  // no-warn → 运行期没有 ⚠ 警告（比如没 pinMode 就写）
  'no-warn': (ev) => {
    const w = ev.filter((e) => e.type === 'log' && (e.text ?? '').startsWith('⚠'))
    return { id: 'no-warn', label: '没有运行警告', ok: w.length === 0, detail: w.length ? w[0].text ?? '' : '干净' }
  },
  // pwm:PA1 → 对该脚 analogWrite 过至少 10 个不同值（呼吸灯）
  pwm: (ev, arg = 'PC13') => {
    const vals = new Set(ev.filter((e) => e.type === 'pin' && e.pin === arg && e.pwm !== undefined).map((e) => e.pwm))
    return { id: 'pwm', label: `${arg} 平滑变化`, ok: vals.size >= 10, detail: `${vals.size} 个不同亮度` }
  },
  // input:PA0 → 读过这个脚（按键任务）
  input: (ev, arg = 'PA0') => {
    const ok = ev.some((e) => e.type === 'pin' && e.pin === arg && (e.mode === 'INPUT' || e.mode === 'INPUT_PULLUP'))
    return { id: 'input', label: `${arg} 配成输入`, ok, detail: ok ? '有' : `没有把 ${arg} 设成 INPUT / INPUT_PULLUP` }
  },
}

export function checkGoals(spec: string[], ev: SimEvent[]): GoalResult[] {
  return spec.map((s) => {
    const [name, ...rest] = s.split(':')
    const fn = CHECKERS[name]
    return fn ? fn(ev, rest.join(':')) : { id: s, label: s, ok: false, detail: '未知的目标类型' }
  })
}
