// Vercel 函数共用：Supabase REST（不带 SDK，零依赖）、登录校验、管理员校验。
const URL_ = () => process.env.VITE_SUPABASE_URL
const ANON = () => process.env.VITE_SUPABASE_ANON_KEY
const SERVICE = () => process.env.SUPABASE_SERVICE_ROLE_KEY

export function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'content-type, authorization')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS')
}
export function body(req) { try { return typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body ?? {}) } catch { return {} } }

/** 用访客的登录令牌换用户信息；没登录返回 null */
export async function verifyUser(req) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!token || !URL_() || !ANON()) return null
  const r = await fetch(`${URL_()}/auth/v1/user`, { headers: { apikey: ANON(), Authorization: `Bearer ${token}` } }).catch(() => null)
  if (!r || !r.ok) return null
  const u = await r.json()
  return { id: u.id, email: u.email }
}

/** service role 的 REST 调用（绕过 RLS，只在服务端用） */
export async function rest(path, init = {}) {
  if (!URL_() || !SERVICE()) throw new Error('缺 SUPABASE_SERVICE_ROLE_KEY')
  const r = await fetch(`${URL_()}/rest/v1/${path}`, { ...init, headers: { apikey: SERVICE(), Authorization: `Bearer ${SERVICE()}`, 'Content-Type': 'application/json', Prefer: init.prefer ?? 'return=representation', ...(init.headers ?? {}) } })
  const text = await r.text()
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${text.slice(0, 300)}`)
  return text ? JSON.parse(text) : null
}
/** GoTrue 管理接口（建用户、禁用等） */
export async function authAdmin(path, init = {}) {
  const r = await fetch(`${URL_()}/auth/v1/admin/${path}`, { ...init, headers: { apikey: SERVICE(), Authorization: `Bearer ${SERVICE()}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) } })
  const text = await r.text()
  if (!r.ok) throw new Error(`Auth ${r.status}: ${text.slice(0, 300)}`)
  return text ? JSON.parse(text) : null
}
export async function profileOf(userId) {
  const rows = await rest(`profiles?user_id=eq.${userId}&select=*`)
  return rows?.[0] ?? null
}
export async function requireAdmin(req, res) {
  const u = await verifyUser(req)
  if (!u) { res.status(401).json({ error: 'unauthorized' }); return null }
  const p = await profileOf(u.id).catch(() => null)
  if (!p || p.role !== 'admin') { res.status(403).json({ error: 'forbidden' }); return null }
  return { ...u, profile: p }
}
export const hasService = () => !!(URL_() && SERVICE())
