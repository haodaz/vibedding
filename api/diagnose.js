// Vercel serverless：深度排障。烧进去了却不工作时，把现象 + 代码 + 串口 + 板子档案
// + 排障库条目一次交给更强的推理模型（Nemotron Ultra），要一份按概率排序的排障单。
// 和主循环分开是有意的：主循环要的是"选下一个工具"，这里要的是"把所有变量摆上桌比"。
// 环境变量：NEBIUS_API_KEY（+ 可选 DIAGNOSE_MODEL / NEBIUS_BASE_URL）或 OPENAI_API_KEY
import { DIAGNOSE_SYSTEM, DIAGNOSE_SYSTEM_EN, NEBIUS_BASE, NEBIUS_MODELS } from './_spec.js'
import { verifyUser, profileOf, hasService } from './_lib.js'

const bucket = new Map()
function limited(ip, perMin) {
  const now = Date.now()
  const arr = (bucket.get(ip) ?? []).filter((t) => now - t < 60_000)
  arr.push(now); bucket.set(ip, arr)
  return arr.length > perMin
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'content-type, authorization')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  const env = (k) => (process.env[k] ?? '').trim()
  if (!env('NEBIUS_API_KEY') && !env('OPENAI_API_KEY')) return res.status(200).json({ error: 'no-credentials' })

  if (env('VITE_CLOSED') === '1') {
    const user = await verifyUser(req)
    if (!user) return res.status(200).json({ error: 'unauthorized' })
    if (hasService()) { const p = await profileOf(user.id).catch(() => null); if (p?.disabled) return res.status(200).json({ error: 'unauthorized' }) }
  }
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0] || req.socket?.remoteAddress || '?'
  // 排障比普通一步贵，单独限得更紧
  if (limited(ip, Number(env('DIAGNOSE_PER_MIN') || 4))) return res.status(429).json({ error: '排障比较费算力，歇一分钟再来' })

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    const { symptom, code = '', serial = '', board = '', profile = '', wiring = '', tried = '', kb = '', lang = 'zh' } = body ?? {}
    if (!symptom) return res.status(400).json({ error: 'no-symptom' })
    const L = lang === 'en'
    const user = [
      L ? `## What the user sees\n${symptom}` : `## 现象\n${symptom}`,
      board ? (L ? `\n## Board\n${board}` : `\n## 板子\n${board}`) : '',
      profile ? (L ? `\n## Board profile — THE ONLY source of truth for pins and logic levels\n${String(profile).slice(0, 5000)}`
                   : `\n## 板子档案 —— 引脚和电平只能以这里为准\n${String(profile).slice(0, 5000)}`) : '',
      wiring ? (L ? `\n## Wiring as known\n${wiring}` : `\n## 已知接线\n${wiring}`) : '',
      serial ? (L ? `\n## Serial output\n\`\`\`\n${String(serial).slice(0, 3000)}\n\`\`\`` : `\n## 串口输出\n\`\`\`\n${String(serial).slice(0, 3000)}\n\`\`\``)
             : (L ? '\n## Serial output\n(nothing — note that this is itself evidence)' : '\n## 串口输出\n（什么都没有——注意这本身就是证据）'),
      code ? (L ? `\n## Code on the board\n\`\`\`cpp\n${String(code).slice(0, 6000)}\n\`\`\`` : `\n## 板子上的代码\n\`\`\`cpp\n${String(code).slice(0, 6000)}\n\`\`\``) : '',
      tried ? (L ? `\n## Already ruled out\n${tried}` : `\n## 已经排除\n${tried}`) : '',
      kb ? (L ? `\n## Related entries from the troubleshooting library\n${String(kb).slice(0, 4000)}` : `\n## 排障库里的相关条目\n${String(kb).slice(0, 4000)}`) : '',
    ].filter(Boolean).join('\n')
    const system = L ? DIAGNOSE_SYSTEM_EN : DIAGNOSE_SYSTEM

    if (env('NEBIUS_API_KEY')) {
      const model = env('DIAGNOSE_MODEL') || NEBIUS_MODELS.ultra
      const r = await fetch(`${env('NEBIUS_BASE_URL') || NEBIUS_BASE}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env('NEBIUS_API_KEY')}` },
        // Ultra 是推理模型：思考在 reasoning_content，正文在 content。
        // max_tokens 给小了会在推理阶段被截断，思考过程溢进正文。
        body: JSON.stringify({ model, max_tokens: 6000, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }),
      })
      if (!r.ok) return res.status(200).json({ error: `nebius-${r.status}` })
      const msg = (await r.json()).choices?.[0]?.message ?? {}
      const analysis = (msg.content ?? '').trim()
      if (!analysis) return res.status(200).json({ error: 'empty-answer' })
      return res.status(200).json({ analysis, reasoning: (msg.reasoning_content ?? '').trim() || undefined, model })
    }

    const base = env('OPENAI_BASE_URL') || 'https://api.openai.com/v1'
    const model = env('AGENT_MODEL') || 'gpt-5.6-luna'
    const r = await fetch(`${base}/responses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env('OPENAI_API_KEY')}` },
      body: JSON.stringify({ model, instructions: system, max_output_tokens: 4000, input: [{ role: 'user', content: user }] }),
    })
    if (!r.ok) return res.status(200).json({ error: `openai-${r.status}` })
    const j = await r.json()
    const analysis = (j.output ?? []).flatMap((o) => o.content ?? []).filter((c) => c.type === 'output_text').map((c) => c.text).join('').trim()
    return res.status(200).json({ analysis, model })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
