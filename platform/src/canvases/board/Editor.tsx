import { useEffect, useRef } from 'react'
import { EditorState } from '@codemirror/state'
import { EditorView, keymap, lineNumbers, highlightActiveLine } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { cpp } from '@codemirror/lang-cpp'
import { oneDark } from '@codemirror/theme-one-dark'
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language'

export function Editor({ value, onChange, height = 320 }: { value: string; onChange: (v: string) => void; height?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  useEffect(() => {
    if (!ref.current) return
    const view = new EditorView({
      state: EditorState.create({
        doc: value,
        extensions: [
          lineNumbers(), highlightActiveLine(), history(),
          keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
          cpp(), ...(document.documentElement.dataset.theme === 'light' ? [] : [oneDark]), syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
          EditorView.updateListener.of((u) => { if (u.docChanged) onChange(u.state.doc.toString()) }),
          EditorView.theme({ '&': { height: height + 'px', fontSize: '13px' }, '.cm-scroller': { fontFamily: 'var(--mono)' } }),
        ],
      }),
      parent: ref.current,
    })
    viewRef.current = view
    return () => view.destroy()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  // 外部重置（比如"恢复初始代码"）
  useEffect(() => {
    const v = viewRef.current
    if (v && v.state.doc.toString() !== value) v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: value } })
  }, [value])
  return <div ref={ref} className="editor" />
}
