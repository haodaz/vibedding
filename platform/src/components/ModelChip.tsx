import { useEffect, useRef, useState } from 'react'
import { t } from '../i18n'

// 输入框里常驻的模型胶囊。
//
// 为什么值得占一块地方：平台的核心主张是「三层模型，按一步值多少钱分配」，
// 可这件事以前只写在 README 和 /api/status 里——用的人每天打字，一次也看不见。
// 放在这儿，顺手就把排障用 Ultra、看照片先过视觉模型这两件事讲了。
//
// 名字来自 /api/status 的 ai 字段（= 服务端真正在用的那个），不是写死的常量：
// 写死的话哪天换了模型，这里就开始撒谎。

/** nvidia/nemotron-3-super-120b-a12b → Nemotron 3 Super。认不出来的就照原样显示，别瞎猜。 */
export function shortModel(id: string): string {
  const bare = id.includes('/') ? id.slice(id.indexOf('/') + 1) : id
  const m = bare.match(/^nemotron-(\d+)-(nano|super|ultra)\b/i)
  if (m) return `Nemotron ${m[1]} ${m[2][0].toUpperCase()}${m[2].slice(1)}`
  if (/^gemma/i.test(bare)) return bare.replace(/-it$/, '')
  return bare
}

export function ModelChip({ model }: { model: string | null }) {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (!open) return
    const off = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', off)
    return () => document.removeEventListener('mousedown', off)
  }, [open])
  if (!model) return null

  return (
    <span className="modelchip-wrap" ref={box}>
      <button type="button" className={'modelchip' + (open ? ' on' : '')} onClick={() => setOpen((v) => !v)} title={model}>
        <i className="modelchip-dot" />{shortModel(model)}
      </button>
      {open && (
        <div className="modelchip-pop">
          <div className="modelchip-pop-head">{t('model.title')}</div>
          <ul>
            <li><code>{shortModel(model)}</code><span>{t('model.super')}</span></li>
            <li><code>Nemotron 3 Ultra</code><span>{t('model.ultra')}</span></li>
            <li><code>gemma-3-27b</code><span>{t('model.vision')}</span></li>
          </ul>
          <div className="modelchip-pop-foot">{t('model.via')}</div>
        </div>
      )}
    </span>
  )
}
