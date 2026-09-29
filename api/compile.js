// 云编译代理：浏览器 → 这里（验登录）→ compile-server（带令牌）。浏览器永远拿不到编译服务的令牌。
import { cors, body, verifyUser } from './_lib.js'
export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  if (!process.env.COMPILE_URL) return res.status(200).json({ error: 'no-compiler' })
  if (process.env.VITE_CLOSED === '1' && !(await verifyUser(req))) return res.status(200).json({ error: 'unauthorized' })
  try {
    const r = await fetch(`${process.env.COMPILE_URL.replace(/\/$/, '')}/compile`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.COMPILE_TOKEN || ''}` }, body: JSON.stringify(body(req)) })
    const text = await r.text()
    res.status(200).setHeader('Content-Type', 'application/json'); return res.end(text)
  } catch (e) { return res.status(200).json({ error: '编译服务连不上：' + e.message }) }
}
