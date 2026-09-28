import { useEffect, useState } from 'react'

interface Status { pio: string | null; node?: string; ports: string[]; usb: string[]; ai: string | null; mode?: string }

// 顶部状态条：像 IDE 的底栏。每 5 秒问一次本地服务，板子插上会自己亮。
export function StatusBar({ done, total }: { done: number; total: number }) {
  const [s, setS] = useState<Status | null | 'offline'>(null)
  useEffect(() => {
    let alive = true
    const tick = async () => {
      try { const r = await fetch('/api/status'); if (!(r.headers.get('content-type') ?? '').includes('json')) throw new Error('no api'); const j = await r.json(); if (alive) setS(j) } catch { if (alive) setS('offline') }
    }
    tick(); const id = setInterval(tick, 5000)
    return () => { alive = false; clearInterval(id) }
  }, [])
  const st = s && s !== 'offline' ? s : null
  const board = st ? st.usb.length || st.ports.length : 0
  const day = Math.floor((Date.now() - new Date('2026-09-28').getTime()) / 86400000)
  return (
    <div className="statusbar">
      {st?.mode === 'static' || s === 'offline' ? (
        <span className="st warn"><i />{s === 'offline' ? '纯静态 · 无后端' : '网页体验模式 · 虚拟板子'}</span>
      ) : (<>
        <span className={'st ' + (board ? 'ok' : 'off')}><i />{board && st ? `板子已连接 ${st.usb[0] ?? st.ports[0]}` : '板子未连接'}</span>
        <span className={'st ' + (st?.pio ? 'ok' : 'warn')}><i />{st?.pio ? 'PlatformIO ' + st.pio.replace(/^PlatformIO Core, version /, '') : 'PlatformIO 未安装'}</span>
      </>)}
      <span className={'st ' + (st?.ai ? 'ok' : 'off')}><i />{st?.ai ? 'AI ' + st.ai : s === 'offline' ? 'AI 需自填密钥' : 'AI 未配置'}</span>
      <span className="st spacer" />
      <span className="st">DAY {day}</span>
      <span className="st">进度 {done}/{total}</span>
    </div>
  )
}
