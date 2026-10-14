// 真·录屏：用 CDP 的 screencast 抓浏览器的真实画面，一边驱动界面一边录。
// 为什么不用截图拼：静帧 + 推镜一眼就是 PPT，评委会觉得产品没跑起来。
// 这里录到的是抽屉真的滑出来、页面真的在滚、标签真的被点亮。
//
// 用法：平台跑着（npm run dev），然后 node docs/video/record.mjs [场景名]
import puppeteer from '/Users/aisandbox/Documents/companydata/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js'
import fs from 'node:fs/promises'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const HERE = import.meta.dirname
const OUT = path.join(HERE, 'clips')
const TMP = path.join(HERE, 'work', 'frames')
const FF = '/Users/aisandbox/Documents/companydata/node_modules/ffmpeg-static/ffmpeg'
const BASE = 'http://localhost:5173'
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const FPS = 30
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

mkdirSync(OUT, { recursive: true })

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: 'new',
  args: ['--hide-scrollbars', '--window-size=1600,900'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1.5 })

async function go(hash) {
  await page.goto(BASE + hash, { waitUntil: 'networkidle2' })
  await page.evaluate(() => { try { localStorage.setItem('vb:lang', 'en'); localStorage.setItem('vb:theme', 'light') } catch { /* */ } })
  await page.reload({ waitUntil: 'networkidle2' })
  await sleep(1600)
}

/** 录一段：开 screencast，跑 action()，收帧，拼成 mp4。 */
async function record(name, action) {
  const dir = path.join(TMP, name)
  await fs.rm(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })
  const client = await page.createCDPSession()
  let n = 0
  const frames = []
  client.on('Page.screencastFrame', async (f) => {
    const t = Date.now()
    writeFileSync(path.join(dir, String(n).padStart(5, '0') + '.jpg'), Buffer.from(f.data, 'base64'))
    frames.push(t); n++
    try { await client.send('Page.screencastFrameAck', { sessionId: f.sessionId }) } catch { /* 已停 */ }
  })
  await client.send('Page.startScreencast', { format: 'jpeg', quality: 92, everyNthFrame: 1 })
  const t0 = Date.now()
  await action()
  await sleep(400)
  await client.send('Page.stopScreencast')
  await client.detach()
  const secs = (Date.now() - t0) / 1000

  // 帧率不稳（CDP 只在画面变化时发帧），按实际时长重定时成稳定 30fps
  const real = n / secs
  const out = path.join(OUT, name + '.mp4')
  execFileSync(FF, ['-y', '-loglevel', 'error', '-framerate', real.toFixed(3),
    '-i', path.join(dir, '%05d.jpg'),
    '-vf', `fps=${FPS},scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=#eef1f6,setsar=1`,
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', out])
  console.log(`✔ ${name}  ${n} 帧 / ${secs.toFixed(1)}s`)
}

/** 平滑滚动，录出来才像人在看 */
const smoothScroll = (sel, to, ms) => page.evaluate((s, to, ms) => new Promise((res) => {
  const el = s ? document.querySelector(s) : document.scrollingElement
  if (!el) return res()
  const from = el.scrollTop, t0 = performance.now()
  const step = (t) => {
    const k = Math.min(1, (t - t0) / ms)
    const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2   // ease-in-out
    el.scrollTop = from + (to - from) * e
    k < 1 ? requestAnimationFrame(step) : res()
  }
  requestAnimationFrame(step)
}), sel, to, ms)

const only = process.argv[2]
const want = (n) => !only || only === n

// ===== 1. 元件实体库：正文里的标签 → 点开 → 抽屉滑出 → 滚到坑 =====
if (want('entity')) {
  await go('/#/doc/hardware/kit-inventory.md')
  await page.evaluate(() => { const t = document.querySelector('.part-tag'); t?.scrollIntoView({ block: 'center' }) })
  await sleep(600)
  await record('entity', async () => {
    await sleep(900)
    // 把第一个元件标签点亮一下，让观众看见"文字里的名字是可点的"
    await page.evaluate(() => {
      const t = document.querySelector('.part-tag')
      if (t) { t.style.transition = 'box-shadow .4s'; t.style.boxShadow = '0 0 0 4px rgba(57,197,255,.55)' }
    })
    await sleep(1100)
    await page.evaluate(() => document.querySelector('.part-tag')?.click())
    await sleep(1400)                                   // 抽屉滑出
    await smoothScroll('.part-drawer', 700, 2600)       // 滚过参数表到常见坑
    await sleep(1200)
    await smoothScroll('.part-drawer', 1500, 2400)      // 继续到最小代码
    await sleep(900)
  })
}

// ===== 2. AI 撒过的谎：滚过那张表 =====
if (want('lies')) {
  await go('/#/doc/prompts/04-ai-lies.md')
  await record('lies', async () => {
    await sleep(800)
    await smoothScroll(null, 420, 3200)
    await sleep(2200)
  })
}

// ===== 3. 元件库全貌：146 条在滚 =====
if (want('grid')) {
  await go('/#/admin')
  await page.evaluate(async () => {
    const b = [...document.querySelectorAll('.lab-tabs .chip')].find((x) => /Parts/i.test(x.textContent))
    b?.click()
  })
  await sleep(1400)
  await record('grid', async () => {
    await sleep(700)
    await smoothScroll(null, 1400, 5200)
    await sleep(700)
  })
}

// ===== 4. 学习路径 =====
if (want('path')) {
  await go('/#/path')
  await record('path', async () => {
    await sleep(700)
    await smoothScroll(null, 900, 4200)
    await sleep(700)
  })
}

await browser.close()
console.log('clips ->', OUT)
