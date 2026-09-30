// 元件抽屉：正文里点一个元件 tag 就从右边滑出来。图、参数、接线、坑、相关配件、购买链接。
// 挂在 App 里一份就够，靠 window 的 'vb:part' 事件打开（tag 是注入到 HTML 里的，不是 React 节点）。

import { useEffect, useRef, useState } from 'react'
import { Markdown } from '../Markdown'
import { buyUrl, getPart, openPart, partImage, relatedParts, tagParts, usedIn, type Part } from '../parts'
import { getLang, t } from '../i18n'
import { Icon } from './Icon'
import { getPhoto, removePhoto, savePhoto, shrink, verify, type PartPhoto, type Verdict } from '../workshop/photos'

// 一段纯文本（任务卡 frontmatter 的 hardware、卡片里的零件名）也走同一套识别
export function PartText({ text }: { text: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.textContent = text
    tagParts(el)
    const onClick = (e: Event) => {
      const tag = (e.target as HTMLElement).closest('button.part-tag') as HTMLButtonElement | null
      if (tag?.dataset.part) openPart(tag.dataset.part)
    }
    el.addEventListener('click', onClick)
    return () => el.removeEventListener('click', onClick)
  }, [text])
  return <span ref={ref} />
}

export function PartDrawer() {
  const [id, setId] = useState<string | null>(null)
  useEffect(() => {
    const open = (e: Event) => setId((e as CustomEvent<string>).detail)
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setId(null) }
    window.addEventListener('vb:part', open)
    window.addEventListener('keydown', esc)
    return () => { window.removeEventListener('vb:part', open); window.removeEventListener('keydown', esc) }
  }, [])
  if (!id) return null
  const part = getPart(id)
  return (
    <>
      <div className="part-scrim" onClick={() => setId(null)} />
      <aside className="part-drawer" role="dialog" aria-label={part?.name ?? id}>
        <button className="part-close" onClick={() => setId(null)} aria-label={t('part.close')}><Icon name="x" size={16} /></button>
        {part ? <PartBody part={part} onPick={setId} /> : <div className="part-empty">{t('part.missing')}</div>}
      </aside>
    </>
  )
}

function Row({ label, value }: { label: string; value?: string }) {
  if (!value || value === '—') return null
  return <div className="part-row"><span>{label}</span><div>{value}</div></div>
}

// 顶部图区：AI 示意图（PGC）和用户自己拍的实物照（UGC）并存，有实物照就默认显示实物照。
// 传照片时先让 AI 核对"这真的是它吗"，但不硬拦——模型看走眼是常事，最后由用户拍板。
function PartHero({ part, illustration }: { part: Part; illustration: string | null }) {
  const [photo, setPhoto] = useState<PartPhoto | null>(null)
  const [tab, setTab] = useState<'mine' | 'art'>('art')
  const [busy, setBusy] = useState(false)
  const [pending, setPending] = useState<{ src: string; v: Verdict } | null>(null)
  const file = useRef<HTMLInputElement>(null)

  useEffect(() => { getPhoto(part.id).then((p) => { setPhoto(p); setTab(p ? 'mine' : 'art') }) }, [part.id])

  async function onPick(f: File | undefined) {
    if (!f) return
    setBusy(true)
    try {
      const src = await shrink(f)
      const v = await verify({ name: part.name, expect: part.note, pins: part.pins, image: src, lang: getLang() })
      if (!v) {                                   // 没有后端或核验失败：照存不误
        await keep({ src, at: new Date().toISOString(), verdict: 'skipped' })
      } else if (v.match === true) {
        await keep({ src, at: new Date().toISOString(), verdict: 'yes', says: v.says })
      } else {
        setPending({ src, v })                    // 存疑：让用户看 AI 怎么说，自己决定
      }
    } catch { /* 读图失败，什么也不做 */ }
    finally { setBusy(false); if (file.current) file.current.value = '' }
  }
  async function keep(p: PartPhoto) { await savePhoto(part.id, p); setPhoto(p); setTab('mine'); setPending(null) }
  async function drop() { await removePhoto(part.id); setPhoto(null); setTab('art') }

  const showMine = tab === 'mine' && photo
  return (
    <>
      <div className="part-hero">
        {showMine ? <img src={photo!.src} alt="" />
          : illustration ? <img src={illustration} alt="" />
          : <div className="part-noimg"><Icon name="chip" size={28} /></div>}
        {photo && <div className="part-hero-tabs">
          <button className={tab === 'mine' ? 'on' : ''} onClick={() => setTab('mine')}>{t('part.mine')}</button>
          <button className={tab === 'art' ? 'on' : ''} onClick={() => setTab('art')}>{t('part.art')}</button>
        </div>}
      </div>

      {showMine && photo!.verdict === 'yes' && <p className="part-verdict ok"><Icon name="check" size={13} /> {photo!.says || t('part.ok')}</p>}
      {showMine && photo!.keptAnyway && <p className="part-verdict warn"><Icon name="alert" size={13} /> {t('part.kept')}{photo!.says ? ' ' + photo!.says : ''}</p>}

      {pending && (
        <div className="part-check">
          <img src={pending.src} alt="" />
          <div>
            <p><Icon name="alert" size={13} /> {pending.v.match === false ? t('part.no') : t('part.unsure')}</p>
            <p className="muted">{pending.v.says}{pending.v.looks_like ? ` ${t('part.lookslike')}${pending.v.looks_like}` : ''}</p>
            <div className="chips">
              <button className="chip" onClick={() => setPending(null)}>{t('part.retake')}</button>
              <button className="chip" onClick={() => keep({ src: pending.src, at: new Date().toISOString(), verdict: pending.v.match === false ? 'no' : 'unsure', says: pending.v.says, looksLike: pending.v.looks_like, keptAnyway: true })}>{t('part.keep')}</button>
            </div>
          </div>
        </div>
      )}

      <div className="part-photo-bar">
        <input ref={file} type="file" accept="image/*" hidden onChange={(e) => onPick(e.target.files?.[0])} />
        <button className="linkbtn" disabled={busy} onClick={() => file.current?.click()}>
          <Icon name="camera" size={13} /> {busy ? t('part.checking') : photo ? t('part.replace') : t('part.add')}
        </button>
        {photo && <button className="linkbtn" onClick={drop}>{t('part.drop')}</button>}
      </div>
    </>
  )
}

function PartBody({ part, onPick }: { part: Part; onPick: (id: string) => void }) {
  const img = partImage(part.id)
  const related = relatedParts(part.id)
  const projects = usedIn(part.id)
  return (
    <div className="part-body">
      <PartHero part={part} illustration={img} />
      <div className="part-cat">{part.cat}</div>
      <h2>{part.name}</h2>
      {part.note && <p className="part-note">{part.note}</p>}

      <a className="part-buy" href={buyUrl(part)} target="_blank" rel="noopener noreferrer">
        <Icon name="cart" size={15} /> {t('part.buy')}
        {part.price && part.price !== '—' && <em>≈ ${part.price}</em>}
      </a>

      <div className="part-rows">
        <Row label={t('part.iface')} value={part.iface} />
        <Row label={t('part.volt')} value={part.volt} />
        <Row label={t('part.pins')} value={part.pins} />
        <Row label={t('part.wiring')} value={part.wiring} />
        <Row label={t('part.lib')} value={part.lib} />
      </div>

      {part.pitfalls && part.pitfalls.length > 0 && (
        <section className="part-sec">
          <h3><Icon name="alert" size={14} /> {t('part.pitfalls')}</h3>
          <ul className="part-pitfalls">{part.pitfalls.map((p, i) => <li key={i}>{p}</li>)}</ul>
        </section>
      )}

      {part.snippet && (
        <section className="part-sec">
          <h3><Icon name="code" size={14} /> {t('part.snippet')}</h3>
          <Markdown text={'```cpp\n' + part.snippet + '\n```'} />
        </section>
      )}

      {projects.length > 0 && (
        <section className="part-sec">
          <h3><Icon name="puzzle" size={14} /> {t('part.usedin')}</h3>
          <ul className="part-projects">{projects.map((p) => <li key={p.id}>{p.title}</li>)}</ul>
        </section>
      )}

      {related.length > 0 && (
        <section className="part-sec">
          <h3><Icon name="library" size={14} /> {t('part.related')}</h3>
          <div className="part-related">
            {related.map((r) => (
              <button key={r.id} className="part-chip" onClick={() => onPick(r.id)}>
                {partImage(r.id) && <img src={partImage(r.id)!} alt="" />}
                <span>{r.name}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      <p className="part-disclaimer">{t('part.disclaimer')}</p>
    </div>
  )
}
