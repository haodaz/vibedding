// 本地/开放模式的内容源：构建时把 content/（中文）和 content-en/（英文）打包进来。封闭构建（VITE_CLOSED=1）不会引入这个文件。
export function loadBundle(lang: 'zh' | 'en'): Record<string, string> {
  const zhMd = import.meta.glob('../../content/**/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
  const zhJson = import.meta.glob('../../content/**/*.json', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
  const enMd = import.meta.glob('../../content-en/**/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
  const enJson = import.meta.glob('../../content-en/**/*.json', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
  const strip = (m: Record<string, string>, prefix: string) => Object.fromEntries(Object.entries(m).map(([k, v]) => [k.replace(prefix, ''), v]))
  const zh = { ...strip(zhMd, '../../content/'), ...strip(zhJson, '../../content/') }
  if (lang === 'zh') return zh
  // 英文：有翻译的用翻译，没有的（日志、项目、贴图清单等）回落到中文
  return { ...zh, ...strip(enMd, '../../content-en/'), ...strip(enJson, '../../content-en/') }
}
