// 一条短录像 = 一个画面。每次全新对话，只问一件事。
// 为什么不一条长会话跑到底：第一轮光出采购清单就 600 秒，中间任何一步错位
// 整条三十分钟就废了。拆开之后失败只损失两分钟，而且能单独重跑某一段。
//
// 用法：node docs/video/beat.mjs <名字> [照片] "<要说的话>"
//   node docs/video/beat.mjs parts p7275.png "the parts arrived but what are these? which one is the actual board?"
//   node docs/video/beat.mjs flash - "My ESP32 is plugged in. Make the onboard LED blink and flash it for real."
import puppeteer from '/Users/aisandbox/Documents/companydata/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const HERE = import.meta.dirname
const [name, photo, text] = process.argv.slice(2)
if (!name || !text) { console.error('用法: node beat.mjs <名字> <照片|-> "<说的话>"'); process.exit(1) }

const FF = '/Users/aisandbox/Documents/companydata/node_modules/ffmpeg-static/ffmpeg'
const OUT = path.join(HERE, 'clips')
const FRAMES = path.join(HERE, 'work', 'frames', name)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
rmSync(FRAMES, { recursive: true, force: true }); mkdirSync(FRAMES, { recursive: true }); mkdirSync(OUT, { recursive: true })

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new', args: ['--hide-scrollbars', '--window-size=1600,900'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1.5 })
await page.goto('http://localhost:5173/#/make?p=p_' + name + Date.now().toString(36), { waitUntil: 'networkidle2' })
await page.evaluate(() => { try { localStorage.setItem('vb:lang', 'en'); localStorage.setItem('vb:theme', 'light'); localStorage.setItem('vb:intro', '1') } catch { /* */ } })
await page.reload({ waitUntil: 'networkidle2' })
await sleep(2500)

const BOX = '.ws-input input:not([type=file])'
const isBusy = () => page.evaluate((s) => { const e = document.querySelector(s); return !e || e.disabled }, BOX)
// 卡片会暂停整个循环等人点。确认类按钮优先；"复制"点了卡片不消失，会死循环。
const clickCards = () => page.evaluate(() => {
  const intro = [...document.querySelectorAll('button')].find((b) => /let'?s go/i.test(b.textContent))
  if (intro && intro.offsetParent) { intro.click(); return 'intro' }
  const bom = document.querySelector('.bom:not(.done) .chip.primary')
  if (bom) { bom.click(); return 'bom' }
  const card = document.querySelector('.hcard:not(.done)')
  if (card) {
    const bs = [...card.querySelectorAll('button')]
    const ok = bs.find((b) => /\bdone\b|ran it|^yes|it works|亮了/i.test(b.textContent))
      || bs.find((b) => !/copy|复制|stuck|卡住/i.test(b.textContent))
    if (ok) { ok.click(); return 'card:' + ok.textContent.trim().slice(0, 16) }
  }
  return null
})

// 先传图（起始页就能传，这是最稳的时机），再打字
if (photo && photo !== '-') {
  const fi = await page.$('.ws-input input[type=file]')
  if (!fi) { console.error('✘ 没有上传入口'); await browser.close(); process.exit(1) }
  await fi.uploadFile(path.join(HERE, 'photos', photo))
  await sleep(1500)
  console.log('  已附照片', photo)
}
await page.click(BOX)
await page.type(BOX, text, { delay: 26 })
await sleep(600)

// —— 开录 ——
const client = await page.createCDPSession()
let n = 0
client.on('Page.screencastFrame', async (f) => {
  writeFileSync(path.join(FRAMES, String(n).padStart(6, '0') + '.jpg'), Buffer.from(f.data, 'base64')); n++
  try { await client.send('Page.screencastFrameAck', { sessionId: f.sessionId }) } catch { /* */ }
})
await client.send('Page.startScreencast', { format: 'jpeg', quality: 90, everyNthFrame: 1 })
const t0 = Date.now()

await page.evaluate(() => {
  const b = [...document.querySelectorAll('.ws-input button')].find((x) => /send/i.test(x.textContent))
  b?.click()
})

const MAX = Number(process.env.MAX_MS || 420000)
// 必须先等它"忙起来"：点完发送到模型真的开动有几秒延迟，
// 这期间 isBusy 是 false，直接进等待循环会立刻判定"已完成"，录到 6 秒就停。
for (let i = 0; i < 40; i++) {
  if (await isBusy()) break
  if (await clickCards()) break
  await sleep(500)
}
let idle = 0
while (Date.now() - t0 < MAX) {
  const c = await clickCards()
  if (c) { console.log('  ↳ 点掉卡片:', c); await sleep(2500); idle = 0; continue }
  if (!(await isBusy())) { idle++; if (idle >= 3) break } else idle = 0
  // 让对话一直贴着底，新内容才在画面里
  await page.evaluate(() => { const el = document.querySelector('.ws-log'); if (el) el.scrollTop = el.scrollHeight })
  await sleep(1000)
}
await sleep(2500)

await client.send('Page.stopScreencast')
await client.detach()
const secs = (Date.now() - t0) / 1000
const out = path.join(OUT, name + '.mp4')
execFileSync(FF, ['-y', '-loglevel', 'error', '-framerate', (n / secs).toFixed(3),
  '-i', path.join(FRAMES, '%06d.jpg'),
  '-vf', 'fps=30,scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=#eef1f6,setsar=1',
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', out])
console.log(`✔ ${name}  ${n} 帧 / ${secs.toFixed(1)}s  ->  ${out}`)
await browser.close()
