// 当前用户的角色（前端据此显示管理入口）
import { cors, verifyUser, profileOf } from '../_lib.js'
export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()
  const u = await verifyUser(req)
  if (!u) return res.status(200).json({ role: null })
  let why = ''
  const p = await profileOf(u.id).catch((e) => { why = e.message; return null })
  return res.status(200).json({ role: p?.role ?? 'user', disabled: p?.disabled ?? false, email: u.email, ...(why ? { why } : {}) })
}
