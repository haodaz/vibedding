import { useState } from 'react'
import { getParts, type Part } from './catalog'
import { PartImg } from './PartImg'
import { href } from '../../router'
import { modules } from '../../content'

// 元件图鉴：网格卡片，点开看大图和说明。only 参数可以只显示几个。
export function Parts({ only }: { only?: string[] }) {
  const PARTS = getParts()
  const list = only?.length ? PARTS.filter((p) => only.includes(p.name) || only.includes(p.name.replace(/^part_/, ''))) : PARTS
  const [open, setOpen] = useState<Part | null>(null)
  const taskLink = (t: string) => {
    for (const m of modules) for (const ms of m.missions) if ((ms.fm.title ?? '').startsWith(t + ' ')) return href('/doc/' + ms.path)
    return undefined
  }
  return (
    <div className="canvas parts">
      <div className="canvas-head"><span className="canvas-title">▣ 元件图鉴 · {list.length} 件</span><span className="muted small">点一件看细节</span></div>
      <div className="parts-grid">
        {list.map((p) => (
          <button key={p.name} className={'part-card' + (open?.name === p.name ? ' on' : '')} onClick={() => setOpen(open?.name === p.name ? null : p)}>
            <div className="part-thumb"><PartImg name={p.name} /></div>
            <div className="part-label">{p.label}</div>
            <div className="part-task">任务 {p.task}</div>
          </button>
        ))}
      </div>
      {open && (
        <div className="part-detail">
          <div className="part-detail-img"><PartImg name={open.name} /></div>
          <div className="part-detail-text">
            <h3>{open.label}</h3>
            <p>{open.what}</p>
            <div className="part-detail-foot">
              {taskLink(open.task) ? <a className="chip on" href={taskLink(open.task)}>→ 任务 {open.task}</a> : <span className="chip">任务 {open.task}</span>}
              <span className="muted small">贴图由 AI 生成，仅示意；以你手里实物为准</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
