import { useEffect, useState } from 'react'
import { CLOSED, signOut, useSession } from './auth'
import { Login } from './components/Login'
import { initContent } from './content'
import { byPath, hardware, journal, modules, prompts, type Doc, type Mission } from './content'
import { Markdown } from './Markdown'
import { href, useHashRoute } from './router'
import { StatusBar } from './components/StatusBar'
import { Boot } from './components/Boot'
import { Canvas, CANVAS_META, DEFAULT_CODE } from './canvases'
import { Scene } from './components/Scene'
import { Workshop } from './workshop/Workshop'
import { Knowledge } from './components/Knowledge'

const NAV = [
  { path: '/make', key: '00', label: '直接做', hint: 'MAKE' },
  { path: '/', key: '01', label: '学习路径', hint: 'PATH' },
  { path: '/lab', key: '02', label: '实验台', hint: 'LAB' },
  { path: '/kb', key: '03', label: '知识库', hint: 'KB' },
  { path: '/journal', key: '04', label: '学习日志', hint: 'LOG' },
  { path: '/prompts', key: '05', label: '提示词库', hint: 'PROMPTS' },
  { path: '/hardware', key: '06', label: '我的硬件', hint: 'HW' },
  { path: '/about', key: '07', label: '关于平台', hint: 'ABOUT' },
]
const STATUS_LABEL: Record<Mission['status'], string> = { todo: 'TODO', doing: 'DOING', done: 'DONE' }

export default function App() {
  const { session, ready } = useSession()
  const [loaded, setLoaded] = useState(false)
  const [loadErr, setLoadErr] = useState('')
  const authed = !CLOSED || !!session
  useEffect(() => { if (ready && authed && !loaded) initContent().then(() => setLoaded(true)).catch((e) => setLoadErr(String(e.message ?? e))) }, [ready, authed, loaded])
  if (!ready) return <div className="boot"><pre>[    0.000] checking session…</pre></div>
  if (CLOSED && !session) return <Login />
  if (loadErr) return <div className="boot"><pre style={{ color: 'var(--red)' }}>{loadErr}</pre></div>
  if (!loaded) return <div className="boot"><pre>[    0.012] loading content…<span className="caret">▮</span></pre></div>
  return <Shell email={session?.user.email ?? null} />
}

function Shell({ email }: { email: string | null }) {
  const route = useHashRoute()
  const [booted, setBooted] = useState(() => { try { return sessionStorage.getItem('booted') === '1' } catch { return true } })
  const all = modules.flatMap((m) => m.missions)
  const done = all.filter((m) => m.status === 'done').length
  if (!booted) return <Boot onDone={() => { try { sessionStorage.setItem('booted', '1') } catch { /* */ } setBooted(true) }} />
  return (
    <div className="shell">
      <div className="blobs"><i className="b1" /><i className="b2" /><i className="b3" /></div>
      <StatusBar done={done} total={all.length} />
      <div className="layout">
        <aside className="sidebar">
          <a className="brand" href={href('/')}>
            <span className="brand-led" />
            <span className="brand-name">vibedding<em>_</em></span>
            <small>Embedding your world with AI</small>
          </a>
          <nav>
            {NAV.map((n) => (
              <a key={n.path} href={href(n.path)} className={isActive(route, n.path) ? 'active' : ''}>
                <span className="key">{n.key}</span>{n.label}<span className="hint">{n.hint}</span>
              </a>
            ))}
          </nav>
          <div className="memmap">
            <div className="memmap-label"><span>PROGRESS</span><span>{done}/{all.length}</span></div>
            <div className="memmap-cells">{all.map((m) => <i key={m.path} className={m.status} title={m.fm.title} />)}</div>
          </div>
          <div className="sidebar-foot">
            <span>{modules.length} modules · {all.length} missions</span>
            {email ? <span className="sidebar-user">{email} <button className="linkbtn" onClick={() => signOut()}>退出</button></span> : <span>local · no cloud</span>}
          </div>
        </aside>
        <main className="content"><Page route={route} /></main>
      </div>
    </div>
  )
}

function isActive(route: string, path: string) {
  if (path === '/') return route === '/' || route.startsWith('/doc/curriculum')
  const kind = path.slice(1)
  return route.startsWith(path) || route.startsWith('/doc/' + kind)
}

function Page({ route }: { route: string }) {
  if (route === '/') return <Curriculum />
  if (route.startsWith('/make')) return <Workshop />
  if (route === '/kb') return <Knowledge />
  if (route === '/lab') return <Lab />
  if (route === '/journal') return <Journal />
  if (route === '/prompts') return <List title="提示词库" subtitle="怎么向 AI 问硬件问题，才能少踩坑。每张卡都是踩过坑后总结的。" items={prompts} art="prompts_ai" />
  if (route === '/hardware') return <List title="我的硬件" subtitle="板子、模块、线怎么接。只记录亲手验证过的东西，不抄手册。" items={hardware} art="mod0_setup" />
  if (route === '/about') return <About />
  if (route.startsWith('/doc/')) return <DocPage path={route.slice('/doc/'.length)} />
  return <Empty title="404 · 页面不存在" />
}

function Curriculum() {
  return (
    <>
      <Scene name="hero_home" className="hero">
        <div className="eyebrow">// LEARNING PATH</div>
        <h1>学习路径</h1>
        <p className="mission">把门槛拆掉，让人专注宝贵的部分：实现自己的一个思路，对一件事大胆尝试，在一个原本无法掌握的领域做出点价值。</p>
        <p>每个任务都以"做出一个看得见的东西"结束。顺序是建议，不是规定。卡住了就写日志，然后问 AI。</p>
        <div className="chips hero-cta">
          <a className="chip primary" href={href('/make?q=' + encodeURIComponent('要有光'))}>▶ 没有板子也能玩：说一句"要有光"</a>
          <a className="chip" href={href('/kb')}>翻翻知识库</a>
          <a className="chip" href={href('/doc/curriculum/00-setup/00-terminal.md')}>我有板子，从头开始</a>
        </div>
      </Scene>
      {modules.map((m, mi) => (
        <section key={m.dir} className="module">
          <a className="module-head" href={m.index ? href('/doc/' + m.index.path) : undefined}>
            <Scene name={m.index?.fm.art ?? 'mod' + mi} className="module-art">
              <span className="module-idx">0x{mi.toString(16).padStart(2, '0')}</span>
            </Scene>
            <div className="module-text">
              <h2>{m.title}</h2>
              {m.index?.fm.summary && <p>{m.index.fm.summary}</p>}
              <div className="module-stats">{m.missions.filter((x) => x.status === 'done').length}/{m.missions.length} 完成 · {m.missions.filter((x) => /```canvas/.test(x.body)).length} 个实验</div>
            </div>
          </a>
          <div className="cards">
            {m.missions.map((ms) => (
              <a key={ms.path} href={href('/doc/' + ms.path)} className={'card status-' + ms.status}>
                <div className="card-top">
                  <span className={'badge ' + ms.status}><i />{STATUS_LABEL[ms.status]}</span>
                  {ms.fm.time && <span className="meta">{ms.fm.time}</span>}
                </div>
                <h3>{ms.fm.title ?? ms.slug}</h3>
                {ms.fm.goal && <p>{ms.fm.goal}</p>}
                <div className="card-foot">
                  {ms.fm.hardware && <span className="meta">⌁ {ms.fm.hardware}</span>}
                  {/```canvas/.test(ms.body) && <span className="meta tag-canvas">▣ 有实验</span>}
                </div>
              </a>
            ))}
            {m.missions.length === 0 && <div className="card ghost">还没有任务。写一个 md 文件放进 content/{m.dir}/ 就会出现在这里。</div>}
          </div>
        </section>
      ))}
    </>
  )
}

const LAB_PROPS: Record<string, Record<string, string>> = {
  board: { id: 'lab-board', goals: 'pinmode:PC13, blink:PC13:500, serial:hello', task: '让板载 LED 每 500ms 翻转一次，并在串口打印 hello' },
  wiring: { title: '按键 + 上拉（示例）', left: 'bluepill', right: 'button, led_red, resistor_220', wires: 'bluepill.PA0 > button.脚1 #ffb454; bluepill.GND > button.脚2 #8b93a7; bluepill.PA1 > resistor_220.一端 #39c5ff; resistor_220.另一端 > led_red.长脚(+) #ff5c5c "先过电阻"; led_red.短脚(-) > bluepill.GND #8b93a7', note: '示例：按键接 PA0 和 GND，LED 经 220Ω 接 PA1。真接线前先在引脚图核对。' },
}

function Lab() {
  const [open, setOpen] = useState<string>('board')
  const types = Object.keys(CANVAS_META)
  return (
    <>
      <Scene name="lab_bench" className="hero small">
        <div className="eyebrow">// LAB</div>
        <h1>实验台</h1>
        <p>板子没到也能动手。这里的每个实验都可以嵌进任何一张任务卡（写一个 <code>```canvas</code> 代码块）。</p>
      </Scene>
      <div className="lab-tabs">
        {types.map((t) => <button key={t} className={'chip' + (open === t ? ' on' : '')} onClick={() => setOpen(t)}>{CANVAS_META[t].name}</button>)}
      </div>
      <p className="muted">{CANVAS_META[open].desc}</p>
      <Canvas key={open} spec={{ type: open, props: LAB_PROPS[open] ?? { id: 'lab-' + open }, body: open === 'board' ? DEFAULT_CODE : '' }} />
      <div className="lab-howto">
        <h3>怎么在任务卡里嵌一个实验</h3>
        <pre className="howto">{'```canvas\ntype: board\nid: my-blink\ngoals: pinmode:PC13, blink:PC13:200\ntask: 让 LED 每 200ms 眨一次\nrubric: 用了 pinMode；周期约 200ms\n---\n// 这里是初始代码（可省略）\n```'}</pre>
      </div>
    </>
  )
}

function Journal() {
  return (
    <>
      <Scene name="journal_night" className="hero small">
        <div className="eyebrow">// LOG</div>
        <h1>学习日志</h1>
        <p>按天记。记"我以为 / 实际发生 / 学到了什么"，比记代码更有用。这些日志以后会被提炼成课程。</p>
      </Scene>
      <div className="timeline">
        {journal.map((d) => (
          <a key={d.path} href={href('/doc/' + d.path)} className="entry">
            <time>{d.fm.date ?? d.slug}</time>
            <div>
              <h3>{d.fm.title ?? d.slug}</h3>
              {d.fm.summary && <p>{d.fm.summary}</p>}
            </div>
            {d.fm.mood && <span className="mood">{d.fm.mood}</span>}
          </a>
        ))}
        {journal.length === 0 && <Empty title="还没有日志" />}
      </div>
    </>
  )
}

function List({ title, subtitle, items, art }: { title: string; subtitle: string; items: Doc[]; art: string }) {
  return (
    <>
      <Scene name={art} className="hero small">
        <div className="eyebrow">// {title}</div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </Scene>
      <div className="cards">
        {items.map((d) => (
          <a key={d.path} href={href('/doc/' + d.path)} className="card">
            <h3>{d.fm.title ?? d.slug}</h3>
            {d.fm.summary && <p>{d.fm.summary}</p>}
          </a>
        ))}
        {items.length === 0 && <Empty title="空空如也" />}
      </div>
    </>
  )
}

function DocPage({ path }: { path: string }) {
  const doc = byPath(path)
  if (!doc) return <Empty title="找不到这篇文档" />
  const backTo = doc.kind === 'curriculum' ? '/' : '/' + doc.kind
  const mod = modules.find((m) => m.dir === doc.dir)
  const art = doc.fm.art ?? mod?.index?.fm.art ?? (doc.kind === 'journal' ? 'journal_night' : doc.kind === 'prompts' ? 'prompts_ai' : doc.kind === 'hardware' ? 'mod0_setup' : 'hero_home')
  return (
    <>
      <a className="back" href={href(backTo)}>← 返回</a>
      <Scene name={art} className="doc-art" />
      <header className="page-head doc-head">
        <div className="eyebrow">// {doc.path}</div>
        <h1>{doc.fm.status && <span className={'badge ' + doc.fm.status}><i />{STATUS_LABEL[doc.fm.status as Mission['status']] ?? doc.fm.status}</span>}{doc.fm.title ?? doc.slug}</h1>
        <div className="meta-row">
          {doc.fm.goal && <span>🎯 {doc.fm.goal}</span>}
          {doc.fm.hardware && <span>⌁ {doc.fm.hardware}</span>}
          {doc.fm.time && <span>⏱ {doc.fm.time}</span>}
          {doc.fm.date && <span>📅 {doc.fm.date}</span>}
        </div>
      </header>
      <Markdown text={doc.body} />
      {doc.kind === 'curriculum' && doc.slug !== 'index' && (
        <div className="doc-foot">
          <p className="muted">不想自己写？<a className="chip ai" href={href('/make')}>✦ 让 AI 来做：{doc.fm.goal ?? doc.fm.title}</a></p>
          <p className="muted">做完了？把 <code>content/{doc.path}</code> 里的 <code>status</code> 改成 <code>done</code>，然后写一篇日志。或者直接跟 AI 说"这个任务完成了"。</p>
        </div>
      )}
    </>
  )
}

function About() {
  return (
    <>
      <header className="page-head">
        <div className="eyebrow">// ABOUT</div>
        <h1>关于平台</h1>
        <p className="mission">把门槛拆掉，让人专注宝贵的部分：实现自己的一个思路，对一件事大胆尝试，在一个原本无法掌握的领域做出点价值。</p>
      </header>
      <Markdown text={ABOUT} />
    </>
  )
}
const ABOUT = `
## 这是什么
一个人、一块 STM32、一个 AI。边学边把过程铺成路，让下一个门外汉能照着走。

## 三层内容
| 层 | 是什么 | 在哪 |
|---|---|---|
| 日志 | 原始、按天、有情绪、有弯路 | \`content/journal/\` |
| 任务卡 | 结构化、有验收、有常见坑、可嵌实验 | \`content/curriculum/\` |
| 提示词 & 硬件笔记 | 跨任务的方法论和亲测事实 | \`content/prompts/\` \`content/hardware/\` |

## 门槛在哪
| 层 | 平台的应对 |
|---|---|
| 环境 | 一键脚本 + 体检脚本，看到全绿 |
| 终端 | 只教 8 条，每条命令能复制 |
| git | 只教 5 条，讲成"存档点" |
| 链路 | 模块 0 走一遍代码→芯片的整条路 |
| 报错 | 报错求助模板 |
| 不知道下一步 | 任务卡 + 学习路径 |
| AI 能不能信 | \`prompts/04-ai-lies.md\` 持续积累 |

## 全部本地
内容是 markdown，平台是本地网页，固件用 PlatformIO 编译。没有账号，没有云。\`git\` 就是你的存档。

设计文档在项目的 \`docs/\` 目录。
`

function Empty({ title }: { title: string }) { return <div className="empty">{title}</div> }
