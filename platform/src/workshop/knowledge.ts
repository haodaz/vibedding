// 知识库检索：全部在浏览器里做。JSON 在构建时打包进前端，所以纯静态部署也能用。
// 文件由 content/knowledge/*.json 与 content/hardware/boards/*.json 提供；缺文件时工具会说明，不会崩。
type AnyRec = Record<string, unknown>
const kb = import.meta.glob('../../../content/knowledge/*.json', { eager: true, import: 'default' }) as Record<string, AnyRec>
const boards = import.meta.glob('../../../content/hardware/boards/*.json', { eager: true, import: 'default' }) as Record<string, AnyRec>
const catalog = import.meta.glob('../../../content/hardware/parts-catalog.json', { eager: true, import: 'default' }) as Record<string, AnyRec>

const pick = (m: Record<string, AnyRec>, name: string) => Object.entries(m).find(([k]) => k.endsWith('/' + name))?.[1]
const lower = (s: unknown) => String(s ?? '').toLowerCase()
const score = (hay: string, q: string) => q.split(/\s+/).filter(Boolean).reduce((n, w) => n + (hay.includes(w.toLowerCase()) ? 1 : 0), 0)
const top = <T,>(items: T[], q: string, text: (t: T) => string, n = 5) =>
  q.trim() ? items.map((it) => ({ it, s: score(lower(text(it)), q) })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s).slice(0, n).map((x) => x.it) : items.slice(0, n)

export const KNOWLEDGE_TOOLS: Record<string, (input: AnyRec) => string> = {
  search_projects({ query = '', max = 3 }) {
    const j = pick(kb, 'projects.json') as { projects?: AnyRec[] } | undefined
    if (!j?.projects) return '项目食谱库还没生成'
    const hits = top(j.projects, String(query), (p) => [p.id, p.title, p.tagline, (p.concepts as string[])?.join(' '), (p.parts as AnyRec[])?.map((x) => x.name).join(' ')].join(' '), Number(max))
    if (!hits.length) return `没有和"${query}"相近的食谱（共 ${j.projects.length} 个）。可以从零设计，但先 search_parts 确认元件。`
    return hits.map((p) => `## ${p.id} · ${p.title}（难度 ${p.difficulty}/5，${p.time}${p.hardware_free ? '，可先在虚拟板子上做' : ''}）\n${p.tagline}\n零件: ${(p.parts as AnyRec[]).map((x) => `${x.name}x${x.qty}(${x.role})`).join('；')}\n接线: ${(p.wiring as AnyRec[]).map((w) => `${w.from} → ${w.to}${w.note ? '（' + w.note + '）' : ''}`).join('；')}\n步骤: ${(p.steps as string[]).map((s, i) => `${i + 1}.${s}`).join(' ')}\nlib_deps: ${(p.lib_deps as string[]).join(', ') || '无'}\n坑: ${(p.pitfalls as string[]).join('；')}\n代码骨架:\n${p.code_skeleton}`).join('\n\n')
  },
  search_troubleshooting({ query = '', max = 3 }) {
    const j = pick(kb, 'troubleshooting.json') as { entries?: AnyRec[] } | undefined
    if (!j?.entries) return '排障库还没生成'
    const hits = top(j.entries, String(query), (e) => [e.id, e.stage, e.symptom, (e.signals as string[])?.join(' '), (e.causes as AnyRec[])?.map((c) => c.cause).join(' ')].join(' '), Number(max))
    if (!hits.length) return `排障库里没有匹配"${query}"的条目（共 ${j.entries.length} 条）。按常规思路排查：先确认供电和共地，再看接线，再看代码。`
    return hits.map((e) => `## [${e.stage}] ${e.symptom}\n信号: ${(e.signals as string[]).join(' / ')}\n${(e.causes as AnyRec[]).map((c, i) => `${i + 1}. ${c.cause}（${c.probability}）→ 验证: ${c.check} → 解决: ${c.fix}`).join('\n')}\n原理: ${e.explain}`).join('\n\n')
  },
  explain_concept({ query = '' }) {
    const j = pick(kb, 'glossary.json') as { terms?: AnyRec[] } | undefined
    if (!j?.terms) return '术语表还没生成'
    const hits = top(j.terms, String(query), (t) => [t.id, t.term, t.category, t.definition].join(' '), 2)
    if (!hits.length) return `术语表里没有"${query}"。用自己的话解释，先比喻再定义。`
    return hits.map((t) => `## ${t.term}（${t.category}）\n比喻: ${t.metaphor}\n定义: ${t.definition}\n常见误解: ${t.misconception}\n例子: ${t.example}\n相关: ${(t.related as string[]).join(', ')}`).join('\n\n')
  },
  get_snippet({ query = '', max = 2 }) {
    const j = pick(kb, 'snippets.json') as { snippets?: AnyRec[] } | undefined
    if (!j?.snippets) return '代码片段库还没生成'
    const hits = top(j.snippets, String(query), (s) => [s.id, s.title, s.topic, s.when, s.board].join(' '), Number(max))
    if (!hits.length) return `没有匹配"${query}"的片段（主题有: ${[...new Set(j.snippets.map((s) => s.topic))].join(' / ')}）`
    return hits.map((s) => `## ${s.title}（${s.topic} · ${s.board}）\n${s.when}\nlib_deps: ${(s.lib_deps as string[]).join(', ') || '无'}\n\`\`\`cpp\n${s.code}\n\`\`\`\n${s.explain}\n坑: ${(s.pitfalls as string[]).join('；')}`).join('\n\n')
  },
  list_boards() {
    const idx = pick(boards, 'index.json') as { boards?: AnyRec[] } | undefined
    if (!idx?.boards) return '板子档案只有蓝药丸（content/hardware/bluepill-pins.json）'
    return idx.boards.map((b) => `${b.id}: ${b.name} · ${b.mcu} · ${b.level} · ¥${b.price} · ${b.why}`).join('\n')
  },
  read_board_profile({ board = 'bluepill', filter = '' }) {
    const b = pick(boards, `${board}.json`) as AnyRec | undefined
    if (!b) return `没有 ${board} 的档案。用 list_boards 看有哪些。`
    const pins = ([...(b.left as AnyRec[] ?? []), ...(b.right as AnyRec[] ?? []), ...(b.bottom as AnyRec[] ?? [])]).filter((p) => !filter || (p.funcs as string[]).some((f) => f.toUpperCase().includes(String(filter).toUpperCase())))
    const pio = b.pio as AnyRec
    return `${b.name} · ${b.mcu} · ${b.core} · Flash ${b.flash} / RAM ${b.ram}\nplatformio.ini: board=${pio?.board} platform=${pio?.platform} upload_protocol=${pio?.upload_protocol}\n板载 LED: ${(b.led as AnyRec)?.pin}（${(b.led as AnyRec)?.active === 'low' ? '低' : '高'}电平亮）\n总线: ${JSON.stringify(b.buses)}\n怎么烧: ${b.flash_how}\n坑: ${(b.gotchas as string[]).join('；')}\n引脚:\n${pins.map((p) => `${p.name}: ${(p.funcs as string[]).join(', ')}${p.note ? ' — ' + p.note : ''}`).join('\n')}`
  },
  part_detail({ id = '' }) {
    const c = pick(catalog, 'parts-catalog.json') as { parts?: AnyRec[] } | undefined
    const p = c?.parts?.find((x) => x.id === id || x.id === 'part_' + id)
    if (!p) return `知识库里没有 ${id}`
    return `${p.name}\n接口 ${p.iface} · ${p.volt} · ¥${p.price} · 搜"${p.buy}"\n引脚: ${p.pins ?? '—'}\n接法: ${p.wiring ?? '—'}\n库: ${p.lib}\n坑: ${(p.pitfalls as string[] | undefined)?.join('；') ?? '—'}${p.snippet ? `\n最小代码:\n${p.snippet}` : ''}`
  },
}
