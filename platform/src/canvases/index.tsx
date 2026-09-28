// Canvas 注册表。markdown 里写一个 ```canvas 代码块就能嵌入：
//
// ```canvas
// type: board
// id: blink
// goals: pinmode:PC13, blink:PC13:500
// task: 让 PC13 每 500ms 翻转一次
// ```
//
// 或者 board 类型带初始代码：在 goals 之后放一行 --- 然后写代码。
import { BoardSim } from './board/BoardSim'
import { Pinout } from './pinout/Pinout'
import { Pullup } from './circuit/Pullup'
import { ResistorColor } from './circuit/ResistorColor'
import { Parts } from './parts/Parts'
import { Wiring, parseWires } from './parts/Wiring'
import { LedCircuit } from './circuit/LedCircuit'

export interface CanvasSpec { type: string; props: Record<string, string>; body: string }

export function parseCanvas(block: string): CanvasSpec {
  const [head, ...rest] = block.split(/^---\s*$/m)
  const props: Record<string, string> = {}
  for (const line of head.split('\n')) {
    const i = line.indexOf(':')
    if (i > 0) props[line.slice(0, i).trim()] = line.slice(i + 1).trim()
  }
  return { type: props.type ?? 'unknown', props, body: rest.join('---').replace(/^\n/, '') }
}

export const CANVAS_META: Record<string, { name: string; desc: string }> = {
  board: { name: '虚拟板子', desc: '在浏览器里写 Arduino 代码、"烧录"、看灯看串口。板子没到也能练。' },
  pinout: { name: '引脚图', desc: '蓝药丸每个脚能干什么，按功能过滤。' },
  pullup: { name: '上拉电阻', desc: '按键为什么要上拉，悬空会怎样。' },
  'led-circuit': { name: 'LED 限流', desc: '拖动电阻看电流，理解为什么 LED 要串电阻。' },
  'resistor-color': { name: '色环电阻', desc: '拨色环读阻值。' },
  parts: { name: '元件图鉴', desc: '套件里每个零件长什么样、干什么、在哪个任务用。' },
  wiring: { name: '接线图', desc: '零件当节点、线画中间，每根线写清接哪个脚。' },
}

export function Canvas({ spec }: { spec: CanvasSpec }) {
  const p = spec.props
  switch (spec.type) {
    case 'board':
      return <BoardSim id={p.id ?? 'sim'} code={spec.body || DEFAULT_CODE} goals={p.goals ? p.goals.split(',').map((s) => s.trim()).filter(Boolean) : []} task={p.task} rubric={p.rubric} height={p.height ? +p.height : undefined} />
    case 'pinout': return <Pinout highlight={p.highlight} />
    case 'pullup': return <Pullup />
    case 'led-circuit': return <LedCircuit />
    case 'resistor-color': return <ResistorColor />
    case 'parts': return <Parts only={p.only ? p.only.split(',').map((x) => x.trim()) : undefined} />
    case 'wiring': return <Wiring title={p.title} left={(p.left ?? '').split(',').map((x) => x.trim()).filter(Boolean)} right={(p.right ?? '').split(',').map((x) => x.trim()).filter(Boolean)} wires={parseWires(p.wires ?? '')} note={p.note} />
    default: return <div className="canvas"><div className="canvas-head"><span className="canvas-title">未知的 canvas 类型：{spec.type}</span></div></div>
  }
}

export const DEFAULT_CODE = `#include <Arduino.h>

void setup() {
  pinMode(PC13, OUTPUT);
  Serial.begin(115200);
  Serial.println("hello from stm32");
}

void loop() {
  digitalWrite(PC13, LOW);   // 蓝药丸：低电平亮
  delay(500);
  digitalWrite(PC13, HIGH);
  delay(500);
}
`
