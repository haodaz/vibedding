import { useEffect, useState } from 'react'
import { CLOSED, signOut, useSession } from './auth'
import { Login } from './components/Login'
import { initContent, byPath, hardware, journal, modules, prompts, type Doc, type Mission } from './content'
import { Markdown } from './Markdown'
import { href, useHashRoute } from './router'
import { StatusBar } from './components/StatusBar'
import { Boot } from './components/Boot'
import { Canvas, CANVAS_META, DEFAULT_CODE } from './canvases'
import { Scene } from './components/Scene'
import { Workshop } from './workshop/Workshop'
import { Knowledge } from './components/Knowledge'
import { Projects } from './components/Projects'
import { Admin } from './components/Admin'
import { getToken } from './auth'
import { getLang, setLang, t, useLang, type Lang } from './i18n'

// 两种模式：开发（直接做 + 项目 + 硬件 + 知识库）/ 学习（路径 + 实验台 + 知识库 + 日志 + 提示词）
type Mode = 'build' | 'learn'
const MODE_KEY = 'vb:mode'
const getMode = (): Mode | null => { try { const v = localStorage.getItem(MODE_KEY); return v === 'build' || v === 'learn' ? v : null } catch { return null } }
const NAV: Record<Mode, { path: string; key: string; label: string; hint: string }[]> = {
  build: [
    { path: '/make', key: '01', label: 'nav.make', hint: 'BUILD' },
    { path: '/projects', key: '02', label: 'nav.projects', hint: 'PROJECTS' },
    { path: '/hardware', key: '03', label: 'nav.hardware', hint: 'HW' },
    { path: '/kb', key: '04', label: 'nav.kb', hint: 'KB' },
  ],
  learn: [
    { path: '/path', key: '01', label: 'nav.path', hint: 'PATH' },
    { path: '/lab', key: '02', label: 'nav.lab', hint: 'LAB' },
    { path: '/kb', key: '03', label: 'nav.kb', hint: 'KB' },
    { path: '/journal', key: '04', label: 'nav.journal', hint: 'LOG' },
    { path: '/prompts', key: '05', label: 'nav.prompts', hint: 'PROMPTS' },
    { path: '/about', key: '06', label: 'nav.about', hint: 'ABOUT' },
  ],
}
const STATUS_LABEL: Record<Mission['status'], string> = { todo: 'TODO', doing: 'DOING', done: 'DONE' }

export default function App() {
  const { session, ready } = useSession()
  const lang = useLang()
  const [loadedLang, setLoadedLang] = useState<Lang | ''>('')
  const [loadErr, setLoadErr] = useState('')
  const authed = !CLOSED || !!session
  useEffect(() => { if (ready && authed && loadedLang !== lang) initContent(lang).then(() => setLoadedLang(lang)).catch((e) => setLoadErr(String(e.message ?? e))) }, [ready, authed, lang, loadedLang])
  if (!ready) return <div className="boot"><pre>[    0.000] checking session…</pre></div>
  if (CLOSED && !session) return <Login />
  if (loadErr) return <div className="boot"><pre style={{ color: 'var(--red)' }}>{loadErr}</pre></div>
  if (loadedLang !== lang) return <div className="boot"><pre>[    0.012] loading content…<span className="caret">▮</span></pre></div>
  return <Shell email={session?.user.email ?? null} lang={lang} />
}

function Shell({ email, lang }: { email: string | null; lang: Lang }) {
  const route = useHashRoute()
  const [isAdmin, setIsAdmin] = useState(false)
  useEffect(() => { (async () => { try { const tk = await getToken(); const r = await fetch('/api/admin/me', { headers: tk ? { authorization: 'Bearer ' + tk } : {} }); const j = await r.json(); setIsAdmin(j.role === 'admin') } catch { /* */ } })() }, [email])
  const [mode, setModeState] = useState<Mode | null>(getMode)
  const setMode = (m: Mode) => { try { localStorage.setItem(MODE_KEY, m) } catch { /* */ } setModeState(m) }
  const [booted, setBooted] = useState(() => { try { return sessionStorage.getItem('booted') === '1' } catch { return true } })
  const all = modules.flatMap((m) => m.missions)
  const done = all.filter((m) => m.status === 'done').length
  if (!booted) return <Boot onDone={() => { try { sessionStorage.setItem('booted', '1') } catch { /* */ } setBooted(true) }} />
  // 路由推断模式：直接打开 /make 就是开发模式
  const routeMode: Mode | null = route.startsWith('/make') || route.startsWith('/projects') || route.startsWith('/admin') ? 'build' : route.startsWith('/path') || route.startsWith('/lab') || route.startsWith('/journal') || route.startsWith('/prompts') || route.startsWith('/doc/') ? 'learn' : null
  const m: Mode | null = routeMode ?? mode
  if (route === '/' ) return <ModePicker onPick={(x) => { setMode(x); location.hash = x === 'build' ? '/make' : '/path' }} />
  if (!m) return <ModePicker onPick={(x) => { setMode(x); location.hash = x === 'build' ? '/make' : '/path' }} />
  if (routeMode && routeMode !== mode) setMode(routeMode)
  const isBuild = m === 'build'
  return (
    <div className="shell">
      <div className="blobs"><i className="b1" /><i className="b2" /><i className="b3" /></div>
      <StatusBar done={done} total={all.length} />
      <div className={'layout' + (isBuild && route.startsWith('/make') ? ' wide' : '')}>
        <aside className="sidebar">
          <a className="brand" href={href('/')}>
            <span className="brand-led" />
            <span className="brand-name">vibedding<em>_</em></span>
            <small>{t('tagline')}</small>
          </a>
          <div className="modeswitch">
            <a href={href('/make')} className={isBuild ? 'on' : ''} onClick={() => setMode('build')}>⚡ {t('mode.build')}</a>
            <a href={href('/path')} className={!isBuild ? 'on' : ''} onClick={() => setMode('learn')}>📖 {t('mode.learn')}</a>
          </div>
          <nav>
            {NAV[m].map((n) => (
              <a key={n.path} href={href(n.path)} className={isActive(route, n.path) ? 'active' : ''}>
                <span className="key">{n.key}</span>{t(n.label)}<span className="hint">{n.hint}</span>
              </a>
            ))}
            {isAdmin && <a href={href('/admin')} className={route.startsWith('/admin') ? 'active' : ''}><span className="key">⚙</span>{t('nav.admin')}<span className="hint">ADMIN</span></a>}
          </nav>
          {!isBuild && (
            <div className="memmap">
              <div className="memmap-label"><span>{t('progress').toUpperCase()}</span><span>{done}/{all.length}</span></div>
              <div className="memmap-cells">{all.map((x) => <i key={x.path} className={x.status} title={x.fm.title} />)}</div>
            </div>
          )}
          <div className="sidebar-foot">
            <span className="langswitch"><button className={lang === 'zh' ? 'on' : ''} onClick={() => setLang('zh')}>中文</button><button className={lang === 'en' ? 'on' : ''} onClick={() => setLang('en')}>EN</button></span>
            {email ? <span className="sidebar-user">{email} <button className="linkbtn" onClick={() => signOut()}>{t('logout')}</button></span> : <span>local · no cloud</span>}
          </div>
        </aside>
        <main className="content"><Page route={route} /></main>
      </div>
    </div>
  )
}

function ModePicker({ onPick }: { onPick: (m: Mode) => void }) {
  const lang = getLang()
  return (
    <div className="picker">
      <div className="blobs"><i className="b1" /><i className="b2" /><i className="b3" /></div>
      <div className="picker-body">
        <div className="brand-name" style={{ fontSize: 34 }}>vibedding<em>_</em></div>
        <p className="tagline">{t('tagline')}</p>
        <h1>{t('mode.pick')}</h1>
        <div className="picker-cards">
          <button className="picker-card" onClick={() => onPick('build')}>
            <Scene name="hero_home" className="picker-art" />
            <div className="picker-text"><b>⚡ {t('mode.build')}</b><p>{t('mode.build.desc')}</p></div>
          </button>
          <button className="picker-card" onClick={() => onPick('learn')}>
            <Scene name="mod1_blink" className="picker-art" />
            <div className="picker-text"><b>📖 {t('mode.learn')}</b><p>{t('mode.learn.desc')}</p></div>
          </button>
        </div>
        <div className="langswitch big"><button className={lang === 'zh' ? 'on' : ''} onClick={() => setLang('zh')}>中文</button><button className={lang === 'en' ? 'on' : ''} onClick={() => setLang('en')}>English</button></div>
      </div>
    </div>
  )
}

function isActive(route: string, path: string) {
  if (path === '/path') return route === '/path' || route.startsWith('/doc/curriculum')
  const kind = path.slice(1)
  return route.startsWith(path) || route.startsWith('/doc/' + kind)
}

function Page({ route }: { route: string }) {
  if (route === '/path') return <Curriculum />
  if (route.startsWith('/make')) return <Workshop />
  if (route === '/projects') return <Projects />
  if (route === '/admin') return <Admin />
  if (route === '/lab') return <Lab />
  if (route === '/kb') return <Knowledge />
  if (route === '/journal') return <Journal />
  if (route === '/prompts') return <List title={t('prompts.title')} subtitle={t('prompts.sub')} items={prompts} art="prompts_ai" />
  if (route === '/hardware') return <List title={t('hw.title')} subtitle={t('hw.sub')} items={hardware} art="mod0_setup" />
  if (route === '/about') return <About />
  if (route.startsWith('/doc/')) return <DocPage path={route.slice('/doc/'.length)} />
  return <Empty title={t('empty.404')} />
}

function Curriculum() {
  return (
    <>
      <Scene name="hero_home" className="hero">
        <div className="eyebrow">// LEARNING PATH</div>
        <h1>{t('path.title')}</h1>
        <p className="mission">{t('path.mission')}</p>
        <p>{t('path.sub')}</p>
        <div className="chips hero-cta">
          <a className="chip primary" href={href('/make?q=' + encodeURIComponent(t('ws.suggest.1')))}>{t('path.cta.play')}</a>
          <a className="chip" href={href('/kb')}>{t('path.cta.kb')}</a>
          <a className="chip" href={href('/doc/curriculum/00-setup/00-terminal.md')}>{t('path.cta.start')}</a>
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
              <div className="module-stats">{m.missions.filter((x) => x.status === 'done').length}/{m.missions.length} {t('path.done')} · {m.missions.filter((x) => /```canvas/.test(x.body)).length} {t('path.labs')}</div>
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
                  {/```canvas/.test(ms.body) && <span className="meta tag-canvas">{t('path.hasLab')}</span>}
                </div>
              </a>
            ))}
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
        <h1>{t('lab.title')}</h1>
        <p>{t('lab.sub')}</p>
      </Scene>
      <div className="lab-tabs">
        {types.map((x) => <button key={x} className={'chip' + (open === x ? ' on' : '')} onClick={() => setOpen(x)}>{CANVAS_META[x].name}</button>)}
      </div>
      <p className="muted">{CANVAS_META[open].desc}</p>
      <Canvas key={open} spec={{ type: open, props: LAB_PROPS[open] ?? { id: 'lab-' + open }, body: open === 'board' ? DEFAULT_CODE : '' }} />
    </>
  )
}

function Journal() {
  return (
    <>
      <Scene name="journal_night" className="hero small">
        <div className="eyebrow">// LOG</div>
        <h1>{t('journal.title')}</h1>
        <p>{t('journal.sub')}</p>
      </Scene>
      <div className="timeline">
        {journal.map((d) => (
          <a key={d.path} href={href('/doc/' + d.path)} className="entry">
            <time>{d.fm.date ?? d.slug}</time>
            <div><h3>{d.fm.title ?? d.slug}</h3>{d.fm.summary && <p>{d.fm.summary}</p>}</div>
            {d.fm.mood && <span className="mood">{d.fm.mood}</span>}
          </a>
        ))}
        {journal.length === 0 && <Empty title="—" />}
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
        {items.length === 0 && <Empty title="—" />}
      </div>
    </>
  )
}

function DocPage({ path }: { path: string }) {
  const doc = byPath(path)
  if (!doc) return <Empty title={t('empty.404')} />
  const backTo = doc.kind === 'curriculum' ? '/path' : '/' + doc.kind
  const mod = modules.find((m) => m.dir === doc.dir)
  const art = doc.fm.art ?? mod?.index?.fm.art ?? (doc.kind === 'journal' ? 'journal_night' : doc.kind === 'prompts' ? 'prompts_ai' : doc.kind === 'hardware' ? 'mod0_setup' : 'hero_home')
  return (
    <>
      <a className="back" href={href(backTo)}>{t('doc.back')}</a>
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
          <p className="muted"><a className="chip ai" href={href('/make?q=' + encodeURIComponent(doc.fm.goal ?? doc.fm.title ?? ''))}>{t('doc.ai')}{doc.fm.goal ?? doc.fm.title}</a></p>
          <p className="muted">{t('doc.done')}</p>
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
        <h1>{t('about.title')}</h1>
        <p className="mission">{t('path.mission')}</p>
      </header>
      <Markdown text={getLang() === 'en' ? ABOUT_EN : ABOUT} />
    </>
  )
}
const ABOUT = `
## 这是什么
一个人、一块 STM32、一个 AI。边学边把过程铺成路，让下一个门外汉能照着走。

## 两种模式
| 模式 | 给谁 | 有什么 |
|---|---|---|
| 开发 | 想直接做出东西的人 | 说一句话，AI 出方案、采购清单、写代码、跑、烧；项目和零件都在这里管 |
| 学习 | 想弄明白的人 | 任务卡、实验台、知识库、日志。一步一步自己动手 |

## 门槛在哪
环境、终端、git、链路、报错、不知道下一步、不知道 AI 能不能信。平台的工作是把这些墙拆成台阶。

## 本事攒在资料里
AI 用的是六份知识库：元件、项目食谱、代码片段、排障、术语表、板子档案。一次编好，很多年不用改。
`
const ABOUT_EN = `
## What this is
One person, one STM32, one AI. Learn by building, and pave the road so the next beginner can follow.

## Two modes
| Mode | For | What you get |
|---|---|---|
| Build | People who want a working thing | Say what you want; the AI plans, makes the shopping list, writes code, runs and flashes. Projects and parts live here |
| Learn | People who want to understand | Missions, lab bench, knowledge base, journal. Step by step, hands on |

## Where the barriers are
Environment, terminal, git, the toolchain, error messages, not knowing the next step, not knowing whether to trust the AI. This platform turns those walls into steps.

## The skill lives in the data
The AI reads six knowledge bases: parts, project recipes, code snippets, troubleshooting, glossary, board profiles. Written once, good for years.
`

function Empty({ title }: { title: string }) { return <div className="empty">{title}</div> }
