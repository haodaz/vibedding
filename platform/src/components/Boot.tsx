import { useEffect, useState } from 'react'

const LINES = [
  '[    0.000] embeded v0.2 booting…',
  '[    0.012] mounting content/ …… 33 docs',
  '[    0.031] loading canvases: board pinout pullup led-circuit resistor-color',
  '[    0.058] probing /dev/cu.* …',
  '[    0.090] ready. 门槛不在知识里，在知识之前。',
]

// 每个会话第一次打开时的"开机自检"。1.4 秒，点一下跳过。
export function Boot({ onDone }: { onDone: () => void }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    if (n >= LINES.length) { const t = setTimeout(onDone, 350); return () => clearTimeout(t) }
    const t = setTimeout(() => setN(n + 1), 220)
    return () => clearTimeout(t)
  }, [n, onDone])
  return (
    <div className="boot" onClick={onDone}>
      <pre>{LINES.slice(0, n).join('\n')}<span className="caret">▮</span></pre>
    </div>
  )
}
