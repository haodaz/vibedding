// 校验 content-en/ 的 JSON 和 content/ 的结构一致（同样的 key、同样的 id、同样的条数）。
import fs from 'node:fs'
import path from 'node:path'
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..')
const files = process.argv.slice(2)
let bad = 0
function shape(v, p = '') {
  if (Array.isArray(v)) return '[]'
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().join(',') + '}'
  return typeof v
}
for (const rel of files) {
  const zh = JSON.parse(fs.readFileSync(path.join(ROOT, 'content', rel), 'utf8'))
  const en = JSON.parse(fs.readFileSync(path.join(ROOT, 'content-en', rel), 'utf8'))
  const listKey = Object.keys(zh).find((k) => Array.isArray(zh[k]))
  if (listKey) {
    const a = zh[listKey], b = en[listKey]
    if (a.length !== b.length) { console.log(`✘ ${rel}: ${listKey} 条数 zh=${a.length} en=${b.length}`); bad++ }
    const ida = a.map((x) => x.id).filter(Boolean), idb = b.map((x) => x.id).filter(Boolean)
    const miss = ida.filter((x) => !idb.includes(x))
    if (miss.length) { console.log(`✘ ${rel}: en 缺 id ${miss.slice(0, 5).join(',')}${miss.length > 5 ? '…' : ''}`); bad++ }
    if (a.length && shape(a[0]) !== shape(b[0])) { console.log(`✘ ${rel}: 字段不同\n  zh ${shape(a[0])}\n  en ${shape(b[0])}`); bad++ }
  }
  if (shape(zh) !== shape(en)) { console.log(`✘ ${rel}: 顶层字段不同 zh=${shape(zh)} en=${shape(en)}`); bad++ }
  if (!bad) console.log(`✔ ${rel}`)
}
process.exit(bad ? 1 : 0)
