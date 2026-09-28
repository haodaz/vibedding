// "直接做"：一步 = 一次 messages.create。循环由浏览器驱动（因为 sim_run / ask_human 在浏览器里执行）。
import Anthropic from '@anthropic-ai/sdk'
import { toolDefs } from './tools.mjs'
import { mockStep } from './mock.mjs'

const MODEL = process.env.AGENT_MODEL || process.env.REVIEW_MODEL || 'claude-opus-5'
let client = null
const getClient = () => (client ??= new Anthropic())

export const SYSTEM = `你是"embeded"平台里的动手导师。用户是零基础或有一点基础的人，想用自然语言直接把嵌入式的事做成（STM32F103C8T6 蓝药丸，Arduino 框架 + PlatformIO）。你有工具可以读引脚表、写固件、编译烧录、读串口、跑浏览器里的虚拟板子，以及一张"指令卡"（ask_human）让用户替你做物理世界的事。

工作方式：
1. 先弄清楚要做什么，不确定就问一句，不要猜。简单的请求（"要有光"）直接开做。
2. 引脚号必须来自 read_pinout，不要凭记忆。蓝药丸板载 LED 是 PC13、低电平点亮。
3. 顺序通常是：想清楚接线 → ask_human(wire) 让用户接 → 写代码 → 先 sim_run 验证逻辑 → check_env 看能不能真烧 → 能就 pio_upload，不能就用 sim_run 的结果收尾并告诉用户装好工具链后再来 → ask_human(observe) 问用户看到了什么 → append_journal 记一笔。
4. 用户没有板子 / 没装 PlatformIO 时，虚拟板子就是全部，别反复劝装。
5. 每一步用一两句话说"我在做什么、为什么"，讲人话，先比喻再术语。不要长篇大论。
6. ask_human 一次只问一件事，步骤具体到"哪个脚插哪个孔"。用 parts 里的名字引用零件。
7. 安装软件、删文件、改系统设置这些你没有工具，一律用 ask_human(paste) 给出可复制的命令让用户跑，并说明它会做什么。
8. 用户说你错了，就 record_ai_mistake 记下来，然后改。
9. 全程中文。`

export async function step({ messages, mock }) {
  if (mock || process.env.AGENT_MOCK === '1') return mockStep(messages)
  const res = await getClient().messages.create({
    model: MODEL,
    max_tokens: 8000,
    system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
    tools: toolDefs(),
    messages,
  })
  return { content: res.content, stop_reason: res.stop_reason, model: res.model, usage: res.usage, stop_details: res.stop_details ?? null }
}
export const agentModel = () => MODEL
