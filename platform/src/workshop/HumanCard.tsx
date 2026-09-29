import { useState } from 'react'
import type { HumanAsk } from './agent'
import { PartImg } from '../canvases/parts/PartImg'
import { partByName } from '../canvases/parts/catalog'
import { Wiring, parseWires } from '../canvases/parts/Wiring'
import { t } from '../i18n'

const KIND_LABEL = () => ({ wire: t('card.wire'), press: t('card.press'), paste: t('card.paste'), observe: t('card.observe') })

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
        <span className="hcard-kind">✋ {t('card.need')} · {KIND_LABEL()[ask.kind] ?? ask.kind}</span>
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
          <button className="chip" onClick={async () => { await navigator.clipboard.writeText(ask.paste!); setCopied(true); setTimeout(() => setCopied(false), 1200) }}>{copied ? t('card.copied') : t('card.copy')}</button>
        </div>
      )}
      {ask.expect && <p className="hcard-expect">👀 {t('card.expect')}{ask.expect}</p>}
      {ask.safety && <p className="hcard-safety">⚠ {t('card.safety')}: {ask.safety}</p>}
      {done ? (
        <div className="hcard-answer">✔ {t('card.reply')}{answer}</div>
      ) : (
        <div className="hcard-actions">
          {ask.kind === 'observe' && (ask.options ?? ['是', '否']).map((o) => <button key={o} className="chip primary" onClick={() => onAnswer(o)}>{o}</button>)}
          {ask.kind !== 'observe' && <button className="chip primary" onClick={() => onAnswer(note ? `${t('card.done.msg')}. ${note}` : t('card.done.msg'))}>{ask.kind === 'paste' ? t('card.ran') : t('card.done')}</button>}
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={ask.kind === 'paste' ? t('card.paste.note') : t('card.note')} onKeyDown={(e) => { if (e.key === 'Enter' && note) onAnswer(note) }} />
          <button className="chip" onClick={() => onAnswer(note || t('card.stuck.msg'))}>{t('card.stuck')}</button>
        </div>
      )}
    </div>
  )
}
