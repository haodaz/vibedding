import { useEffect, useState } from 'react'
import { Markdown } from '../Markdown'
import { Scene } from './Scene'
import { detectMode } from '../workshop/mode'
import { store } from '../workshop/storage'
import { t } from '../i18n'
import { href } from '../router'

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
  const [open, setOpen] = useState<string | null>(null)
  useEffect(() => { loadProjects().then(setList).catch(() => setList([])) }, [])
  const cur = list?.find((p) => p.slug === open) ?? null
  const progress = (p: Proj) => { const plan = p.plan ?? ''; const d = (plan.match(/- \[x\]/gi) ?? []).length, n = (plan.match(/- \[[ x]\]/gi) ?? []).length; return n ? `${d}/${n}` : '' }
  return (
    <>
      <Scene name="mod6_capstone" className="hero small">
        <div className="eyebrow">// PROJECTS</div>
        <h1>{t('nav.projects')}</h1>
        <p>{t('mode.build.desc')}</p>
      </Scene>
      {list === null && <div className="empty">…</div>}
      {list && list.length === 0 && <div className="empty">{t('ws.projects.none')} <a className="chip ai" href={href('/make')}>{t('nav.make')} →</a></div>}
      {list && list.length > 0 && (
        <div className="proj-layout">
          <div className="proj-list">
            {list.map((p) => (
              <button key={p.slug} className={'kb-item proj-item' + (open === p.slug ? ' on' : '')} onClick={() => setOpen(p.slug)}>
                <b>{p.title}</b><span className="muted small">{p.slug}</span><span className="kb-meta">{progress(p)}</span>
              </button>
            ))}
          </div>
          <div className="proj-detail">
            {!cur && <div className="empty">←</div>}
            {cur && (
              <>
                <h2>{cur.title}</h2>
                <div className="chips"><a className="chip ai" href={href('/make?q=' + encodeURIComponent((t('ws.suggest.5')) + ': ' + cur.title))}>✦ {t('nav.make')}</a></div>
                {cur.plan && <><h4 className="proj-h">PLAN</h4><Markdown text={cur.plan} /></>}
                {cur.bom && <><h4 className="proj-h">BOM</h4><Markdown text={cur.bom} /></>}
                {cur.brief && <><h4 className="proj-h">BRIEF</h4><Markdown text={cur.brief} /></>}
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
