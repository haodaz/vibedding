// "直接做"：一步 = 调一次模型。循环由浏览器驱动。规格（系统提示、工具 schema、OpenAI 翻译）在 ../shared/spec.mjs，和 Vercel 函数、浏览器共用。
import Anthropic from '@anthropic-ai/sdk'
import { systemFor, toolDefsFor, openaiStep } from '../shared/spec.mjs'
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
export const SYSTEM = systemFor('local', ROOT)

let anthropic = null
async function stepAnthropic(messages) {
  anthropic ??= new Anthropic()
  const res = await anthropic.messages.create({ model: agentModel(), max_tokens: 8000, system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }], tools: toolDefsFor('local'), messages })
  return { content: res.content, stop_reason: res.stop_reason, model: res.model, usage: res.usage, stop_details: res.stop_details ?? null }
}

export async function step({ messages, mock }) {
  const p = mock || process.env.AGENT_MOCK === '1' ? 'mock' : provider()
  if (p === 'mock') return mockStep(messages)
  if (p === 'openai') return openaiStep({ apiKey: process.env.OPENAI_API_KEY, base: process.env.OPENAI_BASE_URL, model: agentModel(), system: SYSTEM, tools: toolDefsFor('local'), messages, reasoning: process.env.AGENT_REASONING })
  return stepAnthropic(messages)
}
