import { useState } from 'react'
import type { HumanAsk } from './agent'
import { PartImg } from '../canvases/parts/PartImg'
import { partByName } from '../canvases/parts/catalog'
import { Wiring, parseWires } from '../canvases/parts/Wiring'

const KIND_LABEL = { wire: '接线', press: '按键', paste: '粘贴运行', observe: '观察' }

// 指令卡：AI 够不着的事，交给人。做完点按钮，回复进入事件流。
export function HumanCard({ ask, answer, onAnswer }: { ask: HumanAsk; answer?: string; onAnswer: (s: string) => void }) {
  const [note, setNote] = useState('')
  const [copied, setCopied] = useState(false)
  const done = answer !== undefined
  const parts = (ask.parts ?? []).filter((p) => partByName(p))
  const wires = ask.wires ? parseWires(ask.wires) : []
  const left = parts.filter((p) => /^(part_)?bluepill$/.test(p))
  const right = parts.filter((p) => !left.includes(p))
  return (
    <div className={'hcard ' + ask.kind + (done ? ' done' : '')}>
      <div className="hcard-head">
        <span className="hcard-kind">✋ 需要你 · {KIND_LABEL[ask.kind] ?? ask.kind}</span>
        <b>{ask.title}</b>
      </div>
      {ask.why && <p className="hcard-why">{ask.why}</p>}
      {ask.kind === 'wire' && parts.length > 0 && wires.length === 0 && (
        <div className="hcard-parts">{parts.map((p) => <div key={p} className="hcard-part"><div className="hcard-part-img"><PartImg name={p} /></div><span>{partByName(p)?.label}</span></div>)}</div>
      )}
      {ask.kind === 'wire' && wires.length > 0 && <Wiring title={ask.title} left={left.length ? left : [wires[0].from]} right={right.length ? right : [wires[0].to]} wires={wires} />}
      <ol className="hcard-steps">{ask.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
      {ask.paste && (
        <div className="hcard-paste">
          <pre>{ask.paste}</pre>
          <button className="chip" onClick={async () => { await navigator.clipboard.writeText(ask.paste!); setCopied(true); setTimeout(() => setCopied(false), 1200) }}>{copied ? '✔ 已复制' : '⎘ 复制'}</button>
        </div>
      )}
      {ask.expect && <p className="hcard-expect">👀 做完应该看到：{ask.expect}</p>}
      {done ? (
        <div className="hcard-answer">✔ 你的回复：{answer}</div>
      ) : (
        <div className="hcard-actions">
          {ask.kind === 'observe' && (ask.options ?? ['是', '否']).map((o) => <button key={o} className="chip primary" onClick={() => onAnswer(o)}>{o}</button>)}
          {ask.kind !== 'observe' && <button className="chip primary" onClick={() => onAnswer(note ? `做完了。${note}` : '做完了')}>{ask.kind === 'paste' ? '跑完了' : '我做好了'}</button>}
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={ask.kind === 'paste' ? '把输出贴在这里（可选）' : '补充一句（可选），比如"没找到 220Ω 的电阻"'} onKeyDown={(e) => { if (e.key === 'Enter' && note) onAnswer(note) }} />
          <button className="chip" onClick={() => onAnswer(note || '我卡住了，做不了这一步')}>卡住了</button>
        </div>
      )}
    </div>
  )
}
