// Vercel serverless：体验模式的一步。密钥在服务端环境变量里，访客不用自己填。
// 环境变量：
//   走 Nebius（NVIDIA Nemotron）：NEBIUS_API_KEY + AGENT_PROVIDER=nebius，可选 NEBIUS_BASE_URL
//   走 OpenAI：OPENAI_API_KEY，可选 OPENAI_BASE_URL / AGENT_REASONING
//   公共：AGENT_MODEL（不填按 provider 取默认）、RATE_PER_MIN（每 IP 每分钟，默认 12）
import { systemFor, toolDefsFor, openaiStep, chatStep, NEBIUS_BASE, usageRecord } from '../_spec.js'
import { verifyUser, profileOf, rest, hasService } from '../_lib.js'

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
  if (!process.env.OPENAI_API_KEY && !process.env.NEBIUS_API_KEY) return res.status(200).json({ error: 'no-credentials' })
  // 封闭平台：必须带 Supabase 登录令牌（VITE_CLOSED=1 时）；被禁用的账号拒绝
  let user = null
  if (process.env.VITE_CLOSED === '1') {
    user = await verifyUser(req)
    if (!user) return res.status(200).json({ error: 'unauthorized' })
    if (hasService()) { const p = await profileOf(user.id).catch(() => null); if (p?.disabled) return res.status(200).json({ error: 'unauthorized' }) }
  }
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0] || req.socket?.remoteAddress || '?'
  if (limited(ip, Number(process.env.RATE_PER_MIN || 12))) return res.status(429).json({ error: '太快了，歇一分钟再来' })
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    const messages = body?.messages
    if (!Array.isArray(messages) || messages.length > 200) return res.status(400).json({ error: 'bad messages' })
    // 一律 trim：从网页上复制值很容易带进制表符/空格，模型名带上它就会报 model does not exist
    const env = (k) => (process.env[k] ?? '').trim()
    const useNebius = (env('AGENT_PROVIDER') || (env('NEBIUS_API_KEY') ? 'nebius' : 'openai')) === 'nebius'
    const model = env('AGENT_MODEL') || (useNebius ? 'nvidia/nemotron-3-super-120b-a12b' : 'gpt-5.6-luna')
    const system = systemFor('static', '', body.lang === 'en' ? 'en' : 'zh')
    const tools = toolDefsFor('static')
    const out = useNebius
      ? await chatStep({ apiKey: env('NEBIUS_API_KEY'), base: env('NEBIUS_BASE_URL') || NEBIUS_BASE, model, system, tools, messages, visionModel: env('VISION_MODEL') || undefined, lang: body.lang === 'en' ? 'en' : 'zh' })
      : await openaiStep({ apiKey: env('OPENAI_API_KEY'), base: env('OPENAI_BASE_URL'), model, system, tools, messages, reasoning: env('AGENT_REASONING') })
    // 记用量（失败不影响回复）
    if (hasService()) {
      const rec = usageRecord(model, out.usage, { user_id: user?.id ?? null, email: user?.email ?? null, mode: 'static', lang: body.lang === 'en' ? 'en' : 'zh', tool_calls: out.content.filter((c) => c.type === 'tool_use').length })
      rest('usage_log', { method: 'POST', prefer: 'return=minimal', body: JSON.stringify(rec) }).catch((e) => console.error('usage_log', e.message))
    }
    return res.status(200).json({ ...out, mock: false, agentModel: model, mode: 'static' })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
