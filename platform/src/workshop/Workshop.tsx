import { useEffect, useRef, useState } from 'react'
import { Agent, type Item, type HumanAsk } from './agent'
import { HumanCard } from './HumanCard'
import { BomCard } from './BomCard'
import { BoardSvg, type PinState } from '../canvases/board/BoardSvg'
import { Markdown } from '../Markdown'
import { NpcImage } from '../components/Scene'
import type { SimLive } from './sim'
import { detectMode, type ModeInfo } from './mode'
import { store } from './storage'
import { t, getLang, useLang } from '../i18n'
import { PartImg } from '../canvases/parts/PartImg'
import { partByName } from '../canvases/parts/catalog'
import { Wiring, parseWires } from '../canvases/parts/Wiring'

const TOOL_LABEL: Record<string, [string, string]> = {
  search_projects: ['查项目食谱', 'search recipes'], search_troubleshooting: ['查排障库', 'search troubleshooting'], explain_concept: ['查术语表', 'glossary'], get_snippet: ['取代码片段', 'get snippet'], list_boards: ['看板子列表', 'list boards'], read_board_profile: ['读板子档案', 'board profile'], part_detail: ['查元件档案', 'part detail'],
  search_parts: ['查元件库', 'search parts'], add_part: ['收录元件', 'add part'], read_inventory: ['看库存', 'read inventory'], update_inventory: ['更新库存', 'update inventory'], save_project: ['保存项目', 'save project'], list_projects: ['列项目', 'list projects'], read_project: ['读项目', 'read project'], add_troubleshooting: ['记排障', 'add troubleshooting'],
  read_pinout: ['查引脚表', 'pinout'], read_board: ['读板子档案', 'board'], list_parts: ['看套件清单', 'kit list'], check_env: ['检查环境', 'check env'], read_file: ['读文件', 'read file'], list_files: ['列目录', 'list files'], write_firmware: ['写固件', 'write firmware'], pio_build: ['编译', 'build'], pio_upload: ['烧录', 'flash'], serial_read: ['读串口', 'read serial'], append_journal: ['记日志', 'journal'], record_ai_mistake: ['记错误', 'log mistake'], sim_run: ['虚拟板子运行', 'run on virtual board'],
}
const label = (n: string) => { const e = TOOL_LABEL[n]; return e ? (getLang() === 'en' ? e[1] : e[0]) : n }

type Tab = 'board' | 'assembly' | 'code' | 'serial' | 'project'

// 形象姿态：待机 / 工作（跑工具）/ 思考（等模型）/ 庆祝（成功烧录或目标达成）/ 为难（出错）
export function mentorPose(items: Item[], busy: boolean): string {
  const last = items[items.length - 1]
  if (last?.kind === 'system') return 'mentor_stuck'
  if (last?.kind === 'tool' && last.error) return 'mentor_stuck'
  if (busy) return items.some((i) => i.kind === 'tool' && i.running) ? 'mentor_working' : 'mentor_thinking'
  if (last?.kind === 'tool' && (last.name === 'pio_upload' || last.name === 'append_journal') && !last.error) return 'mentor_cheer'
  if (last?.kind === 'assistant' && /🎉|亮了|成功|done|works|congrat/i.test(last.text)) return 'mentor_cheer'
  return 'mentor_idle'
}

export function Workshop() {
  const lang = useLang()
  const [, tick] = useState(0)
  const [live, setLive] = useState<SimLive>({ pins: {}, serial: '', running: false })
  const agent = useRef<Agent | null>(null)
  if (!agent.current) agent.current = new Agent(() => tick((n) => n + 1), setLive)
  const a = agent.current
  const [mode, setMode] = useState<ModeInfo | null>(null)
  useEffect(() => { detectMode().then(setMode) }, [])
  const [text, setText] = useState(() => { const m = location.hash.match(/[?&]q=([^&]+)/); return m ? decodeURIComponent(m[1]) : '' })
  const endRef = useRef<HTMLDivElement>(null)
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) }, [a.items.length, a.busy])
  const submit = (s: string) => { if (!s.trim() || a.busy) return; setText(''); a.send(s.trim()) }

  // 工作区：自动跟着最近发生的事切标签
  const [tab, setTab] = useState<Tab>('board')
  const [auto, setAuto] = useState(true)
  const latestWire = [...a.items].reverse().find((i) => i.kind === 'human' && i.ask.kind === 'wire') as Extract<Item, { kind: 'human' }> | undefined
  const latestCode = [...a.items].reverse().find((i) => i.kind === 'tool' && i.name === 'write_firmware' && /\.(cpp|c|h|ino)$/.test(String(i.input.path))) as Extract<Item, { kind: 'tool' }> | undefined
  const latestProject = [...a.items].reverse().find((i) => i.kind === 'tool' && i.name === 'save_project') as Extract<Item, { kind: 'tool' }> | undefined
  const lastKind = a.items.length ? a.items[a.items.length - 1] : null
  useEffect(() => {
    if (!auto || !lastKind) return
    if (lastKind.kind === 'human' && lastKind.ask.kind === 'wire') setTab('assembly')
    else if (lastKind.kind === 'tool' && lastKind.name === 'sim_run') setTab('board')
    else if (lastKind.kind === 'tool' && lastKind.name === 'write_firmware') setTab('code')
    else if (lastKind.kind === 'tool' && lastKind.name === 'save_project') setTab('project')
  }, [a.items.length, auto, lastKind])
  useEffect(() => { if (live.running && auto) setTab('board') }, [live.running, auto])

  // 可拖动分栏
  const [split, setSplit] = useState(() => { try { return Number(localStorage.getItem('vb:split')) || 44 } catch { return 44 } })
  const dragging = useRef(false)
  const onDrag = (e: React.MouseEvent) => {
    if (!dragging.current) return
    const box = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const pct = Math.min(70, Math.max(28, ((e.clientX - box.left) / box.width) * 100))
    setSplit(pct); try { localStorage.setItem('vb:split', String(pct)) } catch { /* */ }
  }
  const suggest = [1, 2, 3, 4, 5].map((i) => t('ws.suggest.' + i, lang))

  return (
    <div className="ws" style={{ gridTemplateColumns: `${split}% 6px 1fr` }} onMouseMove={onDrag} onMouseUp={() => (dragging.current = false)} onMouseLeave={() => (dragging.current = false)}>
      <div className="ws-chat">
        <div className="ws-head">
          <div className="ws-title"><h1>{t('ws.title')}</h1>{a.items.length > 0 && <ResetButton onReset={() => a.reset()} />}</div>
          {mode && mode.mode !== 'local' && <p className="muted small">{t('ws.static')}</p>}
        </div>
        <div className="ws-log">
          {a.items.length === 0 && (
            <div className="ws-empty">
              <div className="ws-empty-npc"><NpcImage name="mentor_idle" /></div>
              <div><p>{t('ws.eg')}</p><div className="chips">{suggest.map((s) => <button key={s} className="chip" onClick={() => submit(s)}>{s}</button>)}</div></div>
            </div>
          )}
          {a.items.map((it, i) => <Row key={i} it={it} onAnswer={(id, s) => a.answerHuman(id, s)} />)}
          {a.busy && !a.items.some((i) => (i.kind === 'human' || i.kind === 'bom') && i.answer === undefined) && <div className="ws-thinking"><span className="dots" />{a.model && <em>{a.model}</em>}</div>}
          <div ref={endRef} />
        </div>
        <form className="ws-input" onSubmit={(e) => { e.preventDefault(); submit(text) }}>
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder={a.busy ? t('ws.busy') : t('ws.placeholder')} disabled={a.busy} autoFocus />
          <button className="chip primary" disabled={a.busy || !text.trim()}>{t('ws.send')}</button>
        </form>
      </div>
      <div className="ws-divider" onMouseDown={() => (dragging.current = true)} />
      <aside className="ws-space">
        <div className="ws-mentor"><NpcImage name={mentorPose(a.items, a.busy)} /></div>
        <div className="ws-tabs">
          {(['board', 'assembly', 'code', 'serial', 'project'] as Tab[]).map((k) => (
            <button key={k} className={'chip' + (tab === k ? ' on' : '')} onClick={() => { setTab(k); setAuto(false) }}>
              {k === 'board' ? '▣ ' : k === 'assembly' ? '🧩 ' : k === 'code' ? '⌘ ' : k === 'serial' ? '⇄ ' : '📁 '}{t('ws.' + k)}
              {k === 'assembly' && latestWire && !latestWire.answer && <i className="dot" />}
            </button>
          ))}
          <button className={'chip small' + (auto ? ' on' : '')} onClick={() => setAuto(!auto)} title="auto-follow">{auto ? '◉' : '○'}</button>
        </div>
        <div className="ws-panel">
          {tab === 'board' && (
            <div className="ws-boardpane">
              <BoardSvg pins={live.pins as Record<string, PinState>} buttonDown={false} onButton={() => {}} />
              <div className="serial-head"><span>Serial <em>115200</em></span><span className={'led ' + (live.running ? 'on' : '')} /></div>
              <pre className="serial-out ws-serial">{live.serial || t('ws.serial.idle')}</pre>
            </div>
          )}
          {tab === 'assembly' && <Assembly ask={latestWire?.ask} />}
          {tab === 'code' && (latestCode ? <div className="ws-code"><div className="serial-head"><span>{String(latestCode.input.path)}</span></div><Markdown text={'```cpp\n' + String(latestCode.input.content) + '\n```'} /></div> : <div className="ws-idle">{t('ws.code.idle')}</div>)}
          {tab === 'serial' && <pre className="serial-out ws-serial big">{live.serial || t('ws.serial.idle')}</pre>}
          {tab === 'project' && <ProjectPane mode={mode?.mode ?? 'local'} slug={latestProject ? String(latestProject.input.slug) : null} />}
        </div>
        <div className="ws-side-foot">
          <Projects key={a.items.length} mode={mode?.mode ?? 'local'} />
        </div>
      </aside>
      <Intro />
    </div>
  )
}

// 首次进入弹一次的说明
function Intro() {
  const [show, setShow] = useState(() => { try { return localStorage.getItem('vb:intro') !== '1' } catch { return false } })
  if (!show) return null
  const close = () => { try { localStorage.setItem('vb:intro', '1') } catch { /* */ } setShow(false) }
  return (
    <div className="intro-mask" onClick={close}>
      <div className="intro-card" onClick={(e) => e.stopPropagation()}>
        <div className="ws-empty-npc"><NpcImage name="mentor_cheer" /></div>
        <div>
          <h2>{t('intro.title')}</h2>
          <p>{t('intro.body')}</p>
          <button className="chip primary" onClick={close}>{t('intro.ok')}</button>
        </div>
      </div>
    </div>
  )
}

// 组装面板：宜家说明书式。零件大图 + 接线图 + 步骤 + 安全提示
function Assembly({ ask }: { ask?: HumanAsk }) {
  if (!ask) return <div className="ws-idle">{t('ws.assembly.idle')}</div>
  const parts = (ask.parts ?? []).filter((p) => partByName(p))
  const wires = ask.wires ? parseWires(ask.wires) : []
  const left = parts.filter((p) => /^(part_)?bluepill$/.test(p)); const right = parts.filter((p) => !left.includes(p))
  return (
    <div className="asm">
      <div className="asm-head"><b>{ask.title}</b>{ask.why && <p className="muted">{ask.why}</p>}</div>
      {parts.length > 0 && <div className="asm-parts">{parts.map((p, i) => <div key={p} className="asm-part"><span className="asm-n">{i + 1}</span><div className="asm-img"><PartImg name={p} /></div><span>{partByName(p)?.label}</span></div>)}</div>}
      {wires.length > 0 && <Wiring title={ask.title} left={left.length ? left : [wires[0].from]} right={right.length ? right : [wires[0].to]} wires={wires} />}
      <ol className="asm-steps">{ask.steps.map((s, i) => <li key={i}><span className="asm-n">{i + 1}</span>{s}</li>)}</ol>
      {ask.expect && <p className="hcard-expect">👀 {t('card.expect')}{ask.expect}</p>}
      {ask.safety && <p className="hcard-safety">⚠ {t('card.safety')}: {ask.safety}</p>}
    </div>
  )
}

function ProjectPane({ mode, slug }: { mode: string; slug: string | null }) {
  const [txt, setTxt] = useState('')
  useEffect(() => {
    if (!slug) return
    if (mode === 'local') fetch('/api/tool', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'read_project', input: { slug } }) }).then((r) => r.json()).then((j) => setTxt(String(j.result ?? ''))).catch(() => {})
    else store.get<Record<string, { title: string; brief?: string; bom?: string; plan?: string }>>('projects').then((ps) => { const p = ps?.[slug]; setTxt(p ? ['plan', 'bom', 'brief'].filter((k) => p[k as 'plan']).map((k) => `## ${k}\n${p[k as 'plan']}`).join('\n\n') : '') })
  }, [mode, slug])
  if (!slug) return <div className="ws-idle">{t('ws.projects.none')}</div>
  return <div className="ws-code"><div className="serial-head"><span>{slug}</span></div><Markdown text={txt.replace(/^---[\s\S]*?---\n/gm, '')} /></div>
}

function ResetButton({ onReset }: { onReset: () => void }) {
  const [arm, setArm] = useState(false)
  useEffect(() => { if (!arm) return; const x = setTimeout(() => setArm(false), 3000); return () => clearTimeout(x) }, [arm])
  return arm
    ? <button className="chip warn" onClick={() => { setArm(false); onReset() }}>{t('ws.new.confirm')}</button>
    : <button className="chip" onClick={() => setArm(true)}>{t('ws.new')}</button>
}

function Projects({ mode }: { mode: string }) {
  const [list, setList] = useState<string[]>([])
  const [backend, setBackend] = useState<'supabase' | 'local'>('local')
  useEffect(() => {
    if (mode !== 'local') {
      store.backend().then(setBackend)
      store.get<Record<string, { title: string }>>('projects').then((ps) => setList(Object.entries(ps ?? {}).map(([k, p]) => `${k}: ${p.title}`)))
      return
    }
    fetch('/api/tool', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'list_projects', input: {} }) })
      .then((r) => r.json()).then((j) => setList(String(j.result ?? '').split('\n').filter((l) => l && !l.startsWith('还没有')))).catch(() => {})
  }, [mode])
  return (
    <div className="ws-tools ws-projects">
      <div className="canvas-head"><span className="canvas-title">📁 {t('ws.projects')}</span><span className="muted small">{mode === 'local' ? 'content/projects/' : backend === 'supabase' ? t('ws.projects.cloud') : t('ws.projects.local')}</span></div>
      <ul>{list.length ? list.map((l) => <li key={l}>{l}</li>) : <li className="muted">{t('ws.projects.none')}</li>}</ul>
    </div>
  )
}

function Row({ it, onAnswer }: { it: Item; onAnswer: (id: string, s: string) => void }) {
  const [open, setOpen] = useState(false)
  if (it.kind === 'user') return <div className="ws-row user"><div className="bubble">{it.text}</div></div>
  if (it.kind === 'assistant') return <div className="ws-row ai"><div className="ws-avatar"><NpcImage name="mentor_idle" /></div><div className="bubble"><Markdown text={it.text} /></div></div>
  if (it.kind === 'system') return <div className="ws-row sys">{it.text}</div>
  if (it.kind === 'human') return <div className="ws-row cardrow"><HumanCard ask={it.ask} answer={it.answer} onAnswer={(s) => onAnswer(it.id, s)} /></div>
  if (it.kind === 'bom') return <div className="ws-row cardrow"><BomCard ask={it.ask} answer={it.answer} onAnswer={(s) => onAnswer(it.id, s)} /></div>
  return (
    <div className={'ws-row tool' + (it.error ? ' err' : '')}>
      <button className="tool-chip" onClick={() => setOpen(!open)}>
        <span className={'led ' + (it.running ? 'on' : it.error ? 'err' : 'ok')} />
        {label(it.name)}
        {it.name === 'write_firmware' && <code>{String(it.input.path ?? '')}</code>}
        {(it.name === 'read_pinout' || it.name.startsWith('search_') || it.name === 'get_snippet' || it.name === 'explain_concept') && it.input.query ? <code>{String(it.input.query)}</code> : null}
        <span className="muted">{it.running ? '…' : open ? '−' : '+'}</span>
      </button>
      {open && (
        <div className="tool-detail">
          {(it.name === 'sim_run' || it.name === 'write_firmware') && <pre className="tool-code">{String(it.input.code ?? it.input.content ?? '')}</pre>}
          {it.result && <pre className="tool-out">{it.result}</pre>}
        </div>
      )}
    </div>
  )
}
