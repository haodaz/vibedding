import { PartImg } from './PartImg'
import { partByName } from './catalog'

// 接线图：左右两列元件卡片，中间画线。每根线写清楚"A 的哪个脚 → B 的哪个脚"。
// canvas 写法：
//   type: wiring
//   left: bluepill
//   right: button, resistor_10k
//   wires: bluepill.PA0 > button.脚1 #ffb454; bluepill.GND > button.脚2 #8b93a7
//   note: 按键一端接 PA0，另一端接地。内部上拉打开后，按下读到 0。
export interface Wire { from: string; fromPin: string; to: string; toPin: string; color: string; label?: string }

export function parseWires(s: string): Wire[] {
  return s.split(';').map((w) => w.trim()).filter(Boolean).map((w) => {
    const m = w.match(/^([\w-]+)\.([^>]+?)\s*>\s*([\w-]+)\.([^#]+?)\s*(#[0-9a-fA-F]{3,6})?\s*(?:"(.*)")?$/)
    if (!m) return { from: '?', fromPin: w, to: '?', toPin: '', color: '#8b93a7' }
    return { from: m[1], fromPin: m[2].trim(), to: m[3], toPin: m[4].trim(), color: m[5] ?? '#8b93a7', label: m[6] }
  })
}

const H = 120 // 每张卡片的高度（含间距）
export function Wiring({ left, right, wires, note, title }: { left: string[]; right: string[]; wires: Wire[]; note?: string; title?: string }) {
  // 每个元件卡片：按出现的线，把用到的脚列在靠中间那一侧
  const pinsOf = (name: string) => {
    const set: string[] = []
    for (const w of wires) { if (w.from === name && !set.includes(w.fromPin)) set.push(w.fromPin); if (w.to === name && !set.includes(w.toPin)) set.push(w.toPin) }
    return set
  }
  const col = (names: string[], side: 'L' | 'R') => names.map((n, i) => ({ name: n, side, index: i, pins: pinsOf(n) }))
  const L = col(left, 'L'), R = col(right, 'R')
  const rows = Math.max(L.length, R.length)
  const totalH = rows * H
  const pinY = (side: 'L' | 'R', name: string, pin: string) => {
    const c = (side === 'L' ? L : R).find((x) => x.name === name)
    if (!c) return 0
    const i = c.pins.indexOf(pin)
    const top = c.index * H + 16
    return top + 30 + i * 18
  }
  const sideOf = (name: string): 'L' | 'R' | null => (L.some((x) => x.name === name) ? 'L' : R.some((x) => x.name === name) ? 'R' : null)

  return (
    <div className="canvas wiring">
      <div className="canvas-head"><span className="canvas-title">▣ 接线图{title ? ' · ' + title : ''}</span><span className="muted small">线的颜色只是为了好认，不代表实际线色</span></div>
      <div className="wiring-body" style={{ height: totalH + 16 }}>
        <div className="wiring-col left">{L.map((c) => <PartCard key={c.name} c={c} />)}</div>
        <svg className="wiring-svg" viewBox={`0 0 200 ${totalH}`} preserveAspectRatio="none">
          {wires.map((w, i) => {
            const sa = sideOf(w.from), sb = sideOf(w.to)
            if (!sa || !sb || sa === sb) return null
            const [ls, rs] = sa === 'L' ? [w, { name: w.to, pin: w.toPin }] : [{ name: w.to, pin: w.toPin }, w]
            const y1 = pinY('L', sa === 'L' ? w.from : w.to, sa === 'L' ? w.fromPin : w.toPin)
            const y2 = pinY('R', sa === 'R' ? w.from : w.to, sa === 'R' ? w.fromPin : w.toPin)
            void ls; void rs
            return (
              <g key={i}>
                <path d={`M0,${y1} C80,${y1} 120,${y2} 200,${y2}`} stroke={w.color} strokeWidth={3} fill="none" opacity={.9} style={{ filter: `drop-shadow(0 0 4px ${w.color})` }} />
                <circle cx={0} cy={y1} r={4} fill={w.color} /><circle cx={200} cy={y2} r={4} fill={w.color} />
                {w.label && <text x={100} y={(y1 + y2) / 2 - 6} fontSize={9} textAnchor="middle" fill={w.color} fontFamily="var(--mono)">{w.label}</text>}
              </g>
            )
          })}
        </svg>
        <div className="wiring-col right">{R.map((c) => <PartCard key={c.name} c={c} />)}</div>
      </div>
      <div className="wiring-list">
        {wires.map((w, i) => (
          <div key={i} className="wire-row"><i style={{ background: w.color, boxShadow: `0 0 6px ${w.color}` }} /><b>{partByName(w.from)?.label ?? w.from}</b> <code>{w.fromPin}</code> → <b>{partByName(w.to)?.label ?? w.to}</b> <code>{w.toPin}</code>{w.label && <span className="muted"> · {w.label}</span>}</div>
        ))}
      </div>
      {note && <div className="wiring-note">{note}</div>}
    </div>
  )
}

function PartCard({ c }: { c: { name: string; side: 'L' | 'R'; pins: string[] } }) {
  const p = partByName(c.name)
  return (
    <div className={'wire-part ' + c.side} style={{ height: H - 16 }}>
      <div className="wire-part-img"><PartImg name={c.name} /></div>
      <div className="wire-part-text">
        <div className="part-label">{p?.label ?? c.name}</div>
        <div className="wire-pins">{c.pins.map((pin) => <code key={pin}>{pin}</code>)}</div>
      </div>
    </div>
  )
}
