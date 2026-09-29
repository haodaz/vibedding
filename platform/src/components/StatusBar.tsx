import { useEffect, useState } from 'react'
import { t } from '../i18n'

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
        <span className="st warn"><i />{s === 'offline' ? t('st.nobackend') : t('st.static')}</span>
      ) : (<>
        <span className={'st ' + (board ? 'ok' : 'off')}><i />{board && st ? `${t('st.board.on')} ${st.usb[0] ?? st.ports[0]}` : t('st.board.off')}</span>
        <span className={'st ' + (st?.pio ? 'ok' : 'warn')}><i />{st?.pio ? 'PlatformIO ' + st.pio.replace(/^PlatformIO Core, version /, '') : t('st.pio.off')}</span>
      </>)}
      <span className={'st ' + (st?.ai ? 'ok' : 'off')}><i />{st?.ai ? 'AI ' + st.ai : s === 'offline' ? t('st.ai.key') : t('st.ai.none')}</span>
      <span className="st spacer" />
      <span className="st">DAY {day}</span>
      <span className="st">{t('progress')} {done}/{total}</span>
    </div>
  )
}
