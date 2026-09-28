import { useState } from 'react'
import { partSrc } from './catalog'

// 元件贴图。没生成时画一个占位芯片轮廓。
export function PartImg({ name, className = '' }: { name: string; className?: string }) {
  const [missing, setMissing] = useState(false)
  if (missing) return (
    <svg viewBox="0 0 100 100" className={'part-img placeholder ' + className}>
      <rect x={20} y={28} width={60} height={44} rx={6} fill="#12305a" stroke="#39c5ff" strokeWidth={2} />
      {[0, 1, 2, 3].map((i) => <rect key={i} x={26 + i * 14} y={18} width={6} height={10} fill="#8b93a7" />)}
      {[0, 1, 2, 3].map((i) => <rect key={'b' + i} x={26 + i * 14} y={72} width={6} height={10} fill="#8b93a7" />)}
      <text x={50} y={54} fontSize={9} textAnchor="middle" fill="#8b93a7" fontFamily="var(--mono)">待生成</text>
    </svg>
  )
  return <img className={'part-img ' + className} src={partSrc(name)} alt="" onError={() => setMissing(true)} draggable={false} />
}
