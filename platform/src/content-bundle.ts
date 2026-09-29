// 本地/开放模式的内容源：构建时把 content/ 打包进来。封闭构建（VITE_CLOSED=1）不会引入这个文件。
export function loadBundle(): Record<string, string> {
  const md = import.meta.glob('../../content/**/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
  const json = import.meta.glob('../../content/**/*.json', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries({ ...md, ...json })) out[k.replace(/^\.\.\/\.\.\/content\//, '')] = v
  return out
}
