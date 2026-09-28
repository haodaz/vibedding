// Vercel serverless：状态。告诉前端这是体验模式、AI 配了没。
export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.status(200).json({ mode: 'static', ai: process.env.OPENAI_API_KEY ? (process.env.AGENT_MODEL || 'gpt-5.6-luna') : null, pio: null, ports: [], usb: [], time: new Date().toISOString() })
}
