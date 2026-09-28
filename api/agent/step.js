// Vercel serverless：体验模式的一步。密钥在服务端环境变量里，访客不用自己填。
// 环境变量：OPENAI_API_KEY（必填）、AGENT_MODEL（默认 gpt-5.6-luna）、AGENT_REASONING（可选）、RATE_PER_MIN（每 IP 每分钟，默认 12）
import { systemFor, toolDefsFor, openaiStep } from '../../platform/shared/spec.mjs'

const bucket = new Map()   // 简单限流：每个实例内存里数，够挡住无意的刷
function limited(ip, perMin) {
  const now = Date.now(), win = 60_000
  const arr = (bucket.get(ip) ?? []).filter((t) => now - t < win)
  arr.push(now); bucket.set(ip, arr)
  return arr.length > perMin
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'content-type')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  if (!process.env.OPENAI_API_KEY) return res.status(200).json({ error: 'no-credentials' })
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0] || req.socket?.remoteAddress || '?'
  if (limited(ip, Number(process.env.RATE_PER_MIN || 12))) return res.status(429).json({ error: '太快了，歇一分钟再来' })
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    const messages = body?.messages
    if (!Array.isArray(messages) || messages.length > 200) return res.status(400).json({ error: 'bad messages' })
    const model = process.env.AGENT_MODEL || 'gpt-5.6-luna'
    const out = await openaiStep({ apiKey: process.env.OPENAI_API_KEY, base: process.env.OPENAI_BASE_URL, model, system: systemFor('static'), tools: toolDefsFor('static'), messages, reasoning: process.env.AGENT_REASONING })
    return res.status(200).json({ ...out, mock: false, agentModel: model, mode: 'static' })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
