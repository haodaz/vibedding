// "直接做"：一步 = 调一次模型。循环由浏览器驱动（sim_run / ask_human / propose_bom 在浏览器里执行）。
// 提供方：OpenAI Responses API（默认，模型 gpt-5.6-luna）或 Anthropic Messages API。
// 浏览器和服务端之间统一用 Anthropic 风格的消息（text / tool_use / tool_result），OpenAI 这边做翻译。
import Anthropic from '@anthropic-ai/sdk'
import { toolDefs } from './tools.mjs'
import { mockStep } from './mock.mjs'
import { ROOT } from './tools.mjs'

export function provider() {
  const p = process.env.AGENT_PROVIDER
  if (p) return p
  if (process.env.OPENAI_API_KEY) return 'openai'
  if (process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN) return 'anthropic'
  return 'mock'
}
export const agentModel = () => process.env.AGENT_MODEL || (provider() === 'openai' ? 'gpt-5.6-luna' : 'claude-opus-5')
const OPENAI_BASE = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'

export const SYSTEM = `项目在这台电脑上的绝对路径是 ${ROOT} 。给用户的任何命令都要能原样复制运行：用这个真实路径，不要写 <你的项目目录> 之类的占位符。

你是"embeded"平台里的动手导师。用户是零基础或有一点基础的人，想用自然语言直接把嵌入式的事做成。默认主控 STM32F103C8T6 蓝药丸，Arduino 框架 + PlatformIO；需要联网的项目可以建议换 ESP32。你有工具可以查元件知识库、查引脚表、管理用户库存、出采购清单、建项目、写固件、编译烧录、读串口、跑浏览器里的虚拟板子，以及一张"指令卡"（ask_human）让用户替你做物理世界的事。

承接需求的流程：
1. **弄清楚要做什么。** 开放式需求（"做个自动浇花"）先问 1～3 个关键问题（规模、供电、要不要联网、预算），一次问完，不要连环追问。简单请求（"要有光"）直接开做。
2. **出方案和采购清单。** 先 read_inventory 看用户已有什么，再 search_parts 查知识库，然后**必须用 propose_bom 工具**展示清单（它会渲染成可勾选的卡片），不要在正文里写采购表格。每件写清楚干什么用、为什么选它、价格区间、淘宝搜索词、可替代品；用 id 对应知识库条目（这样卡片能显示图）。用户已有的标 have。知识库没有的东西照样可以列，但 catalog=false 并提醒核对。add_part 只收录电子模块/元件（传感器、驱动、显示、通信等），水箱、软管、瓶子这类耗材不收。等用户在卡片上确认后，再 save_project 存 bom。
3. **用户提到自己有什么，就 update_inventory 记下来。** 库存是聊出来的，不要一上来盘问。
4. **save_project 存项目**（需求、清单、步骤）。之后每完成一步 update 进度。对话丢了项目还在。
5. **分步实施。** 每一步：想清楚接线 → ask_human(wire) → 写代码（write_firmware 到 firmware/<项目名>/）→ sim_run 验证逻辑 → check_env 看能不能真烧 → 能就 pio_upload，不能就先在虚拟板子上收尾 → ask_human(observe) 问结果 → append_journal。
6. 用户没有板子 / 零件还没到，就把能在虚拟板子上做的先做了，告诉他到货后从哪一步继续。

硬规则：
- 引脚号必须来自 read_pinout，不要凭记忆。蓝药丸板载 LED 是 PC13、低电平点亮。
- 5V 器件（超声波、MQ 气体、继电器）接 STM32 要提醒分压/电平问题。电机、水泵、灯带不能直接接 GPIO。
- 每一步用一两句话说"我在做什么、为什么"，讲人话，先比喻再术语。不长篇大论。
- ask_human 一次只问一件事，步骤具体到"哪个脚插哪个孔"，用 list_parts / search_parts 里的 id 引用零件。
- 安装软件、删文件、改系统设置你没有工具，一律 ask_human(paste) 给可复制的命令让用户跑。
- 用户说你错了，就 record_ai_mistake 记下来，然后改。
- 全程中文。`

// ---------- Anthropic ----------
let anthropic = null
async function stepAnthropic(messages) {
  anthropic ??= new Anthropic()
  const res = await anthropic.messages.create({
    model: agentModel(), max_tokens: 8000,
    system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
    tools: toolDefs(), messages,
  })
  return { content: res.content, stop_reason: res.stop_reason, model: res.model, usage: res.usage, stop_details: res.stop_details ?? null }
}

// ---------- OpenAI Responses API ----------
function toOpenAIInput(messages) {
  const items = []
  for (const m of messages) {
    if (typeof m.content === 'string') { items.push({ role: m.role, content: m.content }); continue }
    for (const b of m.content) {
      if (b.type === 'text') items.push({ role: m.role, content: m.role === 'assistant' ? [{ type: 'output_text', text: b.text }] : b.text })
      else if (b.type === 'tool_use') items.push({ type: 'function_call', call_id: b.id, name: b.name, arguments: JSON.stringify(b.input ?? {}) })
      else if (b.type === 'tool_result') items.push({ type: 'function_call_output', call_id: b.tool_use_id, output: typeof b.content === 'string' ? b.content : JSON.stringify(b.content) })
    }
  }
  return items
}
async function stepOpenAI(messages) {
  const body = {
    model: agentModel(),
    instructions: SYSTEM,
    input: toOpenAIInput(messages),
    tools: toolDefs().map((t) => ({ type: 'function', name: t.name, description: t.description, parameters: t.input_schema })),
    max_output_tokens: 8000,
  }
  if (process.env.AGENT_REASONING) body.reasoning = { effort: process.env.AGENT_REASONING }
  const r = await fetch(`${OPENAI_BASE}/responses`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }, body: JSON.stringify(body) })
  if (!r.ok) throw new Error(`OpenAI ${r.status}: ${(await r.text()).slice(0, 400)}`)
  const data = await r.json()
  const content = []
  for (const item of data.output ?? []) {
    if (item.type === 'message') for (const part of item.content ?? []) if (part.type === 'output_text' && part.text) content.push({ type: 'text', text: part.text })
    if (item.type === 'function_call') {
      let input = {}
      try { input = JSON.parse(item.arguments || '{}') } catch { input = { _raw: item.arguments } }
      content.push({ type: 'tool_use', id: item.call_id, name: item.name, input })
    }
  }
  const hasTool = content.some((c) => c.type === 'tool_use')
  return { content, stop_reason: hasTool ? 'tool_use' : 'end_turn', model: data.model, usage: data.usage ?? null, stop_details: null }
}

export async function step({ messages, mock }) {
  const p = mock || process.env.AGENT_MOCK === '1' ? 'mock' : provider()
  if (p === 'mock') return mockStep(messages)
  if (p === 'openai') return stepOpenAI(messages)
  return stepAnthropic(messages)
}
