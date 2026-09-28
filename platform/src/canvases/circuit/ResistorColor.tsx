import { useState } from 'react'

// 色环电阻读数练习：拨四个色环，看阻值。
const COLORS = [
  { n: '黑', v: 0, c: '#111' }, { n: '棕', v: 1, c: '#7a4a1e' }, { n: '红', v: 2, c: '#d0312d' }, { n: '橙', v: 3, c: '#f28c28' },
  { n: '黄', v: 4, c: '#f2d02b' }, { n: '绿', v: 5, c: '#2e9e4f' }, { n: '蓝', v: 6, c: '#2b6fd0' }, { n: '紫', v: 7, c: '#8e44ad' },
  { n: '灰', v: 8, c: '#8a8a8a' }, { n: '白', v: 9, c: '#f2f2f2' },
]
const TOL = [{ n: '金', t: '±5%', c: '#d4af37' }, { n: '银', t: '±10%', c: '#c0c0c0' }]

function fmt(ohm: number) {
  if (ohm >= 1e6) return (ohm / 1e6).toFixed(ohm % 1e6 ? 1 : 0) + ' MΩ'
  if (ohm >= 1e3) return (ohm / 1e3).toFixed(ohm % 1e3 ? 1 : 0) + ' kΩ'
  return ohm + ' Ω'
}

export function ResistorColor() {
  const [b, setB] = useState([2, 2, 1, 0]) // 红红棕金 = 220Ω
  const ohm = (b[0] * 10 + b[1]) * 10 ** b[2]
  const set = (i: number, v: number) => setB(b.map((x, j) => (j === i ? v : x)))
  return (
    <div className="canvas circuit">
      <div className="canvas-head"><span className="canvas-title">▣ 色环电阻 · 套件里那一堆小条条怎么认</span></div>
      <div className="circuit-body">
        <svg viewBox="0 0 320 90" className="circuit-svg small">
          <line x1={0} y1={45} x2={320} y2={45} stroke="#8b93a7" strokeWidth={3} />
          <rect x={70} y={22} width={180} height={46} rx={20} fill="#c8a978" />
          {[0, 1, 2].map((i) => <rect key={i} x={95 + i * 32} y={22} width={12} height={46} fill={COLORS[b[i]].c} />)}
          <rect x={215} y={22} width={12} height={46} fill={TOL[b[3]].c} />
        </svg>
        <div className="circuit-text">
          <div className="resistor-value">{fmt(ohm)} <span className="muted">{TOL[b[3]].t}</span></div>
          <div className="bands">
            {[0, 1, 2].map((i) => (
              <div key={i} className="band-picker">
                <div className="muted small">{['第一位', '第二位', '乘 10 的几次方'][i]}</div>
                <div className="swatches">{COLORS.map((c) => <button key={c.n} title={c.n + '=' + c.v} className={'swatch' + (b[i] === c.v ? ' on' : '')} style={{ background: c.c }} onClick={() => set(i, c.v)} />)}</div>
              </div>
            ))}
            <div className="band-picker">
              <div className="muted small">误差</div>
              <div className="swatches">{TOL.map((c, k) => <button key={c.n} title={c.n} className={'swatch' + (b[3] === k ? ' on' : '')} style={{ background: c.c }} onClick={() => set(3, k)} />)}</div>
            </div>
          </div>
          <p className="muted">LED 限流一般用 220Ω～1kΩ（红红棕 / 棕黑红）。按键上拉用 10kΩ（棕黑橙）。记这两个就够了，别的用万用表量。</p>
        </div>
      </div>
    </div>
  )
}
