// 贴图去背景（后处理）：从图片四边开始泛洪，把和边缘颜色相近的像素变透明。
// 比"只抠绿色"稳：模型有时不给绿幕，背景是白的、青的、带光晕的，也能去掉；
// 而且只从外往里吃，居中的白色零件（比如面包板）不会被误伤。
// 用法：node tools/rekey.mjs [文件...]   不给参数 = platform/public/art/part_*.png 全部
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
const here = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(here, '..')
const sharp = createRequire(path.join(ROOT, 'platform', 'package.json'))('sharp')

export async function rekey(input, { hard = 40, soft = 75 } = {}) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width: W, height: H, channels: C } = info
  // 背景色：四边取样的中位数（避免被角落的阴影带偏）
  const samples = []
  for (let x = 0; x < W; x += 4) { samples.push(px(0 + x * C)); samples.push(px((H - 1) * W * C + x * C)) }
  for (let y = 0; y < H; y += 4) { samples.push(px(y * W * C)); samples.push(px((y * W + W - 1) * C)) }
  function px(o) { return [data[o], data[o + 1], data[o + 2]] }
  const med = (i) => samples.map((s) => s[i]).sort((a, b) => a - b)[samples.length >> 1]
  const bg = [med(0), med(1), med(2)]
  const dist = (o) => Math.hypot(data[o] - bg[0], data[o + 1] - bg[1], data[o + 2] - bg[2])

  // 泛洪：从四边出发，只经过"像背景"的像素
  const seen = new Uint8Array(W * H)
  const stack = []
  const push = (x, y) => { const i = y * W + x; if (!seen[i] && dist(i * C) < soft) { seen[i] = 1; stack.push(i) } }
  for (let x = 0; x < W; x++) { push(x, 0); push(x, H - 1) }
  for (let y = 0; y < H; y++) { push(0, y); push(W - 1, y) }
  while (stack.length) {
    const i = stack.pop(); const x = i % W, y = (i - x) / W
    if (x > 0) push(x - 1, y); if (x < W - 1) push(x + 1, y); if (y > 0) push(x, y - 1); if (y < H - 1) push(x, y + 1)
  }
  let removed = 0
  for (let i = 0; i < W * H; i++) {
    if (!seen[i]) continue
    const o = i * C, d = dist(o)
    if (d < hard) { data[o + 3] = 0; removed++ }
    else { data[o + 3] = Math.round(data[o + 3] * (d - hard) / (soft - hard)) }
  }
  return { buf: await sharp(data, { raw: { width: W, height: H, channels: C } }).png({ compressionLevel: 9 }).toBuffer(), bg, ratio: removed / (W * H) }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  const dir = path.join(ROOT, 'platform', 'public', 'art')
  let files = process.argv.slice(2)
  if (!files.length) files = (await fs.readdir(dir)).filter((f) => f.startsWith('part_') && f.endsWith('.png')).map((f) => path.join(dir, f))
  for (const f of files) {
    const { buf, bg, ratio } = await rekey(await fs.readFile(f))
    await fs.writeFile(f, buf)
    console.log(`✔ ${path.basename(f)}  背景 rgb(${bg.join(',')})  去掉 ${(ratio * 100).toFixed(0)}%`)
  }
}
