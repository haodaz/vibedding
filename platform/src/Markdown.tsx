import { marked } from 'marked'
import hljs from 'highlight.js/lib/core'
import cpp from 'highlight.js/lib/languages/cpp'
import bash from 'highlight.js/lib/languages/bash'
import ini from 'highlight.js/lib/languages/ini'
import { useEffect, useMemo, useRef } from 'react'
import { Canvas, parseCanvas } from './canvases'

hljs.registerLanguage('cpp', cpp); hljs.registerLanguage('c', cpp); hljs.registerLanguage('bash', bash); hljs.registerLanguage('sh', bash); hljs.registerLanguage('ini', ini)

marked.setOptions({ gfm: true, breaks: false })
marked.use({
  renderer: {
    code({ text, lang }) {
      const l = (lang ?? '').trim()
      const html = l && hljs.getLanguage(l) ? hljs.highlight(text, { language: l }).value : escapeHtml(text)
      const label = l === 'bash' || l === 'sh' ? '终端' : l || 'text'
      return `<div class="codeblock"><div class="codeblock-head"><span>${label}</span><button class="copy" data-copy>⎘ 复制</button></div><pre><code class="hljs language-${l}">${html}</code></pre></div>`
    },
  },
})
function escapeHtml(s: string) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') }

// 把正文切成 [markdown | canvas] 段
type Seg = { kind: 'md'; text: string } | { kind: 'canvas'; block: string }
function split(text: string): Seg[] {
  const segs: Seg[] = []
  const re = /^```canvas\s*\n([\s\S]*?)^```\s*$/gm
  let last = 0, m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    if (m.index > last) segs.push({ kind: 'md', text: text.slice(last, m.index) })
    segs.push({ kind: 'canvas', block: m[1] })
    last = m.index + m[0].length
  }
  if (last < text.length) segs.push({ kind: 'md', text: text.slice(last) })
  return segs
}

// key 里带上 canvas 的 id：换到另一篇文档时同位置的 canvas 不会复用旧组件的状态
function CanvasSeg({ block }: { block: string }) {
  const spec = parseCanvas(block)
  return <Canvas key={spec.type + ':' + (spec.props.id ?? '')} spec={spec} />
}

export function Markdown({ text }: { text: string }) {
  const segs = useMemo(() => split(text), [text])
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const root = ref.current
    if (!root) return
    const onClick = async (e: Event) => {
      const btn = (e.target as HTMLElement).closest('button[data-copy]') as HTMLButtonElement | null
      if (!btn) return
      const code = btn.closest('.codeblock')?.querySelector('code')?.textContent ?? ''
      await navigator.clipboard.writeText(code)
      btn.textContent = '✔ 已复制'; setTimeout(() => (btn.textContent = '⎘ 复制'), 1200)
    }
    root.addEventListener('click', onClick)
    return () => root.removeEventListener('click', onClick)
  }, [])
  return (
    <div ref={ref} className="md">
      {segs.map((s, i) => s.kind === 'md'
        ? <article key={i} dangerouslySetInnerHTML={{ __html: marked.parse(s.text) as string }} />
        : <CanvasSeg key={i} block={s.block} />)}
    </div>
  )
}
