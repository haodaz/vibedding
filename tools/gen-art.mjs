// 用通义万相生成平台美术：场景底图（16:9 jpg）和 NPC 立绘（绿幕抠成透明 png）。
// 清单在 content/art/manifest.json，输出到 platform/public/art/。已存在的文件会跳过。
// 用法（在 platform 目录）： npm run art            全部
//                          npm run art -- --force  重新生成
//                          npm run art -- hero_home mod1_blink   只生成这几个
//                          npm run art -- scenes    生成全部场景图（默认不生成，兜底画面够用）
//                          npm run art -- parts     生成全部元件贴图
// 密钥：platform/.env 里的 DASHSCOPE_API_KEY（或环境变量）
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { rekey } from './rekey.mjs'
import dns from 'node:dns'
dns.setDefaultResultOrder('ipv4first')   // 阿里云的 IPv6 地址在有些网络下连不上，优先 IPv4

const here = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(here, '..')
const OUT = path.join(ROOT, 'platform', 'public', 'art')
const require = createRequire(path.join(ROOT, 'platform', 'package.json'))
const sharp = require('sharp')

try {
  const env = await fs.readFile(path.join(ROOT, 'platform', '.env'), 'utf8')
  for (const line of env.split('\n')) { const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '') }
} catch { /* no .env */ }
const KEY = process.env.DASHSCOPE_API_KEY
if (!KEY) { console.error('缺少 DASHSCOPE_API_KEY：写到 platform/.env 里，或者 DASHSCOPE_API_KEY=... npm run art'); process.exit(1) }

const NEG = '水印, logo, 低清, 噪点, 畸变, 杂乱, 真人照片, 重复堆叠的多余元件, 手, 人'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

let chain = Promise.resolve()
async function submit(prompt, size, model = 'wan2.2-t2i-flash') {
  const run = async () => {
    for (let attempt = 0; attempt < 5; attempt++) {
      const res = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis', {
        method: 'POST',
        headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', 'X-DashScope-Async': 'enable' },
        body: JSON.stringify({ model, input: { prompt, negative_prompt: NEG }, parameters: { size, n: 1, prompt_extend: true, watermark: false } }),
      })
      const j = await res.json()
      if (res.ok && j.output?.task_id) { await sleep(3000); return j.output.task_id }
      if (String(j.code || '').startsWith('Throttling')) { await sleep(6000 * (attempt + 1)); continue }
      throw new Error('提交失败：' + JSON.stringify(j).slice(0, 200))
    }
    throw new Error('多次被限流')
  }
  const p = chain.then(run, run); chain = p.catch(() => {}); return p
}
async function genImage(prompt, size) {
  const id = await submit(prompt, size)
  for (let i = 0; i < 80; i++) {
    await sleep(3000)
    const j = await (await fetch(`https://dashscope.aliyuncs.com/api/v1/tasks/${id}`, { headers: { Authorization: `Bearer ${KEY}` } })).json()
    const st = j.output?.task_status
    if (st === 'SUCCEEDED') { const url = (j.output.results || []).map((x) => x.url).find(Boolean); return Buffer.from(await (await fetch(url)).arrayBuffer()) }
    if (st === 'FAILED') throw new Error('生成失败：' + JSON.stringify(j.output).slice(0, 200))
  }
  throw new Error('超时')
}
// 绿幕抠图（同 companydata/lab-art.ts 的做法）
async function chromaKey(input, width = 720) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width: W, height: H, channels } = info
  const sample = (x0, y0) => { let r = 0, g = 0, b = 0, n = 0; for (let y = y0; y < y0 + 12; y++) for (let x = x0; x < x0 + 12; x++) { const o = (y * W + x) * channels; r += data[o]; g += data[o + 1]; b += data[o + 2]; n++ } return [r / n, g / n, b / n] }
  const corners = [sample(4, 4), sample(W - 16, 4), sample(4, H - 16), sample(W - 16, H - 16)]
  const bg = corners.reduce((a, c) => [a[0] + c[0] / 4, a[1] + c[1] / 4, a[2] + c[2] / 4], [0, 0, 0])
  const HARD = 48, SOFT = 90
  for (let i = 0; i < W * H; i++) {
    const o = i * channels; const r = data[o], g = data[o + 1], b = data[o + 2]
    const d = Math.sqrt((r - bg[0]) ** 2 + (g - bg[1]) ** 2 + (b - bg[2]) ** 2)
    const greenish = g > r + 10 && g > b + 10
    if (d < HARD && greenish) { data[o + 3] = 0; continue }
    if (d < SOFT && greenish) { data[o + 3] = Math.round(data[o + 3] * (d - HARD) / (SOFT - HARD)); data[o + 1] = Math.round((g + Math.max(r, b)) / 2) }
  }
  return sharp(data, { raw: { width: W, height: H, channels } }).png({ compressionLevel: 9 }).resize({ width }).toBuffer()
}

const manifest = JSON.parse(await fs.readFile(path.join(ROOT, 'content', 'art', 'manifest.json'), 'utf8'))
const args = process.argv.slice(2)
const force = args.includes('--force')
const only = args.filter((a) => !a.startsWith('--'))
await fs.mkdir(OUT, { recursive: true })

const jobs = []
for (const s of manifest.scenes) {
  if (!only.includes(s.name) && !only.includes('scenes')) continue   // 场景要显式要求才生成
  const file = path.join(OUT, s.name + '.jpg')
  if (!force && await fs.stat(file).catch(() => null)) { console.log('跳过（已存在）', s.name); continue }
  jobs.push((async () => {
    try {
      const png = await genImage(`${s.prompt}，${manifest.style}`, '1440*810')
      await fs.writeFile(file, await sharp(png).jpeg({ quality: 82 }).toBuffer())
      console.log('✔ 场景', s.name)
    } catch (e) { console.error('✘', s.name, e.message) }
  })())
}
for (const n of manifest.npcs) {
  if (only.length && !only.includes(n.name)) continue
  const file = path.join(OUT, n.name + '.png')
  if (!force && await fs.stat(file).catch(() => null)) { console.log('跳过（已存在）', n.name); continue }
  jobs.push((async () => {
    try {
      const styled = /风格/.test(n.prompt) ? n.prompt : `半写实插画风格的游戏NPC立绘，${n.prompt}`
      const png = await genImage(`${styled}，人物完整不裁切，纯正绿色平涂背景，背景没有任何阴影和渐变，没有文字，没有logo，竖构图`, '900*1440')
      await fs.writeFile(file, await chromaKey(png))
      console.log('✔ 立绘', n.name)
    } catch (e) { console.error('✘', n.name, e.message) }
  })())
}
for (const pt of manifest.parts ?? []) {
  if (only.length && !only.includes(pt.name) && !only.includes('parts')) continue
  const file = path.join(OUT, pt.name + '.png')
  if (!force && await fs.stat(file).catch(() => null)) { console.log('跳过（已存在）', pt.name); continue }
  jobs.push((async () => {
    try {
      const png = await genImage(`${pt.prompt}，${manifest.parts_style}`, '1024*1024')
      await fs.writeFile(file, (await rekey(await sharp(png).resize({ width: 512 }).png().toBuffer())).buf)
      console.log('✔ 元件', pt.name)
    } catch (e) { console.error('✘', pt.name, e.message) }
  })())
}
await Promise.all(jobs)
console.log('完成。文件在 platform/public/art/')
