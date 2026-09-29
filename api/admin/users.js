// 管理员：用户列表 / 建用户 / 禁用启用 / 设管理员
import { cors, body, requireAdmin, rest, authAdmin } from '../_lib.js'

export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()
  const admin = await requireAdmin(req, res); if (!admin) return
  try {
    if (req.method === 'GET') {
      const list = await authAdmin('users?per_page=1000')
      const users = (list.users ?? list ?? [])
      const profiles = await rest('profiles?select=*')
      const pmap = Object.fromEntries(profiles.map((p) => [p.user_id, p]))
      // 最近 30 天用量按用户汇总
      const since = new Date(Date.now() - 30 * 864e5).toISOString()
      const usage = await rest(`usage_log?select=user_id,cost_usd,input_tokens,output_tokens&ts=gte.${since}&limit=10000`)
      const umap = {}
      for (const r of usage) { const u = (umap[r.user_id] ??= { cost: 0, tokens: 0, calls: 0 }); u.cost += Number(r.cost_usd); u.tokens += r.input_tokens + r.output_tokens; u.calls++ }
      return res.status(200).json({ users: users.map((u) => ({ id: u.id, email: u.email, created_at: u.created_at, last_sign_in_at: u.last_sign_in_at, banned: !!u.banned_until && new Date(u.banned_until) > new Date(), role: pmap[u.id]?.role ?? 'user', disabled: pmap[u.id]?.disabled ?? false, display_name: pmap[u.id]?.display_name ?? '', usage30: umap[u.id] ?? { cost: 0, tokens: 0, calls: 0 } })) })
    }
    if (req.method === 'POST') {
      const { email, password, role = 'user', display_name = '' } = body(req)
      if (!email || !password || password.length < 6) return res.status(400).json({ error: 'email + password(>=6) required' })
      const u = await authAdmin('users', { method: 'POST', body: JSON.stringify({ email, password, email_confirm: true }) })
      await rest('profiles', { method: 'POST', prefer: 'resolution=merge-duplicates,return=representation', body: JSON.stringify({ user_id: u.id, email, role, display_name }) })
      return res.status(200).json({ ok: true, id: u.id })
    }
    if (req.method === 'PATCH') {
      const { user_id, role, disabled, display_name } = body(req)
      if (!user_id) return res.status(400).json({ error: 'user_id required' })
      if (user_id === admin.id && (role === 'user' || disabled === true)) return res.status(400).json({ error: '不能把自己降级或禁用' })
      const patch = {}
      if (role) patch.role = role
      if (typeof disabled === 'boolean') patch.disabled = disabled
      if (typeof display_name === 'string') patch.display_name = display_name
      await rest('profiles', { method: 'POST', prefer: 'resolution=merge-duplicates,return=representation', body: JSON.stringify({ user_id, ...patch }) })
      if (typeof disabled === 'boolean') await authAdmin(`users/${user_id}`, { method: 'PUT', body: JSON.stringify({ ban_duration: disabled ? '876000h' : 'none' }) })
      return res.status(200).json({ ok: true })
    }
    return res.status(405).json({ error: 'method' })
  } catch (e) { return res.status(500).json({ error: e.message }) }
}
