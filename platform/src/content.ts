// 内容层。所有 markdown / JSON 都通过这里拿：本地模式来自打包的文件，封闭模式登录后从 Supabase 拉。
// 组件在 initContent() 完成前不渲染（App 里等）。

export type Frontmatter = Record<string, string>
export interface Doc { path: string; kind: 'curriculum' | 'journal' | 'prompts' | 'hardware' | 'other'; slug: string; dir: string; fm: Frontmatter; body: string }
export interface Mission extends Doc { status: 'todo' | 'doing' | 'done' }
export interface Module { dir: string; index?: Doc; title: string; missions: Mission[] }

export let raw: Record<string, string> = {}     // path -> 原文（md 与 json 都在）
export let docs: Doc[] = []
export let modules: Module[] = []
export let journal: Doc[] = []
export let prompts: Doc[] = []
export let hardware: Doc[] = []
export const byPath = (path: string) => docs.find((d) => d.path === path)
export function getJson<T = unknown>(path: string): T | null { const t = raw[path]; if (!t) return null; try { return JSON.parse(t) as T } catch { return null } }
export const listPaths = (prefix: string) => Object.keys(raw).filter((p) => p.startsWith(prefix))

function parseFrontmatter(text: string): { fm: Frontmatter; body: string } {
  const m = text.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/)
  if (!m) return { fm: {}, body: text }
  const fm: Frontmatter = {}
  for (const line of m[1].split('\n')) {
    const i = line.indexOf(':'); if (i === -1) continue
    let val = line.slice(i + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1)
    fm[line.slice(0, i).trim()] = val
  }
  return { fm, body: text.slice(m[0].length) }
}

function build(r: Record<string, string>) {
  raw = r
  docs = Object.entries(r).filter(([p]) => p.endsWith('.md')).map(([path, text]) => {
    const parts = path.split('/'); const top = parts[0]
    const kind: Doc['kind'] = top === 'curriculum' || top === 'journal' || top === 'prompts' || top === 'hardware' ? top : 'other'
    const { fm, body } = parseFrontmatter(text)
    return { path, kind, slug: parts[parts.length - 1].replace(/\.md$/, ''), dir: parts.slice(0, -1).join('/'), fm, body }
  }).filter((d) => !d.slug.startsWith('_')).sort((a, b) => a.path.localeCompare(b.path))
  const map = new Map<string, Module>()
  for (const d of docs.filter((d) => d.kind === 'curriculum')) {
    const mod = map.get(d.dir) ?? { dir: d.dir, title: d.dir.split('/').pop() ?? d.dir, missions: [] }
    if (d.slug === 'index') { mod.index = d; mod.title = d.fm.title ?? mod.title }
    else { const s = d.fm.status; mod.missions.push({ ...d, status: s === 'done' || s === 'doing' ? s : 'todo' }) }
    map.set(d.dir, mod)
  }
  modules = [...map.values()].sort((a, b) => a.dir.localeCompare(b.dir))
  journal = docs.filter((d) => d.kind === 'journal').sort((a, b) => b.slug.localeCompare(a.slug))
  prompts = docs.filter((d) => d.kind === 'prompts')
  hardware = docs.filter((d) => d.kind === 'hardware')
}

let loaded: Promise<void> | null = null
let loadedLang = ''
export function initContent(lang: 'zh' | 'en' = 'zh'): Promise<void> {
  if (loaded && loadedLang === lang) return loaded
  loadedLang = lang
  loaded = (async () => {
    if (import.meta.env.VITE_CLOSED === '1') {
      const { supabase } = await import('./auth')
      if (!supabase) throw new Error('封闭模式需要配置 Supabase')
      // 先拿中文做底，再用英文覆盖（英文没翻的条目回落到中文）
      const { data, error } = await supabase.from('content_docs').select('path,body,lang').in('lang', lang === 'en' ? ['zh', 'en'] : ['zh'])
      if (error) throw new Error('内容加载失败：' + error.message)
      const map: Record<string, string> = {}
      for (const r of (data ?? []).filter((r) => r.lang !== 'en')) map[r.path as string] = r.body as string
      for (const r of (data ?? []).filter((r) => r.lang === 'en')) map[r.path as string] = r.body as string
      build(map)
    } else {
      const { loadBundle } = await import('./content-bundle')
      build(loadBundle(lang))
    }
  })()
  return loaded
}
