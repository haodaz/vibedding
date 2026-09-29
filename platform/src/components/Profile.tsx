import { useEffect, useState } from 'react'
import { supabase, getUserId, getToken } from '../auth'
import { store } from '../workshop/storage'
import { modules } from '../content'
import { listSessions } from '../workshop/agent'
import { t } from '../i18n'
import { Icon } from './Icon'

// 用户名片：头像（首字母或自选图案）、名字、一句话介绍、在平台多少天、学习进度、项目数、活动热力块。
export interface ProfileData { display_name: string; bio: string; avatar: string; created_at: string }
const LOCAL_KEY = 'vb:profile'
const AVATARS = ['bolt', 'cpu', 'chip', 'flame', 'sparkle', 'bulb', 'wrench', 'puzzle']

async function loadProfile(email: string | null): Promise<ProfileData> {
  const local = (() => { try { return JSON.parse(localStorage.getItem(LOCAL_KEY) ?? 'null') } catch { return null } })()
  const base: ProfileData = { display_name: local?.display_name ?? (email ? email.split('@')[0] : 'local'), bio: local?.bio ?? '', avatar: local?.avatar ?? 'bolt', created_at: local?.created_at ?? new Date().toISOString() }
  if (!local) try { localStorage.setItem(LOCAL_KEY, JSON.stringify(base)) } catch { /* */ }
  const id = await getUserId()
  if (!id || !supabase) return base
  const { data } = await supabase.from('profiles').select('display_name,bio,avatar,created_at').eq('user_id', id).maybeSingle()
  return data ? { display_name: data.display_name || base.display_name, bio: data.bio ?? '', avatar: data.avatar || 'bolt', created_at: data.created_at ?? base.created_at } : base
}
async function saveProfile(p: Partial<ProfileData>) {
  try { const cur = JSON.parse(localStorage.getItem(LOCAL_KEY) ?? '{}'); localStorage.setItem(LOCAL_KEY, JSON.stringify({ ...cur, ...p })) } catch { /* */ }
  const id = await getUserId()
  if (id && supabase) await supabase.from('profiles').update({ display_name: p.display_name, bio: p.bio, avatar: p.avatar }).eq('user_id', id)
}
// 活动：最近 12 周每天的调用次数
async function loadActivity(): Promise<Record<string, number>> {
  const id = await getUserId()
  const since = new Date(Date.now() - 84 * 864e5).toISOString()
  const out: Record<string, number> = {}
  if (id && supabase) {
    const { data } = await supabase.from('usage_log').select('ts').eq('user_id', id).gte('ts', since).limit(5000)
    for (const r of data ?? []) { const d = String(r.ts).slice(0, 10); out[d] = (out[d] ?? 0) + 1 }
    return out
  }
  try {
    const tk = await getToken()
    const r = await fetch('/api/admin/usage?days=84', { headers: tk ? { authorization: 'Bearer ' + tk } : {} }); const j = await r.json()
    for (const d of j.by_day ?? []) out[d.key] = d.calls
  } catch { /* */ }
  return out
}

export function ProfileCard({ email, collapsed }: { email: string | null; collapsed: boolean }) {
  const [p, setP] = useState<ProfileData | null>(null)
  const [act, setAct] = useState<Record<string, number>>({})
  const [edit, setEdit] = useState(false)
  useEffect(() => { loadProfile(email).then(setP); loadActivity().then(setAct) }, [email])
  if (!p) return null
  const days = Math.max(1, Math.floor((Date.now() - new Date(p.created_at).getTime()) / 864e5) + 1)
  const all = modules.flatMap((m) => m.missions); const done = all.filter((m) => m.status === 'done').length
  const projects = listSessions().length
  const weeks = 12
  const cells: { d: string; n: number }[] = []
  const start = new Date(); start.setDate(start.getDate() - weeks * 7 + 1)
  for (let i = 0; i < weeks * 7; i++) { const d = new Date(start.getTime() + i * 864e5).toISOString().slice(0, 10); cells.push({ d, n: act[d] ?? 0 }) }
  const max = Math.max(1, ...cells.map((c) => c.n))
  if (collapsed) return <button className="profile-mini" title={p.display_name} onClick={() => setEdit(true)}><span className="avatar"><Icon name={p.avatar} size={16} /></span>{edit && <ProfileEdit p={p} onClose={(np) => { setEdit(false); if (np) setP(np) }} />}</button>
  return (
    <div className="profile">
      <button className="profile-head" onClick={() => setEdit(true)}>
        <span className="avatar"><Icon name={p.avatar} size={20} /></span>
        <span className="profile-name"><b>{p.display_name}</b><small>{p.bio || t('profile.nobio')}</small></span>
      </button>
      <div className="profile-stats">
        <span><b>{days}</b>{t('profile.days')}</span>
        <span><b>{done}/{all.length}</b>{t('profile.missions')}</span>
        <span><b>{projects}</b>{t('profile.projects')}</span>
      </div>
      <div className="heat" title={t('profile.activity')}>{cells.map((c) => <i key={c.d} className={'h' + (c.n === 0 ? 0 : Math.min(4, Math.ceil((c.n / max) * 4)))} title={`${c.d}: ${c.n}`} />)}</div>
      {edit && <ProfileEdit p={p} onClose={(np) => { setEdit(false); if (np) setP(np) }} />}
    </div>
  )
}

function ProfileEdit({ p, onClose }: { p: ProfileData; onClose: (np: ProfileData | null) => void }) {
  const [name, setName] = useState(p.display_name); const [bio, setBio] = useState(p.bio); const [avatar, setAvatar] = useState(p.avatar); const [busy, setBusy] = useState(false)
  return (
    <div className="intro-mask" onClick={() => onClose(null)}>
      <div className="intro-card profile-edit" onClick={(e) => e.stopPropagation()}>
        <div className="avatar-pick">{AVATARS.map((a) => <button key={a} className={'avatar' + (avatar === a ? ' on' : '')} onClick={() => setAvatar(a)}><Icon name={a} size={20} /></button>)}</div>
        <div>
          <h2>{t('profile.edit')}</h2>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('profile.name')} maxLength={30} />
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder={t('profile.bio')} maxLength={120} rows={2} />
          <div className="chips"><button className="chip primary" disabled={busy} onClick={async () => { setBusy(true); await saveProfile({ display_name: name.trim() || p.display_name, bio: bio.trim(), avatar }); onClose({ ...p, display_name: name.trim() || p.display_name, bio: bio.trim(), avatar }) }}>{t('ws.save')}</button><button className="chip" onClick={() => onClose(null)}>{t('ws.collapse')}</button></div>
        </div>
      </div>
    </div>
  )
}
