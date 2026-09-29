// 管理员：用量统计。?days=30
import { cors, requireAdmin, rest } from '../_lib.js'

export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()
  const admin = await requireAdmin(req, res); if (!admin) return
  try {
    const days = Math.min(365, Math.max(1, Number(new URL(req.url, 'http://x').searchParams.get('days') || 30)))
    const since = new Date(Date.now() - days * 864e5).toISOString()
    const rows = await rest(`usage_log?select=*&ts=gte.${since}&order=ts.desc&limit=20000`)
    const agg = (key) => { const m = {}; for (const r of rows) { const k = key(r) ?? '—'; const a = (m[k] ??= { key: k, calls: 0, input: 0, output: 0, cached: 0, cost: 0 }); a.calls++; a.input += r.input_tokens; a.output += r.output_tokens; a.cached += r.cached_tokens; a.cost += Number(r.cost_usd) }; return Object.values(m) }
    const total = { calls: rows.length, input: 0, output: 0, cached: 0, cost: 0 }
    for (const r of rows) { total.input += r.input_tokens; total.output += r.output_tokens; total.cached += r.cached_tokens; total.cost += Number(r.cost_usd) }
    const today = new Date().toISOString().slice(0, 10)
    const week = new Date(Date.now() - 7 * 864e5).toISOString()
    const sum = (f) => rows.filter(f).reduce((s, r) => s + Number(r.cost_usd), 0)
    return res.status(200).json({
      days, total, today_cost: sum((r) => r.ts.startsWith(today)), week_cost: sum((r) => r.ts >= week),
      by_day: agg((r) => r.ts.slice(0, 10)).sort((a, b) => a.key.localeCompare(b.key)),
      by_user: agg((r) => r.email || r.user_id).sort((a, b) => b.cost - a.cost),
      by_model: agg((r) => r.model).sort((a, b) => b.cost - a.cost),
      recent: rows.slice(0, 50),
    })
  } catch (e) { return res.status(500).json({ error: e.message }) }
}
