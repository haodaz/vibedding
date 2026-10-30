import { useEffect, useState } from 'react'
import { Icon } from './Icon'
import { href } from '../router'
import { t } from '../i18n'
import { getJson, modules, type Mission } from '../content'
import { listSessions, type SessionMeta } from '../workshop/agent'
import { store } from '../workshop/storage'
import { allParts } from '../parts'

// 工作台的家。
//
// 以前 #/make 的空态是一个「新对话」的空态：招呼语 + 输入框 + 四张起步卡。
// 问题是它只认识「现在这一轮」——你手上有几个项目、上次做到哪、下一个任务是什么，
// 一概看不见。于是产品读起来像一个聊天框，不像一个工作台。
//
// 这一页把它们摆在同一屏：中间是能直接开工的输入框，下面是你的项目、最近的活、
// 下一个任务。Build 和 Learn 不再是两个要先选的模式——都从这里触发。
//
// 新用户什么都没有，所以空的时候退回起步卡：先让人有东西可点。

export interface Proj { slug: string; title: string; brief?: string }
type InvItem = { id?: string; name: string; qty?: number; note?: string }

/** 一个项目当前对应哪一轮对话：取它最近更新的那一轮；没有就开新的并预先绑定 slug。 */
export function projectHref(slug: string, sessions: SessionMeta[]): string {
  const mine = sessions.filter((s) => s.slug === slug).sort((a, b) => b.updated - a.updated)[0]
  return href(mine ? `/make?p=${mine.id}` : `/make?p=p_${Date.now().toString(36)}&slug=${encodeURIComponent(slug)}`)
}

function ago(ts: number): string {
  const d = Math.floor((Date.now() - ts) / 86400000)
  return d < 1 ? t('proj.today') : `${d} ${t('proj.daysago')}`
}

function firstLine(md?: string): string {
  if (!md) return ''
  const line = md.replace(/^---[\s\S]*?---/, '').split('\n').map((l) => l.trim()).find((l) => l && !l.startsWith('#') && !l.startsWith('|'))
  return (line ?? '').replace(/[*_`>]/g, '').slice(0, 90)
}

export function WorkspaceHome({ onPick, onHasWork }: { onPick: (text: string) => void; onHasWork?: (v: boolean) => void }) {
  const [projects, setProjects] = useState<Proj[]>([])
  const [sessions, setSessions] = useState<SessionMeta[]>(listSessions)
  const [inv, setInv] = useState<InvItem[]>([])
  useEffect(() => {
    let on = true
    store.get<Record<string, { title: string; brief?: string }>>('projects')
      .then((ps) => { if (on) setProjects(Object.entries(ps ?? {}).map(([slug, p]) => ({ slug, title: p.title, brief: p.brief }))) })
      .catch(() => { /* 读不到就只显示对话那一段，不要让整页塌掉 */ })
    // 库存是聊出来的：AI 听到「我有 XX」就 update_inventory。这是最属于用户自己的一摞东西。
    store.get<InvItem[]>('inventory').then((v) => { if (on) setInv(v ?? []) }).catch(() => { /* 空着就空着 */ })
    const f = () => setSessions(listSessions())
    window.addEventListener('storage', f)
    return () => { on = false; window.removeEventListener('storage', f) }
  }, [])

  // 下一个任务：第一个没做完的。学习不是另一个模式，是同一张桌子上的另一摞纸。
  const kb = {
    recipes: (getJson<{ projects?: unknown[] }>('knowledge/projects.json')?.projects ?? []).length,
    terms: (getJson<{ terms?: unknown[] }>('knowledge/glossary.json')?.terms ?? []).length,
    trouble: (getJson<{ entries?: unknown[] }>('knowledge/troubleshooting.json')?.entries ?? []).length,
    snippets: (getJson<{ snippets?: unknown[] }>('knowledge/snippets.json')?.snippets ?? []).length,
  }
  const parts = allParts().length
  // 三张卡的行结构必须一样（名称 + 一个数），不然并排看就是乱的
  const next: Mission | undefined = modules.flatMap((m) => m.missions).find((x) => x.status !== 'done')
  const empty = !projects.length && !sessions.length
  useEffect(() => { onHasWork?.(!empty) }, [empty, onHasWork])

  if (empty) return null   // 什么都没有时交给起步卡，别摆一排空壳

  return (
    <div className="wh">
      <section className="wh-sec">
        <div className="wh-label">{t('wh.overview')}</div>
        <div className="wh-grid">
          <div className="wh-stat">
            <div className="wh-stat-hd"><span className="wh-card-ico"><Icon name="folder" size={14} /></span>{t('wh.projects')}<a href={href('/projects')}>{t('wh.all')} ↗</a></div>
            <b>{projects.length}</b><em>{t('wh.projects.unit')}</em>
            <ul>{projects.slice(0, 3).map((p) => <li key={p.slug}><a href={projectHref(p.slug, sessions)}>{p.title || p.slug}</a></li>)}
              {!projects.length && <li className="wh-none">{t('wh.none')}</li>}</ul>
          </div>
          <div className="wh-stat">
            <div className="wh-stat-hd"><span className="wh-card-ico"><Icon name="library" size={14} /></span>{t('wh.kb')}<a href={href('/kb')}>{t('wh.all')} ↗</a></div>
            <b>{kb.recipes}</b><em>{t('wh.kb.unit')}</em>
            <ul><li>{t('wh.kb.terms')}<span>{kb.terms}</span></li><li>{t('wh.kb.trouble')}<span>{kb.trouble}</span></li><li>{t('wh.parts')}<span>{parts}</span></li></ul>
          </div>
          <div className="wh-stat">
            <div className="wh-stat-hd"><span className="wh-card-ico"><Icon name="cpu" size={14} /></span>{t('wh.inv')}<a href={href('/hardware')}>{t('wh.all')} ↗</a></div>
            <b>{inv.length}</b><em>{t('wh.inv.unit')}</em>
            <ul>
              {inv.slice(0, 3).map((x, i) => <li key={x.id ?? i}>{x.name}<span>×{x.qty ?? 1}</span></li>)}
              {!inv.length && <li className="wh-none">{t('wh.inv.none')}</li>}
            </ul>
          </div>
        </div>
      </section>

      {next && (
        <section className="wh-sec">
          <div className="wh-label">{t('wh.learn')}</div>
          <div className="wh-learn">
            <a className="wh-next" href={href('/doc/' + next.path)}>
              <span className="wh-next-k">{t('wh.next')}</span>
              <b>{next.fm.title ?? next.slug}</b>
              {next.fm.goal && <p>{String(next.fm.goal).slice(0, 120)}</p>}
            </a>
            {/* 学不学、做不做，不用先选模式——直接把它说给 AI 听 */}
            <button className="wh-ask" onClick={() => onPick(String(next.fm.title ?? next.slug) + ' — ' + t('wh.ask.text'))}>
              <Icon name="bolt" size={14} /> {t('wh.ask')}
            </button>
          </div>
        </section>
      )}
      <section className="wh-sec">
        <div className="wh-label">{t('wh.try')}</div>
        <ul className="wh-sug">
          {([['wh.sug1.v', 'wh.sug1.r'], ['wh.sug2.v', 'wh.sug2.r'], ['wh.sug3.v', 'wh.sug3.r']] as const).map(([v, r]) => (
            <li key={v}><button onClick={() => onPick(t(v) + ' ' + t(r))}><em>{t(v)}</em> {t(r)}</button></li>
          ))}
        </ul>
      </section>
    </div>
  )
}
