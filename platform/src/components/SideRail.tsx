import { useEffect, useRef, useState } from 'react'
import { Icon } from './Icon'
import { href } from '../router'
import { t } from '../i18n'
import { deleteSession, listSessions, renameSession, type SessionMeta } from '../workshop/agent'
import { store } from '../workshop/storage'

// 开发模式左栏的下半截：项目 + 最近对话。
//
// 之前这里是一个平铺的十二条列表，顶着「PROJECTS」的标签，但列的其实是**对话**——
// 名不副实，而且看不出这是个能装很多活的工作台。现在分两段：
//   项目：agent 真正落盘的那些（brief / bom / plan），点进项目页
//   最近：对话，按天分组，可以改名、可以删
// 两者的关系在数据里本来就有：SessionMeta.slug 指向它所属的项目。

type Proj = { slug: string; title: string }

function dayBucket(ts: number): string {
  const d = (x: number) => { const v = new Date(x); return new Date(v.getFullYear(), v.getMonth(), v.getDate()).getTime() }
  const diff = (d(Date.now()) - d(ts)) / 86400000
  return diff < 1 ? 'rail.today' : diff < 2 ? 'rail.yesterday' : diff < 7 ? 'rail.week' : 'rail.older'
}

function group(list: SessionMeta[]): [string, SessionMeta[]][] {
  const out: Record<string, SessionMeta[]> = {}
  for (const s of list) (out[dayBucket(s.updated)] ||= []).push(s)
  // 固定顺序，不靠对象键的插入顺序
  return (['rail.today', 'rail.yesterday', 'rail.week', 'rail.older'] as const)
    .filter((k) => out[k]?.length).map((k) => [k, out[k]])
}

function Row({ s, on, onChanged }: { s: SessionMeta; on: boolean; onChanged: () => void }) {
  const [menu, setMenu] = useState(false)
  const [edit, setEdit] = useState(false)
  const [name, setName] = useState(s.title)
  const [arm, setArm] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => { setName(s.title) }, [s.title])
  // 点到别处就收起菜单：不加这个，菜单会一直挂在那儿挡住下面几条
  useEffect(() => {
    if (!menu) return
    const off = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) { setMenu(false); setArm(false) } }
    document.addEventListener('mousedown', off)
    return () => document.removeEventListener('mousedown', off)
  }, [menu])

  const save = () => { setEdit(false); if (name.trim() && name !== s.title) { renameSession(s.id, name); onChanged() } }
  if (edit) return (
    // 进来就全选：改名十次有九次是整条重写，不是在原名后面接字
    <input className="rail-edit" autoFocus onFocus={(e) => e.target.select()} value={name} onChange={(e) => setName(e.target.value)} onBlur={save}
      onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setName(s.title); setEdit(false) } }} />
  )
  return (
    <div className={'rail-row' + (on ? ' on' : '') + (menu ? ' menu' : '')} ref={box}>
      <a href={href('/make?p=' + s.id)} title={s.title}><Icon name="chat" size={13} /><span>{s.title || t('ws.newproject')}</span></a>
      <button className="rail-more" onClick={() => setMenu((v) => !v)} aria-label="⋯">⋯</button>
      {menu && (
        <div className="rail-menu">
          <button onClick={() => { setMenu(false); setEdit(true) }}>{t('rail.rename')}</button>
          <button className="danger" onClick={() => { if (!arm) return setArm(true); deleteSession(s.id); setMenu(false); onChanged() }}>
            {arm ? t('rail.confirm') : t('rail.delete')}
          </button>
        </div>
      )}
    </div>
  )
}

export function SideRail({ route }: { route: string }) {
  const [list, setList] = useState(listSessions)
  const [projects, setProjects] = useState<Proj[]>([])
  const reload = () => setList(listSessions())
  useEffect(() => {
    const f = () => setList(listSessions())
    window.addEventListener('storage', f)
    const id = setInterval(f, 2000)
    return () => { window.removeEventListener('storage', f); clearInterval(id) }
  }, [])
  useEffect(() => {
    let alive = true
    store.get<Record<string, { title: string }>>('projects')
      .then((ps) => { if (alive) setProjects(Object.entries(ps ?? {}).map(([slug, p]) => ({ slug, title: p.title }))) })
      .catch(() => { /* 读不到就不显示这一段，不要把侧栏整段弄崩 */ })
    return () => { alive = false }
  }, [route])

  const cur = route.match(/[?&]p=([^&]+)/)?.[1]
  const inProjects = route.startsWith('/projects')
  if (!list.length && !projects.length) return null

  return (
    <div className="rail-sections">
      {projects.length > 0 && (
        <div className="rail-sec">
          <div className="rail-label">{t('rail.projects')}<span className="rail-count">{projects.length}</span></div>
          {projects.slice(0, 8).map((p) => (
            <a key={p.slug} className={'rail-proj' + (inProjects ? ' on' : '')} href={href('/projects')} title={p.title}>
              <span className="rail-proj-ico">{(p.title || p.slug).slice(0, 1).toUpperCase()}</span>
              <span>{p.title || p.slug}</span>
            </a>
          ))}
        </div>
      )}
      {group(list).map(([k, ss]) => (
        <div className="rail-sec" key={k}>
          <div className="rail-label">{t(k)}</div>
          {ss.map((s) => <Row key={s.id} s={s} on={cur === s.id} onChanged={reload} />)}
        </div>
      ))}
    </div>
  )
}
