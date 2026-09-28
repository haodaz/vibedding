/// <reference lib="webworker" />
// 模拟器运行在 Web Worker 里：用户代码死循环也不会卡住页面，Stop 就是 terminate。
// 主线程 <-> worker 消息：
//   in:  { type: 'run', js }  { type: 'pin', pin, level }（按钮按下/松开）
//   out: { type: 'pin', pin, mode|level|pwm }  { type: 'serial', text }  { type: 'log', text }  { type: 'error', message }  { type: 'done' }

type Msg =
  | { type: 'run'; js: string }
  | { type: 'input'; pin: string; level: 0 | 1 }

const ctx = self as unknown as Worker
const post = (m: unknown) => ctx.postMessage(m)

const pinModes: Record<string, string> = {}
const pinLevels: Record<string, number> = {}
const inputs: Record<string, number> = {}
const t0 = Date.now()
let serialBuf = ''
let serialIn = ''

const PINS = ['PA0','PA1','PA2','PA3','PA4','PA5','PA6','PA7','PA8','PA9','PA10','PA11','PA12','PA15',
  'PB0','PB1','PB3','PB4','PB5','PB6','PB7','PB8','PB9','PB10','PB11','PB12','PB13','PB14','PB15','PC13','PC14','PC15']

function flushSerial() {
  if (serialBuf) { post({ type: 'serial', text: serialBuf }); serialBuf = '' }
}

const api = {
  HIGH: 1, LOW: 0, OUTPUT: 'OUTPUT', INPUT: 'INPUT', INPUT_PULLUP: 'INPUT_PULLUP',
  LED_BUILTIN: 'PC13',
  ...Object.fromEntries(PINS.map((p) => [p, p])),
  pinMode(pin: string, mode: string) {
    pinModes[pin] = mode
    if (mode === 'INPUT_PULLUP' && inputs[pin] === undefined) inputs[pin] = 1
    if (mode === 'INPUT' && inputs[pin] === undefined) inputs[pin] = 0
    post({ type: 'pin', pin, mode })
  },
  digitalWrite(pin: string, level: number) {
    if (pinModes[pin] !== 'OUTPUT') post({ type: 'log', text: `⚠ ${pin} 没有 pinMode(…, OUTPUT) 就 digitalWrite，真板子上不会亮` })
    pinLevels[pin] = level ? 1 : 0
    post({ type: 'pin', pin, level: pinLevels[pin] })
  },
  digitalRead(pin: string): number {
    if (!pinModes[pin]) post({ type: 'log', text: `⚠ ${pin} 没有 pinMode 就 digitalRead，读到的值不可靠` })
    return inputs[pin] ?? (pinModes[pin] === 'INPUT_PULLUP' ? 1 : 0)
  },
  analogWrite(pin: string, duty: number) {
    const d = Math.max(0, Math.min(255, Math.round(duty)))
    post({ type: 'pin', pin, pwm: d })
  },
  analogRead(pin: string): number {
    return inputs[pin + ':adc'] ?? 2048
  },
  millis: () => Date.now() - t0,
  micros: () => (Date.now() - t0) * 1000,
  delay: (ms: number) => { flushSerial(); return new Promise<void>((r) => setTimeout(r, Math.max(0, ms))) },
  delayMicroseconds: (us: number) => { flushSerial(); return new Promise<void>((r) => setTimeout(r, us / 1000)) },
  map: (x: number, a: number, b: number, c: number, d: number) => ((x - a) * (d - c)) / (b - a) + c,
  constrain: (x: number, a: number, b: number) => Math.min(b, Math.max(a, x)),
  random: (a: number, b?: number) => (b === undefined ? Math.floor(Math.random() * a) : a + Math.floor(Math.random() * (b - a))),
  abs: Math.abs, min: Math.min, max: Math.max, sqrt: Math.sqrt, pow: Math.pow,
  Serial: {
    begin(baud: number) { post({ type: 'log', text: `Serial.begin(${baud})` }) },
    print(x: unknown) { serialBuf += String(x) },
    println(x: unknown = '') { serialBuf += String(x) + '\n'; flushSerial() },
    available() { return serialIn.length },
    read() { if (!serialIn) return -1; const c = serialIn.charCodeAt(0); serialIn = serialIn.slice(1); return c },
    readString() { const s = serialIn; serialIn = ''; return s },
    readStringUntil(ch: string) {
      const i = serialIn.indexOf(ch)
      if (i === -1) { const s = serialIn; serialIn = ''; return s }
      const s = serialIn.slice(0, i); serialIn = serialIn.slice(i + 1); return s
    },
  },
}

ctx.onmessage = async (ev: MessageEvent<Msg | { type: 'serialIn'; text: string }>) => {
  const m = ev.data
  if (m.type === 'input') { inputs[m.pin] = m.level; return }
  if (m.type === 'serialIn') { serialIn += m.text; return }
  if (m.type !== 'run') return
  try {
    const names = Object.keys(api)
    const factory = new Function(...names, `"use strict"; ${m.js}\n return { setup, loop }`)
    const { setup, loop } = factory(...names.map((n) => (api as Record<string, unknown>)[n]))
    await setup()
    flushSerial()
    let n = 0
    // 一直跑 loop；每 200 次让出一下，避免没有 delay 的 loop 把 worker 消息队列饿死
    for (;;) {
      await loop()
      if (++n % 200 === 0) { flushSerial(); await new Promise((r) => setTimeout(r, 0)) }
    }
  } catch (e) {
    flushSerial()
    post({ type: 'error', message: (e as Error).message })
  }
}
