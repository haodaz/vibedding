// 虚拟蓝药丸：按真实板子布局画（2×20 排针、USB 在左、SWD 在右、PC13 LED 在 USB 旁、BOOT 跳线、复位键、8MHz 晶振）。
// 引脚名来自 content/hardware/bluepill-pins.json，和真板子丝印顺序一致。
import pins from '../../../../content/hardware/bluepill-pins.json'
export interface PinState { mode?: string; level?: number; pwm?: number }

const TOP = pins.left.map((p) => p.name)      // 真板子：USB 朝上时的左列 → 横放后的上排（从 USB 端数起）
const BOTTOM = pins.right.map((p) => p.name)  // 右列 → 下排
const X0 = 34, PITCH = 12.2

export function BoardSvg({ pins: st, buttonDown, onButton }: { pins: Record<string, PinState>; buttonDown: boolean; onButton: (down: boolean) => void }) {
  const pc13 = st.PC13
  const ledOn = pc13?.pwm !== undefined ? 1 - pc13.pwm / 255 : pc13?.level === 0 && pc13.mode === 'OUTPUT' ? 1 : 0
  const pinColor = (name: string) => {
    const s = st[name]; if (!s?.mode) return null
    const isIn = s.mode === 'INPUT' || s.mode === 'INPUT_PULLUP'
    const lvl = s.pwm !== undefined ? s.pwm / 255 : s.level ?? 0
    return { c: isIn ? '#39c5ff' : '#ffb454', a: 0.35 + lvl * 0.65 }
  }
  const pinRow = (names: string[], y: number, labelY: number, anchorUp: boolean) => names.map((n, i) => {
    const x = X0 + i * PITCH; const pc = pinColor(n)
    return (
      <g key={n + i}>
        <rect x={x - 3.2} y={y - 3.2} width={6.4} height={6.4} rx={1} fill="#c9a227" stroke="#8a6d12" strokeWidth={0.4} />
        <circle cx={x} cy={y} r={1.6} fill="#2b2b2b" />
        {pc && <circle cx={x} cy={y} r={4.5} fill="none" stroke={pc.c} strokeWidth={1.5} opacity={pc.a} style={{ filter: `drop-shadow(0 0 3px ${pc.c})` }} />}
        <text x={x} y={labelY} fontSize={3.6} textAnchor="middle" fill="#e8ecf4" fontFamily="var(--mono)" transform={`rotate(${anchorUp ? -90 : 90} ${x} ${labelY})`}>{n}</text>
      </g>
    )
  })
  return (
    <svg viewBox="0 0 300 180" className="board-svg">
      <defs>
        <filter id="glow"><feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        <linearGradient id="pcb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1d3f8a" /><stop offset="1" stopColor="#12306e" /></linearGradient>
      </defs>
      {/* PCB */}
      <rect x={18} y={38} width={264} height={104} rx={4} fill="url(#pcb)" stroke="#0b1d45" strokeWidth={1.5} />
      {[22, 278].map((x) => [42, 138].map((y) => <circle key={x + '-' + y} cx={x} cy={y} r={2.6} fill="#0b1020" stroke="#c9a227" strokeWidth={1} />))}
      {/* 走线装饰 */}
      {[60, 100, 140, 180, 220].map((x) => <path key={x} d={`M${x},60 h14 v8 h10`} stroke="#2a56b0" strokeWidth={0.8} fill="none" opacity={0.7} />)}
      {/* USB 口（左端） */}
      <rect x={4} y={74} width={30} height={32} rx={2} fill="#9aa3b2" stroke="#5c6470" />
      <rect x={8} y={80} width={22} height={20} rx={1.5} fill="#3a4250" />
      <text x={19} y={116} fontSize={4} textAnchor="middle" fill="#e8ecf4" fontFamily="var(--mono)">USB</text>
      {/* 芯片 */}
      <rect x={130} y={72} width={40} height={40} rx={2} fill="#151515" stroke="#333" />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <g key={i}><rect x={131 + i * 5} y={68} width={2} height={4} fill="#aaa" /><rect x={131 + i * 5} y={112} width={2} height={4} fill="#aaa" /><rect x={126} y={73 + i * 5} width={4} height={2} fill="#aaa" /><rect x={170} y={73 + i * 5} width={4} height={2} fill="#aaa" /></g>)}
      <text x={150} y={90} fontSize={5} textAnchor="middle" fill="#8b93a7" fontFamily="var(--mono)">STM32</text>
      <text x={150} y={97} fontSize={4} textAnchor="middle" fill="#8b93a7" fontFamily="var(--mono)">F103C8T6</text>
      <circle cx={134} cy={76} r={1} fill="#666" />
      {/* 晶振 8MHz + 32k */}
      <rect x={104} y={78} width={16} height={7} rx={3.5} fill="#c0c4cc" stroke="#7a8090" /><text x={112} y={92} fontSize={3.5} textAnchor="middle" fill="#8b93a7" fontFamily="var(--mono)">8MHz</text>
      <rect x={106} y={98} width={8} height={4} rx={2} fill="#c0c4cc" stroke="#7a8090" />
      {/* BOOT 跳线 */}
      {[0, 1].map((i) => <g key={i}><rect x={52} y={72 + i * 14} width={22} height={7} rx={1} fill="#1a1a1a" /><rect x={53} y={73 + i * 14} width={9} height={5} fill="#f2c200" /><text x={80} y={78 + i * 14} fontSize={3.8} fill="#e8ecf4" fontFamily="var(--mono)">BOOT{1 - i}</text></g>)}
      {/* 复位键 */}
      <g><rect x={46} y={102} width={14} height={14} rx={2} fill="#2a2f3a" stroke="#4a5060" /><circle cx={53} cy={109} r={4} fill="#1a1a1a" /><text x={53} y={124} fontSize={3.6} textAnchor="middle" fill="#e8ecf4" fontFamily="var(--mono)">RESET</text></g>
      {/* PWR LED（红） */}
      <rect x={40} y={56} width={5} height={3} rx={0.5} fill="#ff5c5c" style={{ filter: 'drop-shadow(0 0 3px #ff5c5c)' }} />
      <text x={42.5} y={53} fontSize={3.4} textAnchor="middle" fill="#ff8080" fontFamily="var(--mono)">PWR</text>
      {/* PC13 LED（绿，低电平亮） */}
      <rect x={40} y={64} width={5} height={3} rx={0.5} fill={ledOn > 0.05 ? '#3ddc84' : '#1f4d33'} opacity={0.35 + ledOn * 0.65} filter={ledOn > 0.05 ? 'url(#glow)' : undefined} />
      <text x={42.5} y={71} fontSize={3.4} textAnchor="middle" fill="#3ddc84" fontFamily="var(--mono)">PC13</text>
      {/* SWD 4 针（右端，竖排） */}
      {['3.3', 'DIO', 'CLK', 'GND'].map((n, i) => <g key={n}><rect x={268} y={64 + i * 12} width={6} height={6} rx={1} fill="#c9a227" stroke="#8a6d12" strokeWidth={0.4} /><circle cx={271} cy={67 + i * 12} r={1.4} fill="#2b2b2b" /><text x={264} y={69 + i * 12} fontSize={3.2} textAnchor="end" fill="#e8ecf4" fontFamily="var(--mono)">{n}</text></g>)}
      {/* 两排排针 */}
      {pinRow(TOP, 44, 32, true)}
      {pinRow(BOTTOM, 136, 150, false)}
      {/* 外接按键（接 PA0 与 GND） */}
      <g onMouseDown={() => onButton(true)} onMouseUp={() => onButton(false)} onMouseLeave={() => onButton(false)} style={{ cursor: 'pointer' }}>
        <path d={`M${X0 + 4 * PITCH},136 v22 h60`} stroke="#ffb454" strokeWidth={1.2} fill="none" opacity={0.8} />
        <rect x={190} y={150} width={24} height={24} rx={4} fill={buttonDown ? '#ffb454' : '#1e222b'} stroke="#ffb454" strokeWidth={1.5} />
        <circle cx={202} cy={162} r={6} fill={buttonDown ? '#0a0f1e' : '#ffb454'} />
        <text x={230} y={160} fontSize={4} fill="#ffb454" fontFamily="var(--mono)">PA0</text>
        <text x={230} y={167} fontSize={4} fill="#ffb454" fontFamily="var(--mono)">→ GND</text>
      </g>
    </svg>
  )
}
