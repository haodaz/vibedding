import { useEffect, useRef, useState } from 'react'
import { Agent, type Item } from './agent'
import { HumanCard } from './HumanCard'
import { BomCard } from './BomCard'
import { BoardSvg, type PinState } from '../canvases/board/BoardSvg'
import { Markdown } from '../Markdown'
import { NpcImage } from '../components/Scene'
import type { SimLive } from './sim'

const SUGGEST = ['要有光', '让板载的灯眨起来', '我想做一个自动浇花的东西', '做一个桌面温湿度小站', '继续上次的项目']
const TOOL_LABEL: Record<string, string> = { search_parts: '查元件库', add_part: '收录元件', read_inventory: '看库存', update_inventory: '更新库存', save_project: '保存项目', list_projects: '列项目', read_project: '读项目', read_pinout: '查引脚表', read_board: '读板子档案', list_parts: '看套件清单', check_env: '检查环境', read_file: '读文件', list_files: '列目录', write_firmware: '写固件', pio_build: '编译', pio_upload: '烧录', serial_read: '读串口', append_journal: '记日志', record_ai_mistake: '记错误', sim_run: '虚拟板子运行' }

export function Workshop() {
  const [, tick] = useState(0)
  const [live, setLive] = useState<SimLive>({ pins: {}, serial: '', running: false })
  const agent = useRef<Agent | null>(null)
  if (!agent.current) agent.current = new Agent(() => tick((n) => n + 1), setLive)
  const a = agent.current
  const [text, setText] = useState('')
  const endRef = useRef<HTMLDivElement>(null)
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) }, [a.items.length, a.busy])

  const submit = (t: string) => { if (!t.trim() || a.busy) return; setText(''); a.send(t.trim()) }

  return (
    <div className="ws">
      <div className="ws-chat">
        <div className="ws-head">
          <div className="eyebrow">// MAKE</div>
          <div className="ws-title"><h1>直接做</h1>{a.items.length > 0 && <ResetButton onReset={() => a.reset()} />}</div>
          <p>说你要什么，我来写代码、跑、烧。我够不着的（插线、按键、跑命令）会弹卡片请你搭把手。{a.mock && <span className="ws-mock">现在是演示剧本（还没配 AI 密钥），只会演"要有光"。</span>}</p>
        </div>
        <div className="ws-log">
          {a.items.length === 0 && (
            <div className="ws-empty">
              <div className="ws-empty-npc"><NpcImage name="npc_mentor" /></div>
              <div>
                <p>比如说：</p>
                <div className="chips">{SUGGEST.map((s) => <button key={s} className="chip" onClick={() => submit(s)}>{s}</button>)}</div>
              </div>
            </div>
          )}
          {a.items.map((it, i) => <Row key={i} it={it} onAnswer={(id, s) => a.answerHuman(id, s)} />)}
          {a.busy && !a.items.some((i) => i.kind === 'human' && i.answer === undefined) && <div className="ws-thinking"><span className="dots" />{a.model && <em>{a.model}</em>}</div>}
          <div ref={endRef} />
        </div>
        <form className="ws-input" onSubmit={(e) => { e.preventDefault(); submit(text) }}>
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder={a.busy ? '我在做……' : '要做什么？'} disabled={a.busy} autoFocus />
          <button className="chip primary" disabled={a.busy || !text.trim()}>发送</button>
        </form>
      </div>
      <aside className="ws-side">
        <div className="ws-board">
          <div className="canvas-head"><span className="canvas-title">▣ 虚拟板子</span><span className={'led ' + (live.running ? 'on' : '')} /></div>
          <BoardSvg pins={live.pins as Record<string, PinState>} buttonDown={false} onButton={() => {}} />
          <pre className="serial-out ws-serial">{live.serial || '（AI 跑 sim_run 时这里会动）'}</pre>
        </div>
        <Projects />
        <div className="ws-tools">
          <div className="canvas-head"><span className="canvas-title">▣ 我有的工具</span></div>
          <ul>
            <li><b>查</b> 引脚表 · 板子档案 · 套件清单 · 环境</li>
            <li><b>做</b> 写固件 · 编译 · 烧录 · 读串口 · 虚拟板子</li>
            <li><b>记</b> 日志 · 我犯过的错</li>
            <li><b>请你</b> 接线 · 按键 · 粘贴运行 · 观察</li>
          </ul>
        </div>
      </aside>
    </div>
  )
}

// 不用浏览器的 confirm 弹窗（内嵌浏览器里可能被拦掉），改成点两次确认
function ResetButton({ onReset }: { onReset: () => void }) {
  const [arm, setArm] = useState(false)
  useEffect(() => { if (!arm) return; const t = setTimeout(() => setArm(false), 3000); return () => clearTimeout(t) }, [arm])
  return arm
    ? <button className="chip warn" onClick={() => { setArm(false); onReset() }}>再点一次清空（项目文件不会删）</button>
    : <button className="chip" onClick={() => setArm(true)}>＋ 新对话</button>
}

function Projects() {
  const [list, setList] = useState<string[]>([])
  useEffect(() => {
    fetch('/api/tool', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'list_projects', input: {} }) })
      .then((r) => r.json()).then((j) => setList(String(j.result ?? '').split('\n').filter((l) => l && !l.startsWith('还没有')))).catch(() => {})
  }, [])
  return (
    <div className="ws-tools ws-projects">
      <div className="canvas-head"><span className="canvas-title">▣ 我的项目</span><span className="muted small">content/projects/</span></div>
      <ul>{list.length ? list.map((l) => <li key={l}>{l}</li>) : <li className="muted">还没有。说一个需求就会有。</li>}</ul>
    </div>
  )
}

function Row({ it, onAnswer }: { it: Item; onAnswer: (id: string, s: string) => void }) {
  const [open, setOpen] = useState(false)
  if (it.kind === 'user') return <div className="ws-row user"><div className="bubble">{it.text}</div></div>
  if (it.kind === 'assistant') return <div className="ws-row ai"><div className="ws-avatar"><NpcImage name="npc_mentor" /></div><div className="bubble"><Markdown text={it.text} /></div></div>
  if (it.kind === 'system') return <div className="ws-row sys">{it.text}</div>
  if (it.kind === 'human') return <div className="ws-row cardrow"><HumanCard ask={it.ask} answer={it.answer} onAnswer={(s) => onAnswer(it.id, s)} /></div>
  if (it.kind === 'bom') return <div className="ws-row cardrow"><BomCard ask={it.ask} answer={it.answer} onAnswer={(s) => onAnswer(it.id, s)} /></div>
  return (
    <div className={'ws-row tool' + (it.error ? ' err' : '')}>
      <button className="tool-chip" onClick={() => setOpen(!open)}>
        <span className={'led ' + (it.running ? 'on' : it.error ? 'err' : 'ok')} />
        {TOOL_LABEL[it.name] ?? it.name}
        {it.name === 'write_firmware' && <code>{String(it.input.path ?? '')}</code>}
        {it.name === 'read_pinout' && it.input.filter ? <code>{String(it.input.filter)}</code> : null}
        <span className="muted">{it.running ? '运行中…' : open ? '收起' : '看详情'}</span>
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
