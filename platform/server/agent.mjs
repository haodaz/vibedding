// "直接做"：一步 = 调一次模型。循环由浏览器驱动。规格（系统提示、工具 schema、OpenAI 翻译）在 ../shared/spec.mjs，和 Vercel 函数、浏览器共用。
import Anthropic from '@anthropic-ai/sdk'
import { systemFor, toolDefsFor, openaiStep, chatStep, NEBIUS_BASE } from '../shared/spec.mjs'
import { mockStep } from './mock.mjs'
import { ROOT } from './tools.mjs'

// 环境变量一律 trim：从网页表格里复制粘贴很容易带进首尾空白或制表符，
// 带着它去请求模型会报 "model does not exist"，排查起来很费时间
const env = (k) => (process.env[k] ?? '').trim()

export function provider() {
  const p = env('AGENT_PROVIDER')
  if (p) return p
  if (process.env.NEBIUS_API_KEY) return 'nebius'
  if (process.env.OPENAI_API_KEY) return 'openai'
  if (process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN) return 'anthropic'
  return 'mock'
}
const DEFAULT_MODEL = { nebius: 'nvidia/nemotron-3-super-120b-a12b', openai: 'gpt-5.6-luna', anthropic: 'claude-opus-5' }
export const agentModel = () => env('AGENT_MODEL') || DEFAULT_MODEL[provider()] || 'gpt-5.6-luna'
export const SYSTEM = systemFor('local', ROOT)
const sys = (lang) => systemFor('local', ROOT, lang)

let anthropic = null
async function stepAnthropic(messages, lang) {
  anthropic ??= new Anthropic()
  const res = await anthropic.messages.create({ model: agentModel(), max_tokens: 8000, system: [{ type: 'text', text: sys(lang), cache_control: { type: 'ephemeral' } }], tools: toolDefsFor('local'), messages })
  return { content: res.content, stop_reason: res.stop_reason, model: res.model, usage: res.usage, stop_details: res.stop_details ?? null }
}

export async function step({ messages, mock, lang = 'zh' }) {
  const p = mock || process.env.AGENT_MOCK === '1' ? 'mock' : provider()
  if (p === 'mock') return mockStep(messages)
  if (p === 'nebius') return chatStep({ apiKey: env('NEBIUS_API_KEY'), base: env('NEBIUS_BASE_URL') || NEBIUS_BASE, model: agentModel(), system: sys(lang), tools: toolDefsFor('local'), messages, visionModel: env('VISION_MODEL') || undefined, lang })
  if (p === 'openai') return openaiStep({ apiKey: process.env.OPENAI_API_KEY, base: process.env.OPENAI_BASE_URL, model: agentModel(), system: sys(lang), tools: toolDefsFor('local'), messages, reasoning: process.env.AGENT_REASONING })
  return stepAnthropic(messages, lang)
}
