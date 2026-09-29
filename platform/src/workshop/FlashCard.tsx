import { useState } from 'react'
import { flashBuild, webSerialSupported, type Build } from '../flash'
import { t, getLang } from '../i18n'
import { Icon } from '../components/Icon'
import { PartImg } from '../canvases/parts/PartImg'

// 烧录卡：告诉用户怎么进烧录模式，点按钮选串口、烧、看进度。结果回给 AI。
export function FlashCard({ build, note, answer, onAnswer }: { build: Build | null; note?: string; answer?: string; onAnswer: (s: string) => void }) {
  const [pct, setPct] = useState(-2); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false); const [log, setLog] = useState<string[]>([])
  const en = getLang() === 'en'
  const esp = build?.platform === 'espressif32'
  const done = answer !== undefined
  const run = async () => {
    if (!build) return
    setBusy(true); setPct(0); setLog([])
    try {
      const r = await flashBuild(build, (p, m) => { if (p >= 0) setPct(p); setMsg(m); setLog((l) => [...l.slice(-8), m]) })
      onAnswer(en ? `Flashed OK: ${r.bytes} bytes.` : `烧录成功：${r.bytes} 字节。`)
    } catch (e) {
      const m = (e as Error).message
      setMsg(m); setLog((l) => [...l, '✘ ' + m])
      if (!/requestPort|No port selected|cancel/i.test(m)) onAnswer(en ? `Flash failed: ${m}` : `烧录失败：${m}`)
    } finally { setBusy(false) }
  }
  return (
    <div className={'hcard flash' + (done ? ' done' : '')}>
      <div className="hcard-head"><span className="hcard-kind"><Icon name="bolt" size={13} /> {t('flash.kind')}</span><b>{t('flash.title')}{build ? ` · ${build.board}` : ''}</b></div>
      {build && <p className="muted small">{t('flash.built')} {build.images.map((i) => `${i.name} ${(i.size / 1024).toFixed(1)} KB`).join(' · ')}{build.flash ? ` · Flash ${build.flash}%` : ''}</p>}
      {!webSerialSupported() && <p className="hcard-safety"><Icon name="alert" size={14} /> {t('flash.nosupport')}</p>}
      {esp ? (
        <ol className="hcard-steps"><li>{t('flash.esp.1')}</li><li>{t('flash.esp.2')}</li></ol>
      ) : (
        <>
          <div className="hcard-parts"><div className="hcard-part"><div className="hcard-part-img"><PartImg name="usb_serial" /></div><span>USB-TTL</span></div><div className="hcard-part"><div className="hcard-part-img"><PartImg name="bluepill" /></div><span>Blue Pill</span></div></div>
          <ol className="hcard-steps"><li>{t('flash.stm.1')}</li><li>{t('flash.stm.2')}</li><li>{t('flash.stm.3')}</li><li>{t('flash.stm.4')}</li></ol>
        </>
      )}
      {note && <p className="hcard-expect"><Icon name="info" size={14} /> {note}</p>}
      {pct >= 0 && <div className="flash-progress"><div className="bar"><div className="bar-fill" style={{ width: pct + '%' }} /></div><span className="mono small">{pct}%</span></div>}
      {log.length > 0 && <pre className="tool-out small">{log.join('\n')}</pre>}
      {done ? <div className="hcard-answer"><Icon name="check" size={14} /> {answer}</div> : (
        <div className="hcard-actions">
          <button className="chip primary" disabled={busy || !build || !webSerialSupported()} onClick={run}><Icon name="bolt" size={14} /> {busy ? t('flash.busy') : t('flash.go')}</button>
          <button className="chip" onClick={() => onAnswer(en ? 'Skipped flashing for now.' : '先不烧了')}>{t('flash.skip')}</button>
          {msg && !busy && <span className="muted small">{msg}</span>}
        </div>
      )}
    </div>
  )
}
