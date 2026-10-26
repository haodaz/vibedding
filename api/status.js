// Vercel serverless：状态。告诉前端这是体验模式、AI 配了没。
//
// ai 这个字段前端拿去画状态栏：null 就显示灰的「AI 未配置」。
// 所以这里挑模型的规则必须和 api/agent/step.js 完全一致——只看 OPENAI_API_KEY 的话，
// 跑在 Nebius 上的部署会把自己标成「没配 AI」，而它其实好好的。
// 一律 trim：从网页复制环境变量容易带进制表符，和 step.js 同样的理由。
const env = (k) => (process.env[k] ?? '').trim()

export function activeModel() {
  const provider = env('AGENT_PROVIDER') || (env('NEBIUS_API_KEY') ? 'nebius' : env('OPENAI_API_KEY') ? 'openai' : env('ANTHROPIC_API_KEY') ? 'anthropic' : '')
  if (provider === 'nebius') return env('NEBIUS_API_KEY') ? env('AGENT_MODEL') || 'nvidia/nemotron-3-super-120b-a12b' : null
  if (provider === 'openai') return env('OPENAI_API_KEY') ? env('AGENT_MODEL') || 'gpt-5.6-luna' : null
  if (provider === 'anthropic') return env('ANTHROPIC_API_KEY') ? env('AGENT_MODEL') || 'claude-opus-5' : null
  return null
}

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.status(200).json({ mode: 'static', ai: activeModel(), pio: null, ports: [], usb: [], time: new Date().toISOString(), env: { supabase_url: !!process.env.VITE_SUPABASE_URL, anon: !!process.env.VITE_SUPABASE_ANON_KEY, service: !!process.env.SUPABASE_SERVICE_ROLE_KEY, service_len: (process.env.SUPABASE_SERVICE_ROLE_KEY || '').length, closed: process.env.VITE_CLOSED, compile: !!process.env.COMPILE_URL } })
}
