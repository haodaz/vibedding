import { useState } from 'react'
import { PartImg } from '../canvases/parts/PartImg'
import { partByName } from '../canvases/parts/catalog'

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
      <div className="bom-head"><span className="hcard-kind">🛒 采购清单</span><b>{ask.title}</b></div>
      <table className="bom-table">
        <thead><tr><th></th><th>件</th><th>用途</th><th>单价</th><th>数量</th><th>已有</th><th>不要</th></tr></thead>
        <tbody>
          {ask.items.map((it, i) => {
            const sprite = it.id && partByName(it.id) ? it.id : null
            return (
              <tr key={i} className={(have[i] ? 'have ' : '') + (skip[i] ? 'skip' : '')}>
                <td className="bom-img">{sprite ? <PartImg name={sprite} /> : <span className="bom-noimg">▫</span>}</td>
                <td><b>{it.name}</b>{it.optional && <span className="tag opt">可选</span>}{it.catalog === false && <span className="tag warn" title="不在知识库里，下单前核对">需核对</span>}<div className="muted small">搜「{it.buy}」{it.why ? ' · ' + it.why : ''}</div></td>
                <td className="bom-role">{it.role}</td>
                <td className="mono">¥{it.price}</td>
                <td className="mono">{it.qty}</td>
                <td><input type="checkbox" checked={have[i]} disabled={done} onChange={(e) => setHave(have.map((h, j) => (j === i ? e.target.checked : h)))} /></td>
                <td><input type="checkbox" checked={skip[i]} disabled={done} onChange={(e) => setSkip(skip.map((h, j) => (j === i ? e.target.checked : h)))} /></td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {ask.note && <p className="hcard-expect">⚠ {ask.note}</p>}
      <div className="bom-foot">
        <div className="bom-total">要买 <b>{toBuy.length}</b> 件 · 预算约 <b>¥{total.toFixed(0)}</b><span className="muted small">（按区间中值估）</span></div>
        {done ? <div className="hcard-answer">✔ {answer}</div> : (
          <div className="chips">
            <button className="chip" onClick={async () => { await navigator.clipboard.writeText(buyText); setCopied(true); setTimeout(() => setCopied(false), 1200) }}>{copied ? '✔ 已复制' : '⎘ 复制购物清单'}</button>
            <button className="chip primary" onClick={confirm}>就这样，记下来</button>
          </div>
        )}
      </div>
    </div>
  )
}
