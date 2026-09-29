// 把 platform/shared/spec.mjs 复制成 api/_spec.js：Vercel 函数只从 api/ 目录内 import，避免跨目录 .mjs 引用出问题。
// 改了 spec.mjs 之后跑一次：node tools/sync-spec.mjs（platform 的 build 也会自动跑）
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const src = path.join(ROOT, 'platform', 'shared', 'spec.mjs'), dst = path.join(ROOT, 'api', '_spec.js')
fs.writeFileSync(dst, '// 自动生成：来自 platform/shared/spec.mjs，不要手改（node tools/sync-spec.mjs）\n' + fs.readFileSync(src, 'utf8'))
console.log('api/_spec.js 已同步')
