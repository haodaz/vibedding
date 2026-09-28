import { useState } from 'react'

// 场景图。优先用 /art/<name>.jpg（tools/gen-art.mjs 生成）；没有的话画一张程序生成的"电路夜景"顶上。
// 这样没跑过美术生成的人打开平台也不会是一片黑。
export function Scene({ name, className = '', children }: { name: string; className?: string; children?: React.ReactNode }) {
  const [missing, setMissing] = useState(false)
  return (
    <div className={'scene ' + className} data-scene={name}>
      {!missing ? <img src={`/art/${name}.jpg`} alt="" onError={() => setMissing(true)} /> : <Procedural seed={name} />}
      <div className="scene-shade" />
      {children && <div className="scene-content">{children}</div>}
    </div>
  )
}

export function NpcImage({ name, className = '' }: { name: string; className?: string }) {
  const [missing, setMissing] = useState(false)
  if (missing) return <div className={'npc-fallback ' + className}>◎</div>
  return <img className={'npc ' + className} src={`/art/${name}.png`} alt="" onError={() => setMissing(true)} />
}

// 程序生成：按名字定一个色相，画电路走线 + 焊盘 + 光斑
function hash(s: string) { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) } return h >>> 0 }
function Procedural({ seed }: { seed: string }) {
  const h = hash(seed)
  const rnd = (i: number) => ((h * (i + 1) * 2654435761) >>> 0) / 4294967295
  const hue = 150 + (h % 90)   // 150~240：绿到蓝
  const traces = Array.from({ length: 14 }, (_, i) => {
    const y = 20 + rnd(i) * 160, x0 = rnd(i + 20) * 200, len = 80 + rnd(i + 40) * 300, bend = rnd(i + 60) > 0.5
    const x1 = x0 + len, y1 = bend ? y + (rnd(i + 80) - 0.5) * 60 : y
    return <path key={i} d={`M${x0},${y} H${(x0 + x1) / 2} L${x1},${y1}`} stroke={`hsl(${hue},70%,60%)`} strokeWidth={1.2} fill="none" opacity={0.18 + rnd(i + 100) * 0.3} />
  })
  const pads = Array.from({ length: 30 }, (_, i) => <circle key={i} cx={rnd(i + 200) * 480} cy={rnd(i + 300) * 200} r={1.6 + rnd(i + 400) * 2} fill={`hsl(${hue + 30},80%,70%)`} opacity={0.3 + rnd(i + 500) * 0.5} />)
  return (
    <svg viewBox="0 0 480 200" preserveAspectRatio="xMidYMid slice" className="scene-proc">
      <defs>
        <radialGradient id={'g' + h} cx="70%" cy="30%" r="70%"><stop offset="0" stopColor={`hsl(${hue},60%,22%)`} /><stop offset="1" stopColor="#0b1020" /></radialGradient>
        <radialGradient id={'l' + h} cx="50%" cy="50%" r="50%"><stop offset="0" stopColor={`hsl(${hue},90%,65%)`} stopOpacity=".55" /><stop offset="1" stopColor={`hsl(${hue},90%,65%)`} stopOpacity="0" /></radialGradient>
      </defs>
      <rect width="480" height="200" fill={`url(#g${h})`} />
      {traces}{pads}
      <rect x={300 + rnd(7) * 80} y={60 + rnd(8) * 60} width={90} height={50} rx={5} fill="#12305a" stroke={`hsl(${hue},60%,50%)`} strokeWidth={1} opacity=".9" />
      <rect x={330 + rnd(7) * 80} y={75 + rnd(8) * 60} width={30} height={22} rx={2} fill="#070a12" />
      <circle cx={380 + rnd(7) * 80} cy={70 + rnd(8) * 60} r={40} fill={`url(#l${h})`} />
      <circle cx={380 + rnd(7) * 80} cy={70 + rnd(8) * 60} r={3} fill="#3ddc84" />
    </svg>
  )
}
