import { Scene } from '../components/Scene'
import { t, useLang } from '../i18n'
import { newSessionId } from './agent'
import { href } from '../router'

// 启动卡片：四个带插图的项目入口。工作区空状态和项目空页共用。
const STARTERS = ['start_light', 'start_blink', 'start_water', 'start_station']
export function StarterCards({ onPick }: { onPick?: (text: string) => void }) {
  const lang = useLang()
  return (
    <div className="start-cards">
      {STARTERS.map((art, i) => {
        const text = t('ws.suggest.' + (i + 1), lang)
        const inner = <><Scene name={art} className="start-art" /><div className="start-text"><b>{text}</b><span className="muted small">{t('ws.start.tag.' + (i + 1), lang)}</span></div></>
        return onPick
          ? <button key={art} className="start-card" onClick={() => onPick(text)}>{inner}</button>
          : <a key={art} className="start-card" href={href('/make?p=' + newSessionId() + '&q=' + encodeURIComponent(text))}>{inner}</a>
      })}
    </div>
  )
}
