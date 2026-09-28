import { useMemo, useState } from 'react'
import { BOTTOM, FUNC_COLORS, LEFT, RIGHT, funcFamily, type PinInfo } from './bluepill'

// 交互式蓝药丸引脚图：点功能过滤，悬停看引脚说明。
const FILTERS = ['全部', 'GPIO', 'PWM', 'ADC', 'UART', 'I2C', 'SPI', 'SWD', '电源']

export function Pinout({ highlight }: { highlight?: string }) {
  const [filter, setFilter] = useState(highlight ?? '全部')
  const [hover, setHover] = useState<PinInfo | null>(null)
  const match = (p: PinInfo) => filter === '全部' || p.funcs.some((f) => funcFamily(f) === filter)

  const W = 560, H = 600, pitch = 24, top = 60
  const pinEl = (p: PinInfo, i: number, side: 'L' | 'R') => {
    const y = top + i * pitch
    const x = side === 'L' ? 150 : W - 150
    const on = match(p)
    const color = FUNC_COLORS[funcFamily(p.funcs.find((f) => filter === '全部' || funcFamily(f) === filter) ?? p.funcs[0])]
    return (
      <g key={side + i} onMouseEnter={() => setHover(p)} onMouseLeave={() => setHover(null)} style={{ cursor: 'pointer' }} opacity={on ? 1 : 0.18}>
        <rect x={x - 9} y={y - 9} width={18} height={18} rx={3} fill="#0a0c10" stroke={color} strokeWidth={on ? 1.5 : 1} />
        <circle cx={x} cy={y} r={4} fill={color} />
        <text x={side === 'L' ? x - 16 : x + 16} y={y + 4} fontSize={11} textAnchor={side === 'L' ? 'end' : 'start'} fill={color} fontFamily="ui-monospace, Menlo, monospace" fontWeight={600}>
          {p.name}
        </text>
        <text x={side === 'L' ? x - 60 : x + 60} y={y + 4} fontSize={9.5} textAnchor={side === 'L' ? 'end' : 'start'} fill="#5a6272" fontFamily="ui-monospace, Menlo, monospace">
          {p.funcs.filter((f) => f !== 'GPIO').slice(0, 3).join(' ')}
        </text>
      </g>
    )
  }

  const legend = useMemo(() => Object.entries(FUNC_COLORS).filter(([k]) => FILTERS.includes(k)), [])

  return (
    <div className="canvas pinout">
      <div className="canvas-head">
        <span className="canvas-title">▣ 引脚图 · STM32F103C8T6 蓝药丸</span>
        <div className="chips">
          {FILTERS.map((f) => (
            <button key={f} className={'chip' + (filter === f ? ' on' : '')} style={filter === f ? { borderColor: FUNC_COLORS[f] ?? 'var(--accent)', color: FUNC_COLORS[f] ?? 'var(--accent)' } : {}} onClick={() => setFilter(f)}>{f}</button>
          ))}
        </div>
      </div>
      <div className="pinout-body">
        <svg viewBox={`0 0 ${W} ${H}`} className="pinout-svg">
          <rect x={160} y={30} width={W - 320} height={H - 60} rx={10} fill="#10203a" stroke="#1e3a5f" strokeWidth={2} />
          <rect x={W / 2 - 30} y={210} width={60} height={60} rx={4} fill="#0a0c10" stroke="#2a2f3a" />
          <text x={W / 2} y={236} fontSize={7} textAnchor="middle" fill="#8b93a7" fontFamily="ui-monospace, Menlo, monospace">STM32</text>
          <text x={W / 2} y={246} fontSize={7} textAnchor="middle" fill="#8b93a7" fontFamily="ui-monospace, Menlo, monospace">F103C8T6</text>
          <rect x={W / 2 - 22} y={36} width={44} height={22} rx={3} fill="#2a2f3a" />
          <text x={W / 2} y={51} fontSize={8} textAnchor="middle" fill="#8b93a7" fontFamily="ui-monospace, Menlo, monospace">USB</text>
          <circle cx={W / 2 + 40} cy={90} r={5} fill={filter === '全部' || filter === 'GPIO' ? '#3ddc84' : '#1e3a5f'} style={{ filter: 'drop-shadow(0 0 4px #3ddc84)' }} />
          <text x={W / 2 + 40} y={106} fontSize={7} textAnchor="middle" fill="#3ddc84" fontFamily="ui-monospace, Menlo, monospace">PC13 LED</text>
          <rect x={W / 2 - 40} y={H - 100} width={20} height={20} rx={3} fill="#2a2f3a" /><text x={W / 2 - 30} y={H - 68} fontSize={7} textAnchor="middle" fill="#8b93a7">RESET</text>
          <text x={W / 2 + 20} y={H - 84} fontSize={7} textAnchor="middle" fill="#8b93a7">BOOT0/1</text>
          {LEFT.map((p, i) => pinEl(p, i, 'L'))}
          {RIGHT.map((p, i) => pinEl(p, i, 'R'))}
          {BOTTOM.map((p, i) => {
            const x = W / 2 - 36 + i * 24, y = H - 24
            const on = match(p), color = FUNC_COLORS[funcFamily(p.funcs[0])]
            return (
              <g key={'B' + i} onMouseEnter={() => setHover(p)} onMouseLeave={() => setHover(null)} style={{ cursor: 'pointer' }} opacity={on ? 1 : 0.18}>
                <rect x={x - 9} y={y - 9} width={18} height={18} rx={3} fill="#0a0c10" stroke={color} />
                <circle cx={x} cy={y} r={4} fill={color} />
                <text x={x} y={y - 14} fontSize={7} textAnchor="middle" fill={color} fontFamily="ui-monospace, Menlo, monospace">{p.name}</text>
              </g>
            )
          })}
        </svg>
        <aside className="pin-info">
          {hover ? (
            <>
              <div className="pin-name" style={{ color: FUNC_COLORS[funcFamily(hover.funcs[0])] }}>{hover.name}</div>
              <div className="pin-funcs">{hover.funcs.map((f) => <span key={f} className="tag" style={{ borderColor: FUNC_COLORS[funcFamily(f)], color: FUNC_COLORS[funcFamily(f)] }}>{f}</span>)}</div>
              <p>{hover.note ?? '普通 GPIO，可以做数字输入输出。'}</p>
              <div className="pin-verified">{hover.verified ? '✔ 已在真板子上验证' : '○ 未验证：数据来自原理图，等板子到了核对'}</div>
            </>
          ) : (
            <>
              <div className="pin-name muted">悬停一个引脚</div>
              <p>上面的按钮可以只看某一类功能。比如点 UART 看看串口在哪，点 I2C 看看屏幕该接哪。</p>
              <div className="legend">{legend.map(([k, c]) => <span key={k}><i style={{ background: c }} />{k}</span>)}</div>
            </>
          )}
        </aside>
      </div>
    </div>
  )
}
