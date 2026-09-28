import { useEffect, useRef, useState } from 'react'
import { Agent, type Item } from './agent'
import { HumanCard } from './HumanCard'
import { BoardSvg, type PinState } from '../canvases/board/BoardSvg'
import { Markdown } from '../Markdown'
import { NpcImage } from '../components/Scene'
import type { SimLive } from './sim'

const SUGGEST = ['要有光', '让板载的灯眨起来', '按一下按键切换灯', '串口每秒报个数', '做一个呼吸灯']
const TOOL_LABEL: Record<string, string> = { read_pinout: '查引脚表', read_board: '读板子档案', list_parts: '看套件清单', check_env: '检查环境', read_file: '读文件', list_files: '列目录', write_firmware: '写固件', pio_build: '编译', pio_upload: '烧录', serial_read: '读串口', append_journal: '记日志', record_ai_mistake: '记错误', sim_run: '虚拟板子运行' }

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
          <h1>直接做</h1>
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

function Row({ it, onAnswer }: { it: Item; onAnswer: (id: string, s: string) => void }) {
  const [open, setOpen] = useState(false)
  if (it.kind === 'user') return <div className="ws-row user"><div className="bubble">{it.text}</div></div>
  if (it.kind === 'assistant') return <div className="ws-row ai"><div className="ws-avatar"><NpcImage name="npc_mentor" /></div><div className="bubble"><Markdown text={it.text} /></div></div>
  if (it.kind === 'system') return <div className="ws-row sys">{it.text}</div>
  if (it.kind === 'human') return <div className="ws-row card"><HumanCard ask={it.ask} answer={it.answer} onAnswer={(s) => onAnswer(it.id, s)} /></div>
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
