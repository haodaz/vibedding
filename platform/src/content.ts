// 统一读取 ../../content 下的所有 markdown。
// 约定：每个 md 文件顶部有 --- 包裹的 frontmatter（YAML 的极简子集：key: value）。

export type Frontmatter = Record<string, string>

export interface Doc {
  path: string        // 相对 content/ 的路径，例如 curriculum/01-blink/01-hello-led.md
  kind: 'curriculum' | 'journal' | 'prompts' | 'hardware' | 'other'
  slug: string        // 不带扩展名的文件名
  dir: string         // 所在目录（用于把任务归到模块）
  fm: Frontmatter
  body: string
}

const raw = import.meta.glob('../../content/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

function parseFrontmatter(text: string): { fm: Frontmatter; body: string } {
  const m = text.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/)
  if (!m) return { fm: {}, body: text }
  const fm: Frontmatter = {}
  for (const line of m[1].split('\n')) {
    const i = line.indexOf(':')
    if (i === -1) continue
    const key = line.slice(0, i).trim()
    let val = line.slice(i + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    fm[key] = val
  }
  return { fm, body: text.slice(m[0].length) }
}

export const docs: Doc[] = Object.entries(raw)
  .map(([file, text]) => {
    const path = file.replace(/^\.\.\/\.\.\/content\//, '')
    const parts = path.split('/')
    const top = parts[0]
    const kind: Doc['kind'] =
      top === 'curriculum' || top === 'journal' || top === 'prompts' || top === 'hardware' ? top : 'other'
    const filename = parts[parts.length - 1]
    const { fm, body } = parseFrontmatter(text)
    return {
      path,
      kind,
      slug: filename.replace(/\.md$/, ''),
      dir: parts.slice(0, -1).join('/'),
      fm,
      body,
    }
  })
  .filter((d) => !d.slug.startsWith('_'))   // _template.md 之类的不显示
  .sort((a, b) => a.path.localeCompare(b.path))

export function byPath(path: string): Doc | undefined {
  return docs.find((d) => d.path === path)
}

// ---- 课程结构：模块(目录) -> 任务(文件) ----
export interface Mission extends Doc {
  status: 'todo' | 'doing' | 'done'
}
export interface Module {
  dir: string
  index?: Doc               // 目录下的 index.md 是模块说明
  title: string
  missions: Mission[]
}

export const modules: Module[] = (() => {
  const map = new Map<string, Module>()
  for (const d of docs.filter((d) => d.kind === 'curriculum')) {
    const mod = map.get(d.dir) ?? { dir: d.dir, title: d.dir.split('/').pop() ?? d.dir, missions: [] }
    if (d.slug === 'index') {
      mod.index = d
      mod.title = d.fm.title ?? mod.title
    } else {
      const s = d.fm.status
      mod.missions.push({ ...d, status: s === 'done' || s === 'doing' ? s : 'todo' })
    }
    map.set(d.dir, mod)
  }
  return [...map.values()].sort((a, b) => a.dir.localeCompare(b.dir))
})()

export const journal = docs.filter((d) => d.kind === 'journal').sort((a, b) => b.slug.localeCompare(a.slug))
export const prompts = docs.filter((d) => d.kind === 'prompts')
export const hardware = docs.filter((d) => d.kind === 'hardware')
