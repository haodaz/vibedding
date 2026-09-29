import { useEffect, useState } from 'react'
import { Scene } from './Scene'
import { detectMode } from '../workshop/mode'
import { store } from '../workshop/storage'
import { t } from '../i18n'
import { href } from '../router'
import { listSessions, newSessionId, deleteSession, type SessionMeta } from '../workshop/agent'
import { NpcImage } from './Scene'

// 项目页：开发模式的项目管理。本地模式读 content/projects/，其他模式读用户存储。
type Proj = { slug: string; title: string; brief?: string; bom?: string; plan?: string }

async function loadProjects(): Promise<Proj[]> {
  const m = await detectMode()
  if (m.mode === 'local') {
    const call = (name: string, input: unknown) => fetch('/api/tool', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name, input }) }).then((r) => r.json()).then((j) => String(j.result ?? ''))
    const list = (await call('list_projects', {})).split('\n').filter((l) => l.includes(':') && !l.startsWith('还没有'))
    const out: Proj[] = []
    for (const l of list) {
      const slug = l.split(':')[0].trim(); const title = l.split(':').slice(1).join(':').split('·')[0].trim()
      const txt = await call('read_project', { slug })
      const sec = (k: string) => { const m2 = txt.match(new RegExp(`## ${k}\\.md\\n([\\s\\S]*?)(?=\\n## \\w+\\.md\\n|$)`)); return m2?.[1]?.replace(/^---[\s\S]*?---\n/, '').trim() }
      out.push({ slug, title, brief: sec('brief'), bom: sec('bom'), plan: sec('plan') })
    }
    return out
  }
  const ps = (await store.get<Record<string, Proj>>('projects')) ?? {}
  return Object.entries(ps).map(([slug, p]) => ({ ...p, slug }))
}

export function Projects() {
  const [list, setList] = useState<Proj[] | null>(null)
  const [sessions, setSessions] = useState<SessionMeta[]>(listSessions)
  useEffect(() => { loadProjects().then(setList).catch(() => setList([])) }, [])
  const progress = (p: Proj) => { const plan = p.plan ?? ''; const d = (plan.match(/- \[x\]/gi) ?? []).length, n = (plan.match(/- \[[ x]\]/gi) ?? []).length; return n ? `${d}/${n}` : '' }
  const bySlug = (slug?: string) => (slug ? list?.find((p) => p.slug === slug) : undefined)
  const orphan = (list ?? []).filter((p) => !sessions.some((s) => s.slug === p.slug))
  const ago = (ts: number) => { const d = Math.floor((Date.now() - ts) / 864e5); return d === 0 ? t('proj.today') : `${d} ${t('proj.daysago')}` }
  const remove = (id: string) => { deleteSession(id); setSessions(listSessions()) }
  return (
    <>
      <div className="proj-head">
        <div><div className="eyebrow">// PROJECTS</div><h1>{t('nav.projects')}</h1><p className="muted">{t('mode.build.desc')}</p></div>
        <a className="chip primary big" href={href('/make?p=' + newSessionId())}>＋ {t('proj.new')}</a>
      </div>
      <div className="proj-cards">
        {sessions.map((s) => {
          const p = bySlug(s.slug)
          return (
            <a key={s.id} className="proj-card" href={href('/make?p=' + s.id)}>
              <div className="proj-card-top"><span className="badge doing"><i />{p ? progress(p) || 'PROJECT' : 'DRAFT'}</span><span className="meta">{ago(s.updated)}</span></div>
              <h3>{p?.title ?? s.title ?? t('ws.newproject')}</h3>
              {p?.brief && <p>{p.brief.replace(/[#*>`]/g, '').slice(0, 90)}…</p>}
              {!p && <p className="muted">{s.steps} {t('proj.steps')}</p>}
              <button className="proj-del" onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (window.confirm(t('proj.delete') + '?')) remove(s.id) }}>×</button>
            </a>
          )
        })}
        {orphan.map((p) => (
          <a key={p.slug} className="proj-card" href={href('/make?p=' + newSessionId() + '&q=' + encodeURIComponent(t('ws.suggest.5') + ': ' + p.title))}>
            <div className="proj-card-top"><span className="badge"><i />{progress(p) || 'SAVED'}</span><span className="meta">{p.slug}</span></div>
            <h3>{p.title}</h3>
            {p.brief && <p>{p.brief.replace(/[#*>`]/g, '').slice(0, 90)}…</p>}
          </a>
        ))}
        {sessions.length === 0 && orphan.length === 0 && (
          <div className="proj-empty"><div className="ws-empty-npc"><NpcImage name="mentor_idle" /></div><div><p>{t('proj.empty')}</p><a className="chip primary" href={href('/make?p=' + newSessionId() + '&q=' + encodeURIComponent(t('ws.suggest.1')))}>{t('path.cta.play')}</a></div></div>
        )}
      </div>
    </>
  )
}
