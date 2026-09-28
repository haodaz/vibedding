// 没有 API 密钥时的演示脚本："要有光"。用来验证界面和卡片流程，不是真 AI。
const CODE = `#include <Arduino.h>

void setup() {
  pinMode(PA1, OUTPUT);
}

void loop() {
  digitalWrite(PA1, HIGH);   // 外接 LED 高电平亮
  delay(500);
  digitalWrite(PA1, LOW);
  delay(500);
}
`
const SCRIPT = [
  [{ type: 'text', text: '好，要有光。我先查一下引脚表，挑一个方便接 LED 的脚。' }, { type: 'tool_use', id: 'm1', name: 'read_pinout', input: { filter: 'PWM' } }],
  [{ type: 'text', text: '用 PA1。LED 不能直接接 3.3V，要串一个 220Ω 电阻限流，不然它会烧。请你接线：' }, { type: 'tool_use', id: 'm2', name: 'ask_human', input: { kind: 'wire', title: '把红色 LED 接到 PA1', why: 'LED 只认电流方向：长脚接正、短脚接负；电阻串在回路里限制电流，220Ω 刚好让它亮而不烧。', steps: ['拿出红色 LED 和一只红红棕金的电阻', 'LED 长脚（+）接电阻一端', '电阻另一端接板子的 PA1', 'LED 短脚（−）接板子的 GND'], parts: ['bluepill', 'led_red', 'resistor_220'], wires: 'bluepill.PA1 > resistor_220.一端 #39c5ff; resistor_220.另一端 > led_red.长脚(+) #ff5c5c "先过电阻"; led_red.短脚(-) > bluepill.GND #8b93a7', expect: '接好后 LED 暂时不亮，正常，程序还没写。' } }],
  [{ type: 'text', text: '接好了。我写一段最简单的程序：PA1 每半秒亮灭一次。先在虚拟板子上跑一下看逻辑对不对。' }, { type: 'tool_use', id: 'm3', name: 'sim_run', input: { code: CODE, seconds: 3 } }],
  [{ type: 'text', text: '逻辑没问题。看看这台电脑能不能真烧。' }, { type: 'tool_use', id: 'm4', name: 'check_env', input: {} }],
  [{ type: 'text', text: 'PlatformIO 还没装，所以今天先到虚拟板子为止。装好之后（跑下面这条命令）再来，我直接烧进去。' }, { type: 'tool_use', id: 'm5', name: 'ask_human', input: { kind: 'paste', title: '装嵌入式工具链', why: '编译器和烧录工具都在这个脚本里，一次装好。大概 10 分钟。', steps: ['打开终端，进到 embeded 目录', '粘贴运行下面这条'], paste: 'bash tools/setup-mac.sh', expect: '最后一行是"全部完成"。' } }],
  [{ type: 'text', text: '记一笔日志。' }, { type: 'tool_use', id: 'm6', name: 'append_journal', input: { title: '要有光', body: '- 用 PA1 驱动外接红色 LED，串 220Ω\n- 虚拟板子验证通过，真板子等工具链装好\n- 学到：LED 必须串电阻，长脚接正' } }],
  [{ type: 'text', text: '好了。今天的光在虚拟板子上亮了，真板子上的光等工具链装好就是一句话的事。要不要顺手让它呼吸？' }],
]
export function mockStep(messages) {
  const n = messages.filter((m) => m.role === 'assistant').length
  const content = SCRIPT[Math.min(n, SCRIPT.length - 1)]
  const hasTool = content.some((c) => c.type === 'tool_use')
  return { content, stop_reason: hasTool ? 'tool_use' : 'end_turn', model: 'mock', usage: null, stop_details: null }
}
