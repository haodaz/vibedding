// 录一整段真实会话：从零开始提需求 → 推荐要买的东西 → 零件到了认不出 →
// 到底哪个是板子 → VCC 在哪我只看到 VDD → 让灯闪 → 真编译真烧录。
// 全程 CDP screencast 录屏，之后从里面剪片段。模型怎么答就怎么录，不摆拍。
//
// 前置：平台跑着（npm run dev）、板子插着、库存已置空。
// 用法：node docs/video/session.mjs
import puppeteer from '/Users/aisandbox/Documents/companydata/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js'
import fs from 'node:fs/promises'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const HERE = import.meta.dirname
const OUT = path.join(HERE, 'clips')
const FRAMES = path.join(HERE, 'work', 'frames', 'session')
const FF = '/Users/aisandbox/Documents/companydata/node_modules/ffmpeg-static/ffmpeg'
const BASE = 'http://localhost:5173'
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

await fs.rm(FRAMES, { recursive: true, force: true })
mkdirSync(FRAMES, { recursive: true })
mkdirSync(OUT, { recursive: true })

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: 'new',
  args: ['--hide-scrollbars', '--window-size=1600,900'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1.5 })

const pid = 'p_demo' + Date.now().toString(36)
await page.goto(`${BASE}/#/make?p=${pid}`, { waitUntil: 'networkidle2' })
await page.evaluate(() => { try { localStorage.setItem('vb:lang', 'en'); localStorage.setItem('vb:theme', 'light'); localStorage.setItem('vb:intro', '1') } catch { /* */ } })
await page.reload({ waitUntil: 'networkidle2' })
await sleep(2000)
// 关掉首次引导弹窗
await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find((x) => /let'?s go|开始/i.test(x.textContent))
  b?.click()
})
await sleep(800)

// —— 开录 ——
const client = await page.createCDPSession()
let n = 0
const marks = []
client.on('Page.screencastFrame', async (f) => {
  writeFileSync(path.join(FRAMES, String(n).padStart(6, '0') + '.jpg'), Buffer.from(f.data, 'base64'))
  n++
  try { await client.send('Page.screencastFrameAck', { sessionId: f.sessionId }) } catch { /* */ }
})
await client.send('Page.startScreencast', { format: 'jpeg', quality: 90, everyNthFrame: 1 })
const t0 = Date.now()
const mark = (label) => { marks.push({ label, t: (Date.now() - t0) / 1000 }); console.log(`  [${((Date.now() - t0) / 1000).toFixed(1)}s] ${label}`) }

/** 打字（一个字一个字，录出来像人在打） */
const BOX = '.ws-input input:not([type=file])'
const isBusy = () => page.evaluate((s) => { const el = document.querySelector(s); return !el || el.disabled }, BOX)

/** 等它不忙了再动手；一直忙就等到超时为止 */
async function waitIdle(maxWait = 600000) {
  const t = Date.now()
  while (Date.now() - t < maxWait) {
    await clickCards()
    if (!(await isBusy())) return true
    await sleep(1500)
  }
  console.log('    ↳ 等超时了，强行继续')
  return false
}

async function type(text) {
  await waitIdle()
  await page.waitForSelector(BOX, { timeout: 60000 })
  await page.click(BOX)
  await page.type(BOX, text, { delay: 28 })
}
/**
 * 卡片会暂停循环等人点：采购清单（propose_bom）、接线/观察卡（ask_human）、烧录卡。
 * 不点它，agent 就一直挂着，后面的话全发不出去——第一次录就栽在这。
 * 这里扮演一个配合的用户：清单点"就这样"，接线卡点"做好了"，观察卡选第一个肯定答案。
 */
async function clickCards() {
  return page.evaluate(() => {
    let hit = null
    // 引导弹窗会罩住整个界面，输入框就点不到了。随时关掉。
    const intro = [...document.querySelectorAll('button')].find((b) => /let'?s go/i.test(b.textContent))
    if (intro && intro.offsetParent) { try { localStorage.setItem('vb:intro', '1') } catch { /* */ } intro.click(); return 'intro' }
    const bom = document.querySelector('.bom:not(.done) .chip.primary')
    if (bom) { bom.click(); return 'bom' }
    const flash = [...document.querySelectorAll('.hcard button, .flash button')].find((b) => /flash|烧录|开始/i.test(b.textContent))
    if (flash) { flash.click(); return 'flash' }
    const card = document.querySelector('.hcard:not(.done)')
    if (card) {
      const btns = [...card.querySelectorAll('button')]
      // "复制"按钮点了卡片不会消失，会死循环；"卡住了"会让 agent 以为失败。
      // 要的是确认类按钮：Done / Ran it / 我做好了 / 亮了。
      const ok = btns.find((b) => /\bdone\b|ran it|做好|跑完|^yes|亮了|it works/i.test(b.textContent))
        || btns.find((b) => !/copy|复制|stuck|卡住/i.test(b.textContent))
      if (ok) { ok.click(); hit = 'human:' + ok.textContent.trim().slice(0, 20) }
    }
    return hit
  })
}

/** 发出去，等它做完；中途有卡片就替用户点掉 */
async function send(maxWait = 600000) {
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('.ws-input button')].find((x) => /send/i.test(x.textContent))
    b?.click()
  })
  // 先等它真的开始忙（界面从起始页切到对话页也在这几秒里），否则会误判"已经做完"
  const t = Date.now()
  let started = false
  while (Date.now() - t < 20000) {
    if (await isBusy()) { started = true; break }
    if (await clickCards()) { started = true; break }
    await sleep(500)
  }
  if (!started) console.log('    ↳ 没检测到开始，继续等')
  let idle = 0
  while (Date.now() - t < maxWait) {
    const card = await clickCards()
    if (card) { console.log('    ↳ 点掉卡片:', card); await sleep(2500); idle = 0; continue }
    if (!(await isBusy())) { idle++; if (idle >= 3) break } else idle = 0
    await sleep(1000)
  }
  await sleep(2000)
}
/** 传照片 */
async function upload(file) {
  await waitIdle()
  await page.waitForSelector('.ws-input input[type=file]', { timeout: 30000 }).catch(() => {})
  const input = await page.$('.ws-input input[type=file]')
  if (!input) { console.log('  ✘ 没找到上传入口'); return }
  await input.uploadFile(path.join(HERE, 'photos', file))
  await sleep(1500)
}
/** 把对话滚到底 */
const toBottom = () => page.evaluate(() => {
  const el = document.querySelector('.ws-log') || document.scrollingElement
  el.scrollTop = el.scrollHeight
})

try {
  mark('01 提需求')
  await type("I want something that watches my dog's water bowl and loudly nags me when the water runs low.")
  await send()
  await toBottom(); await sleep(2500)

  mark('02 零件到了，这些是什么')
  await upload('p7275.png')
  await type('the parts arrived but what are these? which one is the actual board?')
  await send()
  await toBottom(); await sleep(3000)

  mark('03 VCC 在哪')
  await upload('p7278.png')
  await type('where is VCC? I only see VDD on this one')
  await send()
  await toBottom(); await sleep(3000)

  mark('04 这排线怎么用')
  await upload('p7277.png')
  await type('what are these? how do I use them?')
  await send()
  await toBottom(); await sleep(3000)

  mark('05 让板载灯闪起来，真烧')
  await type('My ESP32 is plugged in now. Make the onboard LED blink, build it and flash it for real.')
  await send(900000)
  await toBottom(); await sleep(3000)
} catch (e) {
  console.log('  会话中断:', e.message)
}

await client.send('Page.stopScreencast')
await client.detach()
const secs = (Date.now() - t0) / 1000
console.log(`\n录了 ${n} 帧 / ${secs.toFixed(1)}s`)

const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 13)
const out = path.join(OUT, `session_${stamp}.mp4`)
execFileSync(FF, ['-y', '-loglevel', 'error', '-framerate', (n / secs).toFixed(3),
  '-i', path.join(FRAMES, '%06d.jpg'),
  '-vf', 'fps=30,scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=#eef1f6,setsar=1',
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', out])

writeFileSync(path.join(OUT, `session_${stamp}.marks.json`), JSON.stringify(marks, null, 2))
console.log('clip ->', out)
console.log('时间标记 ->', path.join(OUT, 'session.marks.json'))
await browser.close()
