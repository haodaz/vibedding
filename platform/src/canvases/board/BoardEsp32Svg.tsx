// 虚拟 Freenove ESP32-WROVER：按扩展板丝印的两排引脚画，LED 在 GPIO2（高电平亮），BOOT 键接 GPIO0。
import { getJson } from '../../content'
import type { PinState } from './BoardSvg'

interface PinRow { name: string; funcs: string[] }
const X0 = 30, PITCH = 12.6

export function BoardEsp32Svg({ pins: st, buttonDown, onButton }: { pins: Record<string, PinState>; buttonDown: boolean; onButton: (down: boolean) => void }) {
  const prof = getJson<{ left: PinRow[]; right: PinRow[] }>('hardware/boards/esp32_wrover.json')
  const TOP = (prof?.left ?? []).map((p) => p.name), BOTTOM = (prof?.right ?? []).map((p) => p.name)
  const led = st['2']
  const ledOn = led?.pwm !== undefined ? led.pwm / 255 : led?.level === 1 && led.mode === 'OUTPUT' ? 1 : 0
  const pinColor = (name: string) => {
    const key = name.split('/')[0]; const s = st[key]; if (!s?.mode) return null
    const isIn = s.mode === 'INPUT' || s.mode === 'INPUT_PULLUP'
    const lvl = s.pwm !== undefined ? s.pwm / 255 : s.level ?? 0
    return { c: isIn ? '#39c5ff' : '#ffb454', a: 0.35 + lvl * 0.65 }
  }
  const row = (names: string[], y: number, labelY: number, up: boolean) => names.map((n, i) => {
    const x = X0 + i * PITCH; const pc = pinColor(n)
    return (
      <g key={n + i}>
        <rect x={x - 3.2} y={y - 3.2} width={6.4} height={6.4} rx={1} fill="#c9a227" stroke="#8a6d12" strokeWidth={0.4} />
        <circle cx={x} cy={y} r={1.6} fill="#2b2b2b" />
        {pc && <circle cx={x} cy={y} r={4.5} fill="none" stroke={pc.c} strokeWidth={1.5} opacity={pc.a} style={{ filter: `drop-shadow(0 0 3px ${pc.c})` }} />}
        <text x={x} y={labelY} fontSize={3.4} textAnchor="middle" fill="#e8ecf4" fontFamily="var(--mono)" transform={`rotate(${up ? -90 : 90} ${x} ${labelY})`}>{n}</text>
      </g>
    )
  })
  return (
    <svg viewBox="0 0 300 180" className="board-svg">
      <defs><filter id="glow2"><feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter></defs>
      {/* 黑色 PCB */}
      <rect x={18} y={36} width={266} height={108} rx={4} fill="#151821" stroke="#0a0c12" strokeWidth={1.5} />
      {[22, 280].map((x) => [40, 140].map((y) => <circle key={x + '-' + y} cx={x} cy={y} r={2.6} fill="#0b1020" stroke="#c9a227" strokeWidth={1} />))}
      {/* USB-C（左端） */}
      <rect x={4} y={78} width={26} height={24} rx={5} fill="#9aa3b2" stroke="#5c6470" /><rect x={8} y={84} width={18} height={12} rx={4} fill="#3a4250" />
      <text x={17} y={112} fontSize={4} textAnchor="middle" fill="#e8ecf4" fontFamily="var(--mono)">USB-C</text>
      {/* WROVER 模组（银色屏蔽罩） */}
      <rect x={170} y={54} width={90} height={72} rx={3} fill="#c8ccd6" stroke="#8a919e" /><rect x={176} y={60} width={78} height={60} rx={2} fill="#b4b9c4" />
      <text x={215} y={86} fontSize={6} textAnchor="middle" fill="#3a4250" fontFamily="var(--mono)" fontWeight={700}>ESP32</text>
      <text x={215} y={95} fontSize={5} textAnchor="middle" fill="#3a4250" fontFamily="var(--mono)">WROVER</text>
      <path d="M262,60 h14 v60" stroke="#8a919e" strokeWidth={2} fill="none" />{/* 天线 */}
      {/* 摄像头 */}
      <rect x={92} y={62} width={40} height={40} rx={4} fill="#22262f" stroke="#3a3f4a" /><circle cx={112} cy={82} r={10} fill="#0a0c12" stroke="#4a5060" /><circle cx={112} cy={82} r={5} fill="#1e2a44" /><circle cx={109} cy={79} r={1.5} fill="#8fb3ff" opacity={0.8} />
      <text x={112} y={110} fontSize={3.6} textAnchor="middle" fill="#8b93a7" fontFamily="var(--mono)">OV2640</text>
      {/* CH340 + 按键 */}
      <rect x={44} y={58} width={16} height={10} rx={1} fill="#1a1a1a" stroke="#333" /><text x={52} y={74} fontSize={3.4} textAnchor="middle" fill="#8b93a7" fontFamily="var(--mono)">CH340</text>
      <g><rect x={40} y={108} width={12} height={12} rx={2} fill="#2a2f3a" stroke="#4a5060" /><circle cx={46} cy={114} r={3.5} fill="#1a1a1a" /><text x={46} y={127} fontSize={3.2} textAnchor="middle" fill="#e8ecf4" fontFamily="var(--mono)">EN</text></g>
      <g onMouseDown={() => onButton(true)} onMouseUp={() => onButton(false)} onMouseLeave={() => onButton(false)} style={{ cursor: 'pointer' }}>
        <rect x={60} y={108} width={12} height={12} rx={2} fill={buttonDown ? '#ffb454' : '#2a2f3a'} stroke="#ffb454" /><circle cx={66} cy={114} r={3.5} fill={buttonDown ? '#0a0f1e' : '#1a1a1a'} /><text x={66} y={127} fontSize={3.2} textAnchor="middle" fill="#ffb454" fontFamily="var(--mono)">BOOT(0)</text>
      </g>
      {/* 电源灯（红）和 GPIO2 蓝灯 */}
      <rect x={70} y={62} width={5} height={3} rx={0.5} fill="#ff5c5c" style={{ filter: 'drop-shadow(0 0 3px #ff5c5c)' }} /><text x={72.5} y={59} fontSize={3.2} textAnchor="middle" fill="#ff8080" fontFamily="var(--mono)">PWR</text>
      <rect x={70} y={72} width={5} height={3} rx={0.5} fill={ledOn > 0.05 ? '#4da3ff' : '#1a2c4a'} opacity={0.35 + ledOn * 0.65} filter={ledOn > 0.05 ? 'url(#glow2)' : undefined} /><text x={72.5} y={80} fontSize={3.2} textAnchor="middle" fill="#7ab8ff" fontFamily="var(--mono)">IO2</text>
      {row(TOP, 42, 30, true)}
      {row(BOTTOM, 138, 152, false)}
    </svg>
  )
}
