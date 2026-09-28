// 虚拟蓝药丸：LED、按键、几个可见的引脚灯。
export interface PinState { mode?: string; level?: number; pwm?: number }

export function BoardSvg({ pins, buttonDown, onButton }: { pins: Record<string, PinState>; buttonDown: boolean; onButton: (down: boolean) => void }) {
  const pc13 = pins.PC13
  // 蓝药丸 LED：低电平亮。PWM 时按占空比反过来算亮度
  const ledOn = pc13?.pwm !== undefined ? 1 - pc13.pwm / 255 : pc13?.level === 0 && pc13.mode === 'OUTPUT' ? 1 : 0
  const shown = ['PA0', 'PA1', 'PA2', 'PA3', 'PA4', 'PA5', 'PA6', 'PA7', 'PB0', 'PB1', 'PB8', 'PB9', 'PA9', 'PA10']
  return (
    <svg viewBox="0 0 300 180" className="board-svg">
      <defs>
        <filter id="glow"><feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>
      <rect x={20} y={30} width={260} height={120} rx={8} fill="#10203a" stroke="#1e3a5f" strokeWidth={2} />
      <rect x={130} y={20} width={40} height={18} rx={2} fill="#2a2f3a" /><text x={150} y={33} fontSize={7} textAnchor="middle" fill="#8b93a7" fontFamily="var(--mono)">USB</text>
      <rect x={125} y={70} width={50} height={50} rx={3} fill="#0a0c10" stroke="#2a2f3a" />
      <text x={150} y={92} fontSize={6} textAnchor="middle" fill="#5a6272" fontFamily="var(--mono)">STM32</text>
      <text x={150} y={101} fontSize={6} textAnchor="middle" fill="#5a6272" fontFamily="var(--mono)">F103C8T6</text>
      {/* 板载 LED */}
      <circle cx={200} cy={55} r={6} fill={ledOn > 0.05 ? '#3ddc84' : '#163a2a'} opacity={0.35 + ledOn * 0.65} filter={ledOn > 0.05 ? 'url(#glow)' : undefined} />
      <text x={200} y={70} fontSize={6} textAnchor="middle" fill="#3ddc84" fontFamily="var(--mono)">PC13 LED</text>
      {/* 电源灯 */}
      <circle cx={100} cy={55} r={4} fill="#ff5555" opacity={0.9} /><text x={100} y={68} fontSize={6} textAnchor="middle" fill="#ff5555" fontFamily="var(--mono)">PWR</text>
      {/* 复位键 */}
      <rect x={60} y={120} width={16} height={16} rx={2} fill="#2a2f3a" stroke="#3a3f4a" /><text x={68} y={145} fontSize={5.5} textAnchor="middle" fill="#8b93a7">RST</text>
      {/* 外接按键（接 PA0，接地）*/}
      <g onMouseDown={() => onButton(true)} onMouseUp={() => onButton(false)} onMouseLeave={() => onButton(false)} style={{ cursor: 'pointer' }}>
        <rect x={228} y={110} width={30} height={30} rx={5} fill={buttonDown ? '#ffb454' : '#1e222b'} stroke="#ffb454" strokeWidth={1.5} />
        <circle cx={243} cy={125} r={7} fill={buttonDown ? '#0a0c10' : '#ffb454'} />
        <text x={243} y={158} fontSize={6} textAnchor="middle" fill="#ffb454" fontFamily="var(--mono)">按键→PA0→GND</text>
      </g>
      {/* 引脚灯排 */}
      {shown.map((p, i) => {
        const s = pins[p]
        const lvl = s?.pwm !== undefined ? s.pwm / 255 : s?.level ?? 0
        const isIn = s?.mode === 'INPUT' || s?.mode === 'INPUT_PULLUP'
        const c = isIn ? '#39c5ff' : s?.mode === 'OUTPUT' ? '#ffb454' : '#2a2f3a'
        return (
          <g key={p}>
            <rect x={30 + i * 17} y={158} width={12} height={12} rx={2} fill={c} opacity={s?.mode ? 0.25 + lvl * 0.75 : 0.5} />
            <text x={36 + i * 17} y={177} fontSize={5} textAnchor="middle" fill="#5a6272" fontFamily="var(--mono)">{p}</text>
          </g>
        )
      })}
    </svg>
  )
}
