import { useState } from 'react'
import { PartImg } from '../canvases/parts/PartImg'
import { partByName } from '../canvases/parts/catalog'
import { t, getLang } from '../i18n'
import { Icon } from '../components/Icon'
import { searchUrl } from '../parts'

export interface BomItem { id?: string; name: string; qty: number; role: string; why?: string; price: string; buy: string; have?: boolean; catalog?: boolean; optional?: boolean }
export interface BomAsk { title: string; items: BomItem[]; note?: string }

const mid = (p: string) => { const m = p.match(/(\d+(?:\.\d+)?)\s*[-~～]\s*(\d+(?:\.\d+)?)/); if (m) return (+m[1] + +m[2]) / 2; const n = parseFloat(p); return isNaN(n) ? 0 : n }

// 采购清单卡：勾"已有"，剩下的就是要买的。确认后把结果回给 AI。
export function BomCard({ ask, answer, onAnswer }: { ask: BomAsk; answer?: string; onAnswer: (s: string) => void }) {
  const [have, setHave] = useState<boolean[]>(ask.items.map((i) => !!i.have))
  const [skip, setSkip] = useState<boolean[]>(ask.items.map(() => false))
  const done = answer !== undefined
  const toBuy = ask.items.filter((_, i) => !have[i] && !skip[i])
  const total = toBuy.reduce((s, it) => s + mid(it.price) * (it.qty || 1), 0)
  const [copied, setCopied] = useState(false)
  const buyText = toBuy.map((it) => `${it.name} x${it.qty}  搜「${it.buy}」  ¥${it.price}`).join('\n')
  const confirm = () => {
    const haveList = ask.items.filter((_, i) => have[i]).map((i) => i.name)
    const skipList = ask.items.filter((_, i) => skip[i]).map((i) => i.name)
    onAnswer(`已有：${haveList.join('、') || '无'}；不要了：${skipList.join('、') || '无'}；要买：${toBuy.map((i) => `${i.name} x${i.qty}`).join('、') || '无'}；预算约 ¥${total.toFixed(0)}`)
  }
  return (
    <div className={'bom' + (done ? ' done' : '')}>
      <div className="bom-head"><span className="hcard-kind"><Icon name="cart" size={13} /> {t('bom.title')}</span><b>{ask.title}</b></div>
      <div className="bom-list">
        {ask.items.map((it, i) => {
          const sprite = it.id && partByName(it.id) ? it.id : null
          return (
            <div key={i} className={'bom-item' + (have[i] ? ' have' : '') + (skip[i] ? ' skip' : '')}>
              <div className="bom-img">{sprite ? <PartImg name={sprite} /> : <span className="bom-noimg">▫</span>}</div>
              <div className="bom-main">
                <div className="bom-name"><b>{it.name}</b>{it.optional && <span className="tag opt">{t('bom.opt')}</span>}{it.catalog === false && <span className="tag warn">{t('bom.check')}</span>}</div>
                <div className="bom-role">{it.role}</div>
                <div className="muted small">
                  <a className="bom-buy" href={searchUrl(it.buy)} target="_blank" rel="noopener noreferrer">
                    <Icon name="cart" size={12} /> {t('bom.find')}
                  </a>
                  {it.why ? ' · ' + it.why : ''}
                </div>
              </div>
              <div className="bom-right">
                <div className="mono">{getLang() === 'en' ? '$' : '¥'}{it.price}{it.qty > 1 ? ` × ${it.qty}` : ''}</div>
                <label><input type="checkbox" checked={have[i]} disabled={done} onChange={(e) => setHave(have.map((h, j) => (j === i ? e.target.checked : h)))} />{t('bom.have')}</label>
                <label><input type="checkbox" checked={skip[i]} disabled={done} onChange={(e) => setSkip(skip.map((h, j) => (j === i ? e.target.checked : h)))} />{t('bom.skip')}</label>
              </div>
            </div>
          )
        })}
      </div>
      {ask.note && <p className="hcard-expect"><Icon name="alert" size={14} /> {ask.note}</p>}
      <div className="bom-foot">
        <div className="bom-total">{t('bom.tobuy')} <b>{toBuy.length}</b> {t('bom.items')} · {t('bom.budget')} <b>{getLang() === 'en' ? '$' : '¥'}{total.toFixed(0)}</b><span className="muted small">{t('bom.mid')}</span></div>
        {done ? <div className="hcard-answer"><Icon name="check" size={14} /> {answer}</div> : (
          <div className="chips">
            <button className="chip" onClick={async () => { await navigator.clipboard.writeText(buyText); setCopied(true); setTimeout(() => setCopied(false), 1200) }}>{copied ? t('card.copied') : t('bom.copy')}</button>
            <button className="chip primary" onClick={confirm}>{t('bom.confirm')}</button>
          </div>
        )}
      </div>
    </div>
  )
}
