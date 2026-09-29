import { useMemo, useState } from 'react'
import { Markdown } from '../Markdown'
import { Scene } from './Scene'
import { PartImg } from '../canvases/parts/PartImg'

// 知识库浏览页：项目食谱 / 术语表 / 排障 / 代码片段 / 板子。数据与 AI 用的是同一份 JSON。
import { getJson } from '../content'
type AnyRec = Record<string, unknown>
const kb = 'knowledge/', boards = 'hardware/boards/'
const pick = (dir: string, name: string) => getJson<AnyRec>(dir + name) ?? undefined

const TABS = [
  { id: 'projects', label: '项目食谱', desc: '想做点什么？从这里挑。每个都有零件、接线、步骤和代码骨架。' },
  { id: 'glossary', label: '术语表', desc: '每个词一个比喻、一句准确定义、一个常见误解。' },
  { id: 'troubleshooting', label: '排障', desc: '不工作的时候翻这里：症状 → 原因 → 一分钟验证。' },
  { id: 'snippets', label: '代码片段', desc: '可编译的最小程序，逐段解释。' },
  { id: 'boards', label: '板子', desc: '手里不是蓝药丸？看看你的板子。' },
]

export function Knowledge() {
  const [tab, setTab] = useState('projects')
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const match = (s: string) => !q.trim() || s.toLowerCase().includes(q.trim().toLowerCase())
  const meta = TABS.find((t) => t.id === tab)!
  return (
    <>
      <Scene name="prompts_ai" className="hero small">
        <div className="eyebrow">// KNOWLEDGE</div>
        <h1>知识库</h1>
        <p>AI 用的就是这几份资料。一次编好，很多年不用改。你也可以直接翻。</p>
      </Scene>
      <div className="lab-tabs">{TABS.map((t) => <button key={t.id} className={'chip' + (tab === t.id ? ' on' : '')} onClick={() => { setTab(t.id); setOpen(null) }}>{t.label}</button>)}</div>
      <div className="kb-search"><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={'搜索' + meta.label + '…'} /><span className="muted small">{meta.desc}</span></div>
      {tab === 'projects' && <Projects q={match} open={open} setOpen={setOpen} />}
      {tab === 'glossary' && <Glossary q={match} open={open} setOpen={setOpen} />}
      {tab === 'troubleshooting' && <Trouble q={match} open={open} setOpen={setOpen} />}
      {tab === 'snippets' && <Snippets q={match} open={open} setOpen={setOpen} />}
      {tab === 'boards' && <Boards />}
    </>
  )
}

type P = { q: (s: string) => boolean; open: string | null; setOpen: (s: string | null) => void }
const Empty = ({ what }: { what: string }) => <div className="empty">{what}还没生成。跑一遍知识库汇编就会出现。</div>

function Projects({ q, open, setOpen }: P) {
  const j = pick(kb, 'projects.json') as { projects?: AnyRec[] } | undefined
  if (!j?.projects) return <Empty what="项目食谱" />
  const list = j.projects.filter((p) => q([p.title, p.tagline, (p.concepts as string[]).join(' ')].join(' ')))
  return (
    <div className="kb-list">
      {list.map((p) => {
        const id = String(p.id), on = open === id
        return (
          <div key={id} className={'kb-item' + (on ? ' on' : '')}>
            <button className="kb-head" onClick={() => setOpen(on ? null : id)}>
              <span className="kb-diff">{'●'.repeat(Number(p.difficulty))}{'○'.repeat(5 - Number(p.difficulty))}</span>
              <b>{String(p.title)}</b>
              <span className="muted">{String(p.tagline)}</span>
              <span className="kb-meta">{String(p.time)}{p.hardware_free ? ' · 可先虚拟' : ''}</span>
            </button>
            {on && (
              <div className="kb-body">
                <div className="kb-parts">{(p.parts as AnyRec[]).map((x, i) => <span key={i} className="kb-part">{x.id ? <PartImg name={String(x.id)} /> : null}<span>{String(x.name)} ×{String(x.qty)}<em>{String(x.role)}</em></span></span>)}</div>
                <h4>接线</h4>
                <ul>{(p.wiring as AnyRec[]).map((w, i) => <li key={i}><code>{String(w.from)}</code> → <code>{String(w.to)}</code>{w.note ? <span className="muted"> {String(w.note)}</span> : null}</li>)}</ul>
                <h4>步骤</h4>
                <ol>{(p.steps as string[]).map((s, i) => <li key={i}>{s}</li>)}</ol>
                <h4>会踩的坑</h4>
                <ul>{(p.pitfalls as string[]).map((s, i) => <li key={i}>{s}</li>)}</ul>
                <h4>代码骨架</h4>
                <Markdown text={'```cpp\n' + String(p.code_skeleton) + '\n```'} />
                <div className="chips"><a className="chip ai" href={'#/make?q=' + encodeURIComponent('我想做：' + String(p.title))}>✦ 让 AI 带我做这个</a>{(p.concepts as string[]).map((c) => <span key={c} className="chip">{c}</span>)}</div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function Glossary({ q, open, setOpen }: P) {
  const j = pick(kb, 'glossary.json') as { terms?: AnyRec[] } | undefined
  if (!j?.terms) return <Empty what="术语表" />
  const cats = useMemo(() => [...new Set(j.terms!.map((t) => String(t.category)))], [j])
  return (
    <div className="kb-glossary">
      {cats.map((c) => {
        const terms = j.terms!.filter((t) => t.category === c && q([t.term, t.definition, t.metaphor].join(' ')))
        if (!terms.length) return null
        return (
          <section key={c}>
            <h3>{c}</h3>
            <div className="kb-terms">
              {terms.map((t) => {
                const id = String(t.id), on = open === id
                return (
                  <div key={id} className={'kb-term' + (on ? ' on' : '')} onClick={() => setOpen(on ? null : id)}>
                    <b>{String(t.term)}</b>
                    <p className="kb-metaphor">{String(t.metaphor)}</p>
                    {on && <div className="kb-term-more"><p><span className="lbl">定义</span>{String(t.definition)}</p><p><span className="lbl">误解</span>{String(t.misconception)}</p><p><span className="lbl">例子</span>{String(t.example)}</p></div>}
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}

function Trouble({ q, open, setOpen }: P) {
  const j = pick(kb, 'troubleshooting.json') as { entries?: AnyRec[] } | undefined
  if (!j?.entries) return <Empty what="排障库" />
  const list = j.entries.filter((e) => q([e.stage, e.symptom, (e.signals as string[]).join(' ')].join(' ')))
  return (
    <div className="kb-list">
      {list.map((e) => {
        const id = String(e.id), on = open === id
        return (
          <div key={id} className={'kb-item' + (on ? ' on' : '')}>
            <button className="kb-head" onClick={() => setOpen(on ? null : id)}><span className="tag">{String(e.stage)}</span><b>{String(e.symptom)}</b><span className="muted small">{(e.signals as string[]).slice(0, 3).join(' / ')}</span></button>
            {on && (
              <div className="kb-body">
                <ol className="kb-causes">{(e.causes as AnyRec[]).map((c, i) => <li key={i}><b>{String(c.cause)}</b> <span className={'prob p-' + String(c.probability)}>{String(c.probability)}</span><div className="muted">验证：{String(c.check)}</div><div>解决：{String(c.fix)}</div></li>)}</ol>
                <p className="muted">原理：{String(e.explain)}</p>
                <div className="chips"><a className="chip ai" href={'#/make?q=' + encodeURIComponent(String(e.ask_ai))}>✦ 问 AI：{String(e.ask_ai).slice(0, 30)}…</a></div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function Snippets({ q, open, setOpen }: P) {
  const j = pick(kb, 'snippets.json') as { snippets?: AnyRec[] } | undefined
  if (!j?.snippets) return <Empty what="代码片段" />
  const list = j.snippets.filter((s) => q([s.topic, s.title, s.when].join(' ')))
  return (
    <div className="kb-list">
      {list.map((s) => {
        const id = String(s.id), on = open === id
        return (
          <div key={id} className={'kb-item' + (on ? ' on' : '')}>
            <button className="kb-head" onClick={() => setOpen(on ? null : id)}><span className="tag">{String(s.topic)}</span><b>{String(s.title)}</b><span className="muted">{String(s.when)}</span></button>
            {on && <div className="kb-body"><Markdown text={'```cpp\n' + String(s.code) + '\n```\n' + String(s.explain) + '\n\n' + (s.pitfalls as string[]).map((x) => '- ⚠ ' + x).join('\n')} /></div>}
          </div>
        )
      })}
    </div>
  )
}

function Boards() {
  const idx = pick(boards, 'index.json') as { boards?: AnyRec[] } | undefined
  if (!idx?.boards) return <Empty what="板子档案" />
  return (
    <div className="cards">
      {idx.boards.map((b) => {
        const full = pick(boards, `${b.id}.json`) as AnyRec | undefined
        return (
          <div key={String(b.id)} className="card">
            <div className="card-top"><span className="badge">{String(b.level)}</span><span className="meta">¥{String(b.price)}</span></div>
            <h3>{String(b.name)}</h3>
            <p>{String(b.mcu)} · {String(b.why)}</p>
            {full && <p className="muted small">板载 LED {String((full.led as AnyRec)?.pin)} · {String(full.flash_how).slice(0, 60)}…</p>}
          </div>
        )
      })}
    </div>
  )
}
