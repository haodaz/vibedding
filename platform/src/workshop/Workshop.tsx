import { useEffect, useRef, useState } from 'react'
import { Agent, newSessionId, type Item, type HumanAsk } from './agent'
import { href } from '../router'
import { HumanCard } from './HumanCard'
import { BomCard } from './BomCard'
import { FlashCard } from './FlashCard'
import { BoardSvg, type PinState } from '../canvases/board/BoardSvg'
import { BoardEsp32Svg } from '../canvases/board/BoardEsp32Svg'
import { byPath } from '../content'
import { Markdown } from '../Markdown'
import { NpcImage } from '../components/Scene'
import type { SimLive } from './sim'
import { visitorBoardId } from './local-tools'
import { detectMode, type ModeInfo } from './mode'
import { store } from './storage'
import { t, getLang, useLang } from '../i18n'
import { PartImg } from '../canvases/parts/PartImg'
import { partByName } from '../canvases/parts/catalog'
import { Wiring, parseWires } from '../canvases/parts/Wiring'
import { Icon } from '../components/Icon'
import { StarterCards } from './StarterCards'

const TOOL_LABEL: Record<string, [string, string]> = {
  search_projects: ['查项目食谱', 'search recipes'], search_troubleshooting: ['查排障库', 'search troubleshooting'], explain_concept: ['查术语表', 'glossary'], get_snippet: ['取代码片段', 'get snippet'], list_boards: ['看板子列表', 'list boards'], read_board_profile: ['读板子档案', 'board profile'], part_detail: ['查元件档案', 'part detail'],
  search_parts: ['查元件库', 'search parts'], add_part: ['收录元件', 'add part'], read_inventory: ['看库存', 'read inventory'], update_inventory: ['更新库存', 'update inventory'], save_project: ['保存项目', 'save project'], list_projects: ['列项目', 'list projects'], read_project: ['读项目', 'read project'], add_troubleshooting: ['记排障', 'add troubleshooting'],
  cloud_build: ['云编译', 'cloud build'], web_flash: ['浏览器烧录', 'flash from browser'], read_pinout: ['查引脚表', 'pinout'], read_board: ['读板子档案', 'board'], list_parts: ['看套件清单', 'kit list'], check_env: ['检查环境', 'check env'], read_file: ['读文件', 'read file'], list_files: ['列目录', 'list files'], write_firmware: ['写固件', 'write firmware'], pio_build: ['编译', 'build'], pio_upload: ['烧录', 'flash'], serial_read: ['读串口', 'read serial'], append_journal: ['记日志', 'journal'], record_ai_mistake: ['记错误', 'log mistake'], sim_run: ['虚拟板子运行', 'run on virtual board'], diagnose: ['深度排障', 'deep diagnosis'],
}
const label = (n: string) => { const e = TOOL_LABEL[n]; return e ? (getLang() === 'en' ? e[1] : e[0]) : n }

type Tab = 'board' | 'assembly' | 'code' | 'serial' | 'project'

// 图片缩到最长边 1024、JPEG 0.8 再发给模型；缩略图存会话（小，避免撑爆 localStorage）
async function shrinkImage(file: File): Promise<{ dataUrl: string; media_type: string; data: string }> {
  const bmp = await createImageBitmap(file)
  const max = 1024, k = Math.min(1, max / Math.max(bmp.width, bmp.height))
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k)
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height)
  const full = c.toDataURL('image/jpeg', 0.8)
  const k2 = Math.min(1, 480 / Math.max(c.width, c.height)); const t2 = document.createElement('canvas'); t2.width = Math.round(c.width * k2); t2.height = Math.round(c.height * k2)
  t2.getContext('2d')!.drawImage(c, 0, 0, t2.width, t2.height)
  return { dataUrl: t2.toDataURL('image/jpeg', 0.7), media_type: 'image/jpeg', data: full.split(',')[1] }
}

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
  const sessionId = (() => { const m = location.hash.match(/[?&]p=([^&]+)/); return m ? decodeURIComponent(m[1]) : newSessionId() })()
  const agent = useRef<Agent | null>(null)
  if (!agent.current || agent.current.id !== sessionId) agent.current = new Agent(sessionId, () => tick((n) => n + 1), setLive)
  const a = agent.current
  const [env, setEnv] = useState<{ pio: string | null; usb: string[]; ports: string[] } | null>(null)
  useEffect(() => { fetch('/api/status').then((r) => r.json()).then(setEnv).catch(() => setEnv(null)) }, [])
  const [mode, setMode] = useState<ModeInfo | null>(null)
  useEffect(() => { detectMode().then(setMode) }, [])
  const [text, setText] = useState(() => { const m = location.hash.match(/[?&]q=([^&]+)/); return m ? decodeURIComponent(m[1]) : '' })
  const endRef = useRef<HTMLDivElement>(null)
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) }, [a.items.length, a.busy])
  const [imgs, setImgs] = useState<{ dataUrl: string; media_type: string; data: string }[]>([])
  const fileRef = useRef<HTMLInputElement>(null)
  const addFiles = async (files: FileList | File[]) => { const out = await Promise.all(Array.from(files).filter((f) => f.type.startsWith('image/')).slice(0, 4).map(shrinkImage)); setImgs((x) => [...x, ...out].slice(0, 4)) }
  const onPaste = (e: React.ClipboardEvent) => { const fs = Array.from(e.clipboardData.files); if (fs.length) { e.preventDefault(); addFiles(fs) } }
  const submit = (s: string) => { if ((!s.trim() && !imgs.length) || a.busy) return; const im = imgs; setText(''); setImgs([]); a.send(s.trim(), im) }

  // 工作区：自动跟着最近发生的事切标签
  const [tab, setTab] = useState<Tab>('board')
  // 虚拟板子画哪一块：本地模式按仓库里的 board.md（就是用户自己的板子）；
  // 体验模式按访客聊出来的库存——不能拿作者的板子冒充访客的。
  const [boardId, setBoardId] = useState('')
  useEffect(() => {
    let alive = true
    const local = byPath('hardware/board.md')?.fm.board ?? ''
    if (mode?.mode === 'local') { setBoardId(local); return }
    visitorBoardId().then((b) => { if (alive) setBoardId(b) })
    return () => { alive = false }
  }, [mode?.mode, a.items.length])
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
  const started = a.items.length > 0

  if (!started) return (
    <div className="ws-start">
      <div className="ws-start-head"><div className="ws-empty-npc big"><NpcImage name="mentor_idle" /></div><div><h1>{t('ws.start.title')}</h1><p className="muted">{t('ws.start.sub')}</p></div></div>
      <StarterCards onPick={submit} />
      <form className="ws-input start-input" onSubmit={(e) => { e.preventDefault(); submit(text) }} onPaste={onPaste} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files) }}>
        {imgs.length > 0 && <div className="ws-attach">{imgs.map((im, i) => <span key={i} className="ws-thumb"><img src={im.dataUrl} alt="" /><button type="button" onClick={() => setImgs(imgs.filter((_, j) => j !== i))}>×</button></span>)}</div>}
        <button type="button" className="chip attach" title={t('ws.attach')} onClick={() => fileRef.current?.click()}><Icon name="camera" size={15} /></button>
        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = '' }} />
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder={imgs.length ? t('ws.placeholder.img') : t('ws.placeholder')} autoFocus />
        <button className="chip primary" disabled={!text.trim()}><Icon name="play" size={14} /> {t('ws.send')}</button>
      </form>
    </div>
  )

  return (
    <div className="ws" style={{ gridTemplateColumns: `${split}% 6px 1fr` }} onMouseMove={onDrag} onMouseUp={() => (dragging.current = false)} onMouseLeave={() => (dragging.current = false)}>
      <div className="ws-chat">
        <div className="ws-head">
          <div className="ws-title"><a className="back" href={href('/projects')} title={t('nav.projects')}><Icon name="back" size={16} /></a><h1>{a.title || t('ws.newproject')}</h1>{a.items.length > 0 && <ResetButton onReset={() => a.reset()} />}</div>
          {mode && mode.mode !== 'local' && <p className="muted small">{t('ws.static')}</p>}
        </div>
        <div className="ws-log">
          {a.items.map((it, i) => <Row key={i} it={it} onAnswer={(id, s) => a.answerHuman(id, s)} />)}
          {a.busy && !a.items.some((i) => (i.kind === 'human' || i.kind === 'bom' || i.kind === 'flash') && i.answer === undefined) && <div className="ws-thinking"><span className="dots" />{a.model && <em>{a.model}</em>}</div>}
          <div ref={endRef} />
        </div>
        <form className="ws-input" onSubmit={(e) => { e.preventDefault(); submit(text) }} onPaste={onPaste} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files) }}>
          {imgs.length > 0 && <div className="ws-attach">{imgs.map((im, i) => <span key={i} className="ws-thumb"><img src={im.dataUrl} alt="" /><button type="button" onClick={() => setImgs(imgs.filter((_, j) => j !== i))}>×</button></span>)}</div>}
          <button type="button" className="chip attach" title={t('ws.attach')} onClick={() => fileRef.current?.click()}><Icon name="camera" size={15} /></button>
          <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = '' }} />
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder={a.busy ? t('ws.busy') : imgs.length ? t('ws.placeholder.img') : t('ws.placeholder')} disabled={a.busy} autoFocus />
          <button className="chip primary" disabled={a.busy || (!text.trim() && !imgs.length)}>{t('ws.send')}</button>
        </form>
      </div>
      <div className="ws-divider" onMouseDown={() => (dragging.current = true)} />
      <aside className="ws-space">
        <div className="ws-mentor"><NpcImage name={mentorPose(a.items, a.busy)} /></div>
        <div className="ws-tabs">
          {(['board', 'assembly', 'code', 'serial', 'project'] as Tab[]).map((k) => (
            <button key={k} className={'chip' + (tab === k ? ' on' : '')} onClick={() => { setTab(k); setAuto(false) }}>
              <Icon name={k === 'board' ? 'board' : k === 'assembly' ? 'puzzle' : k === 'code' ? 'code' : k === 'serial' ? 'serial' : 'folder'} size={14} /> {t('ws.' + k)}
              {k === 'assembly' && latestWire && !latestWire.answer && <i className="dot" />}
            </button>
          ))}
          <button className={'chip small' + (auto ? ' on' : '')} onClick={() => setAuto(!auto)} title="auto-follow"><Icon name="eye" size={13} /></button>
        </div>
        <div className="ws-panel">
          {tab === 'board' && (
            <div className="ws-boardpane">
              <div className="ws-envbar">
                <span className={'st ' + (env && (env.usb.length || env.ports.length) ? 'ok' : 'off')}><i />{env && (env.usb.length || env.ports.length) ? `${t('st.board.on')} ${env.usb[0] ?? env.ports[0]}` : t('st.board.off')}</span>
                <span className={'st ' + (env?.pio ? 'ok' : 'warn')}><i />{env?.pio ? 'PlatformIO ' + env.pio.replace(/^PlatformIO Core, version /, '') : (mode?.mode === 'local' ? t('st.pio.off') : t('st.static'))}</span>
              </div>
              {/^esp32/.test(boardId) ? <BoardEsp32Svg pins={live.pins as Record<string, PinState>} buttonDown={false} onButton={() => {}} /> : <BoardSvg pins={live.pins as Record<string, PinState>} buttonDown={false} onButton={() => {}} />}
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
      {ask.expect && <p className="hcard-expect"><Icon name="eye" size={14} /> {t('card.expect')}{ask.expect}</p>}
      {ask.safety && <p className="hcard-safety"><Icon name="alert" size={14} /> {t('card.safety')}: {ask.safety}</p>}
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
    : <button className="chip" onClick={() => setArm(true)} title={t('ws.new')}><Icon name="x" size={13} /> {t('ws.clearchat')}</button>
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
      <div className="canvas-head"><span className="canvas-title"><Icon name="folder" size={13} /> {t('ws.projects')}</span><span className="muted small">{mode === 'local' ? 'content/projects/' : backend === 'supabase' ? t('ws.projects.cloud') : t('ws.projects.local')}</span></div>
      <ul>{list.length ? list.map((l) => <li key={l}>{l}</li>) : <li className="muted">{t('ws.projects.none')}</li>}</ul>
    </div>
  )
}

function Row({ it, onAnswer }: { it: Item; onAnswer: (id: string, s: string) => void }) {
  const [open, setOpen] = useState(false)
  if (it.kind === 'user') return <div className="ws-row user"><div className="bubble">{it.images && it.images.length > 0 && <div className="bubble-imgs">{it.images.map((src, i) => <img key={i} src={src} alt="" />)}</div>}{it.text}</div></div>
  if (it.kind === 'assistant') return <div className="ws-row ai"><div className="ai-text"><Markdown text={it.text} /></div></div>
  if (it.kind === 'system') return <div className="ws-row sys">{it.text}</div>
  if (it.kind === 'human') return <div className="ws-row cardrow"><HumanCard ask={it.ask} answer={it.answer} onAnswer={(s) => onAnswer(it.id, s)} /></div>
  if (it.kind === 'bom') return <div className="ws-row cardrow"><BomCard ask={it.ask} answer={it.answer} onAnswer={(s) => onAnswer(it.id, s)} /></div>
  if (it.kind === 'flash') return <div className="ws-row cardrow"><FlashCard build={it.build} note={it.note} answer={it.answer} onAnswer={(s) => onAnswer(it.id, s)} /></div>
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
