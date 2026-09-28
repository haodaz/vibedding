import { useState } from 'react'

// LED 为什么要串电阻：拖动电阻，看电流。
export function LedCircuit() {
  const [r, setR] = useState(220)
  const vf = 2.0, v = 3.3
  const i = r === 0 ? 999 : Math.max(0, ((v - vf) / r) * 1000)
  const safe = i <= 20, dim = i < 2
  const glow = Math.min(1, i / 20)
  return (
    <div className="canvas circuit">
      <div className="canvas-head"><span className="canvas-title">▣ LED 为什么要串电阻</span></div>
      <div className="circuit-body">
        <svg viewBox="0 0 420 160" className="circuit-svg">
          <rect x={10} y={50} width={110} height={60} rx={6} fill="#10203a" stroke="#1e3a5f" />
          <text x={65} y={75} fill="#8b93a7" fontSize={10} textAnchor="middle" fontFamily="ui-monospace, Menlo, monospace">STM32 PA1</text>
          <text x={65} y={95} fill="#ffb454" fontSize={11} textAnchor="middle" fontFamily="ui-monospace, Menlo, monospace">HIGH = 3.3V</text>
          <line x1={120} y1={80} x2={160} y2={80} stroke="#ffb454" strokeWidth={2} />
          <rect x={160} y={68} width={70} height={24} rx={3} fill="#0a0c10" stroke={r === 0 ? '#ff5555' : '#ffb454'} strokeWidth={2} />
          <text x={195} y={84} fill="#e6e8ee" fontSize={10} textAnchor="middle" fontFamily="ui-monospace, Menlo, monospace">{r} Ω</text>
          <line x1={230} y1={80} x2={270} y2={80} stroke="#ffb454" strokeWidth={2} />
          <polygon points="270,65 270,95 300,80" fill={safe ? '#ff3b3b' : '#ff8080'} opacity={0.3 + glow * 0.7} style={{ filter: `drop-shadow(0 0 ${glow * 10}px #ff3b3b)` }} />
          <line x1={300} y1={65} x2={300} y2={95} stroke="#ff8080" strokeWidth={2} />
          <text x={285} y={115} fill="#8b93a7" fontSize={9} textAnchor="middle" fontFamily="ui-monospace, Menlo, monospace">LED 长脚→短脚</text>
          <line x1={300} y1={80} x2={350} y2={80} stroke="#8b93a7" strokeWidth={2} />
          <line x1={335} y1={80} x2={365} y2={80} stroke="#8b93a7" strokeWidth={2} /><line x1={340} y1={86} x2={360} y2={86} stroke="#8b93a7" strokeWidth={2} /><line x1={345} y1={92} x2={355} y2={92} stroke="#8b93a7" strokeWidth={2} />
          <text x={350} y={108} fill="#8b93a7" fontSize={9} textAnchor="middle">GND</text>
          {!safe && <text x={285} y={40} fill="#ff5555" fontSize={12} textAnchor="middle" fontWeight={700}>💥 {i > 100 ? '烧了' : '过流'}</text>}
        </svg>
        <div className="circuit-text">
          <label className="slider-label">限流电阻 <b>{r} Ω</b>
            <input type="range" min={0} max={2000} step={10} value={r} onChange={(e) => setR(+e.target.value)} />
          </label>
          <div className="resistor-value" style={{ color: safe ? (dim ? '#8b93a7' : '#3ddc84') : '#ff5555' }}>{i > 100 ? '>100' : i.toFixed(1)} mA</div>
          <p className="muted">电流 = (3.3V − LED 自己吃掉的 2V) ÷ 电阻。LED 舒适区 5～20 mA，超过就发热变暗直到烧毁；电阻太大又太暗。220Ω～1kΩ 是甜区。</p>
          <p className="muted">芯片引脚本身最多也就给 20 mA 左右，不串电阻等于把引脚也置于危险中。</p>
        </div>
      </div>
    </div>
  )
}
