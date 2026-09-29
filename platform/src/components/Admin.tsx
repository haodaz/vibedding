import { useEffect, useState } from 'react'
import { getToken } from '../auth'
import { Scene } from './Scene'
import { t } from '../i18n'

// 管理后台：用户管理 + 用量统计（只有 profiles.role = admin 能进；本地模式只有用量）
type User = { id: string; email: string; created_at: string; last_sign_in_at: string | null; role: string; disabled: boolean; display_name: string; usage30: { cost: number; tokens: number; calls: number } }
type Agg = { key: string; calls: number; input: number; output: number; cached: number; cost: number }
type Usage = { days: number; total: Agg; today_cost: number; week_cost: number; by_day: Agg[]; by_user: Agg[]; by_model: Agg[]; recent: Record<string, unknown>[] }

async function api(path: string, init: RequestInit = {}) {
  const token = await getToken()
  const r = await fetch(path, { ...init, headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}), ...(init.headers ?? {}) } })
  const j = await r.json().catch(() => ({}))
  if (!r.ok || j.error) throw new Error(j.error ?? r.statusText)
  return j
}
const fmt$ = (n: number) => '$' + n.toFixed(n < 1 ? 4 : 2)
const fmtK = (n: number) => (n >= 1e6 ? (n / 1e6).toFixed(2) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'k' : String(n))

export function Admin() {
  const [tab, setTab] = useState<'usage' | 'users'>('usage')
  return (
    <>
      <Scene name="prompts_ai" className="hero small">
        <div className="eyebrow">// ADMIN</div>
        <h1>{t('admin.title')}</h1>
        <p>{t('admin.sub')}</p>
      </Scene>
      <div className="lab-tabs">
        <button className={'chip' + (tab === 'usage' ? ' on' : '')} onClick={() => setTab('usage')}>{t('admin.usage')}</button>
        <button className={'chip' + (tab === 'users' ? ' on' : '')} onClick={() => setTab('users')}>{t('admin.users')}</button>
      </div>
      {tab === 'usage' ? <UsagePanel /> : <UsersPanel />}
    </>
  )
}

function UsagePanel() {
  const [days, setDays] = useState(30)
  const [u, setU] = useState<Usage | null>(null)
  const [err, setErr] = useState('')
  useEffect(() => { setU(null); api('/api/admin/usage?days=' + days).then(setU).catch((e) => setErr(e.message)) }, [days])
  if (err) return <div className="empty">{err}</div>
  if (!u) return <div className="empty">…</div>
  const maxDay = Math.max(1e-9, ...u.by_day.map((d) => d.cost))
  return (
    <div className="admin">
      <div className="chips">{[7, 30, 90].map((d) => <button key={d} className={'chip' + (days === d ? ' on' : '')} onClick={() => setDays(d)}>{d} {t('admin.days')}</button>)}</div>
      <div className="kpis">
        <div className="kpi"><span>{t('admin.today')}</span><b>{fmt$(u.today_cost)}</b></div>
        <div className="kpi"><span>{t('admin.week')}</span><b>{fmt$(u.week_cost)}</b></div>
        <div className="kpi"><span>{u.days} {t('admin.days')}</span><b>{fmt$(u.total.cost)}</b></div>
        <div className="kpi"><span>{t('admin.calls')}</span><b>{u.total.calls}</b></div>
        <div className="kpi"><span>{t('admin.tokens')}</span><b>{fmtK(u.total.input + u.total.output)}</b><small>in {fmtK(u.total.input)} · out {fmtK(u.total.output)} · cached {fmtK(u.total.cached)}</small></div>
      </div>
      <h3 className="admin-h">{t('admin.byday')}</h3>
      <div className="bars">{u.by_day.map((d) => <div key={d.key} className="bar-col" title={`${d.key}: ${fmt$(d.cost)} · ${d.calls} calls`}><div className="bar-fill-v" style={{ height: (d.cost / maxDay) * 100 + '%' }} /><span>{d.key.slice(5)}</span></div>)}</div>
      <div className="admin-grid">
        <div>
          <h3 className="admin-h">{t('admin.byuser')}</h3>
          <table className="admin-table"><thead><tr><th>{t('admin.user')}</th><th>{t('admin.calls')}</th><th>{t('admin.tokens')}</th><th>{t('admin.cost')}</th></tr></thead>
            <tbody>{u.by_user.map((r) => <tr key={r.key}><td>{r.key}</td><td>{r.calls}</td><td>{fmtK(r.input + r.output)}</td><td>{fmt$(r.cost)}</td></tr>)}</tbody></table>
        </div>
        <div>
          <h3 className="admin-h">{t('admin.bymodel')}</h3>
          <table className="admin-table"><thead><tr><th>{t('admin.model')}</th><th>{t('admin.calls')}</th><th>{t('admin.tokens')}</th><th>{t('admin.cost')}</th></tr></thead>
            <tbody>{u.by_model.map((r) => <tr key={r.key}><td>{r.key}</td><td>{r.calls}</td><td>{fmtK(r.input + r.output)}</td><td>{fmt$(r.cost)}</td></tr>)}</tbody></table>
        </div>
      </div>
      <h3 className="admin-h">{t('admin.recent')}</h3>
      <table className="admin-table small"><thead><tr><th>{t('admin.time')}</th><th>{t('admin.user')}</th><th>{t('admin.model')}</th><th>in</th><th>out</th><th>tools</th><th>{t('admin.cost')}</th></tr></thead>
        <tbody>{u.recent.map((r, i) => <tr key={i}><td>{String(r.ts).slice(0, 16).replace('T', ' ')}</td><td>{String(r.email ?? r.user_id ?? '—')}</td><td>{String(r.model)}</td><td>{String(r.input_tokens)}</td><td>{String(r.output_tokens)}</td><td>{String(r.tool_calls ?? 0)}</td><td>{fmt$(Number(r.cost_usd))}</td></tr>)}</tbody></table>
    </div>
  )
}

function UsersPanel() {
  const [users, setUsers] = useState<User[] | null>(null)
  const [err, setErr] = useState('')
  const [email, setEmail] = useState(''); const [pw, setPw] = useState(''); const [role, setRole] = useState('user'); const [busy, setBusy] = useState(false)
  const load = () => api('/api/admin/users').then((j) => setUsers(j.users)).catch((e) => setErr(e.message))
  useEffect(() => { load() }, [])
  const create = async (e: React.FormEvent) => { e.preventDefault(); setBusy(true); setErr(''); try { await api('/api/admin/users', { method: 'POST', body: JSON.stringify({ email, password: pw, role }) }); setEmail(''); setPw(''); await load() } catch (x) { setErr((x as Error).message) } finally { setBusy(false) } }
  const patch = async (user_id: string, p: Record<string, unknown>) => { setErr(''); try { await api('/api/admin/users', { method: 'PATCH', body: JSON.stringify({ user_id, ...p }) }); await load() } catch (x) { setErr((x as Error).message) } }
  if (err && !users) return <div className="empty">{err}</div>
  return (
    <div className="admin">
      <form className="admin-add" onSubmit={create}>
        <input type="email" required placeholder={t('login.email')} value={email} onChange={(e) => setEmail(e.target.value)} />
        <input type="password" required minLength={6} placeholder={t('login.password')} value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" />
        <select value={role} onChange={(e) => setRole(e.target.value)}><option value="user">user</option><option value="admin">admin</option></select>
        <button className="chip primary" disabled={busy}>{t('admin.add')}</button>
        {err && <span className="login-err">{err}</span>}
      </form>
      {!users ? <div className="empty">…</div> : (
        <table className="admin-table"><thead><tr><th>{t('admin.user')}</th><th>{t('admin.role')}</th><th>{t('admin.created')}</th><th>{t('admin.lastseen')}</th><th>30d</th><th>{t('admin.status')}</th><th></th></tr></thead>
          <tbody>{users.map((x) => (
            <tr key={x.id} className={x.disabled ? 'off' : ''}>
              <td>{x.email}{x.display_name ? <span className="muted small"> · {x.display_name}</span> : null}</td>
              <td><span className={'badge ' + (x.role === 'admin' ? 'doing' : '')}>{x.role}</span></td>
              <td>{x.created_at.slice(0, 10)}</td><td>{x.last_sign_in_at ? x.last_sign_in_at.slice(0, 16).replace('T', ' ') : '—'}</td>
              <td>{fmt$(x.usage30.cost)} · {x.usage30.calls}</td>
              <td>{x.disabled ? t('admin.disabled') : t('admin.active')}</td>
              <td className="chips">
                <button className="chip small" onClick={() => patch(x.id, { disabled: !x.disabled })}>{x.disabled ? t('admin.enable') : t('admin.disable')}</button>
                <button className="chip small" onClick={() => patch(x.id, { role: x.role === 'admin' ? 'user' : 'admin' })}>{x.role === 'admin' ? t('admin.demote') : t('admin.promote')}</button>
              </td>
            </tr>
          ))}</tbody></table>
      )}
    </div>
  )
}
