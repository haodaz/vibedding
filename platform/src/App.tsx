import { byPath, hardware, journal, modules, prompts, type Doc, type Mission } from './content'
import { Markdown } from './Markdown'
import { href, useHashRoute } from './router'

const NAV = [
  { path: '/', label: '学习路径', icon: '🧭' },
  { path: '/journal', label: '学习日志', icon: '📓' },
  { path: '/prompts', label: '提示词库', icon: '🪄' },
  { path: '/hardware', label: '我的硬件', icon: '🔌' },
  { path: '/about', label: '关于平台', icon: '💡' },
]

const STATUS_LABEL: Record<Mission['status'], string> = { todo: '未开始', doing: '进行中', done: '已完成' }

export default function App() {
  const route = useHashRoute()
  return (
    <div className="layout">
      <aside className="sidebar">
        <a className="brand" href={href('/')}>
          <span className="brand-dot" />
          Embeded
          <small>门外汉 × AI 的嵌入式自学平台</small>
        </a>
        <nav>
          {NAV.map((n) => (
            <a key={n.path} href={href(n.path)} className={isActive(route, n.path) ? 'active' : ''}>
              <span className="icon">{n.icon}</span>
              {n.label}
            </a>
          ))}
        </nav>
        <Progress />
      </aside>
      <main className="content">
        <Page route={route} />
      </main>
    </div>
  )
}

function isActive(route: string, path: string) {
  if (path === '/') return route === '/' || route.startsWith('/doc/curriculum')
  return route.startsWith(path) || (path === '/journal' && route.startsWith('/doc/journal')) ||
    (path === '/prompts' && route.startsWith('/doc/prompts')) || (path === '/hardware' && route.startsWith('/doc/hardware'))
}

function Progress() {
  const all = modules.flatMap((m) => m.missions)
  const done = all.filter((m) => m.status === 'done').length
  const pct = all.length ? Math.round((done / all.length) * 100) : 0
  return (
    <div className="progress">
      <div className="progress-label">
        <span>总进度</span>
        <span>{done} / {all.length}</span>
      </div>
      <div className="bar"><div className="bar-fill" style={{ width: pct + '%' }} /></div>
    </div>
  )
}

function Page({ route }: { route: string }) {
  if (route === '/') return <Curriculum />
  if (route === '/journal') return <Journal />
  if (route === '/prompts') return <List title="提示词库" subtitle="怎么向 AI 问硬件问题，才能少踩坑。每张卡都是踩过坑后总结的。" items={prompts} />
  if (route === '/hardware') return <List title="我的硬件" subtitle="板子、模块、线怎么接。只记录亲手验证过的东西，不抄手册。" items={hardware} />
  if (route === '/about') return <DocPage path="../README.md" fallback={<About />} />
  if (route.startsWith('/doc/')) return <DocPage path={route.slice('/doc/'.length)} />
  return <Empty title="页面不存在" />
}

function Curriculum() {
  return (
    <>
      <header className="page-head">
        <h1>学习路径</h1>
        <p className="mission">把门槛拆掉，让人专注宝贵的部分：实现自己的一个思路，对一件事大胆尝试，在一个原本无法掌握的领域做出点价值。</p>
        <p>每个任务都以"做出一个看得见的东西"结束。顺序是建议，不是规定。卡住了就写日志，然后问 AI。</p>
      </header>
      {modules.map((m) => (
        <section key={m.dir} className="module">
          <div className="module-head">
            <h2>
              {m.index ? <a href={href('/doc/' + m.index.path)}>{m.title}</a> : m.title}
            </h2>
            {m.index?.fm.summary && <p>{m.index.fm.summary}</p>}
          </div>
          <div className="cards">
            {m.missions.map((ms) => (
              <a key={ms.path} href={href('/doc/' + ms.path)} className={'card status-' + ms.status}>
                <div className="card-top">
                  <span className={'badge ' + ms.status}>{STATUS_LABEL[ms.status]}</span>
                  {ms.fm.time && <span className="meta">⏱ {ms.fm.time}</span>}
                </div>
                <h3>{ms.fm.title ?? ms.slug}</h3>
                {ms.fm.goal && <p>{ms.fm.goal}</p>}
                {ms.fm.hardware && <div className="meta">🔩 {ms.fm.hardware}</div>}
              </a>
            ))}
            {m.missions.length === 0 && <div className="card ghost">还没有任务。写一个 md 文件放进 content/{m.dir}/ 就会出现在这里。</div>}
          </div>
        </section>
      ))}
    </>
  )
}

function Journal() {
  return (
    <>
      <header className="page-head">
        <h1>学习日志</h1>
        <p>按天记。记"我以为 / 实际发生 / 学到了什么"，比记代码更有用。这些日志以后会被提炼成课程。</p>
      </header>
      <div className="timeline">
        {journal.map((d) => (
          <a key={d.path} href={href('/doc/' + d.path)} className="entry">
            <time>{d.fm.date ?? d.slug}</time>
            <div>
              <h3>{d.fm.title ?? d.slug}</h3>
              {d.fm.mood && <span className="meta">{d.fm.mood}</span>}
              {d.fm.summary && <p>{d.fm.summary}</p>}
            </div>
          </a>
        ))}
        {journal.length === 0 && <Empty title="还没有日志" />}
      </div>
    </>
  )
}

function List({ title, subtitle, items }: { title: string; subtitle: string; items: Doc[] }) {
  return (
    <>
      <header className="page-head">
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </header>
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

function DocPage({ path, fallback }: { path: string; fallback?: React.ReactNode }) {
  const doc = byPath(path)
  if (!doc) return fallback ?? <Empty title="找不到这篇文档" />
  const backTo = doc.kind === 'curriculum' ? '/' : '/' + doc.kind
  return (
    <>
      <a className="back" href={href(backTo)}>← 返回</a>
      <header className="page-head doc-head">
        {doc.fm.status && <span className={'badge ' + doc.fm.status}>{STATUS_LABEL[doc.fm.status as Mission['status']] ?? doc.fm.status}</span>}
        <h1>{doc.fm.title ?? doc.slug}</h1>
        <div className="meta-row">
          {doc.fm.goal && <span>🎯 {doc.fm.goal}</span>}
          {doc.fm.hardware && <span>🔩 {doc.fm.hardware}</span>}
          {doc.fm.time && <span>⏱ {doc.fm.time}</span>}
          {doc.fm.date && <span>📅 {doc.fm.date}</span>}
        </div>
        <code className="path">content/{doc.path}</code>
      </header>
      <Markdown text={doc.body} />
    </>
  )
}

function About() {
  return (
    <>
      <header className="page-head"><h1>关于平台</h1></header>
      <p>见项目根目录的 docs/ 文件夹。</p>
    </>
  )
}

function Empty({ title }: { title: string }) {
  return <div className="empty">{title}</div>
}
