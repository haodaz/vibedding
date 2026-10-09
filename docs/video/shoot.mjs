// 给演示视频抓产品画面。
// 要点：**截元素本身，不截整页**。整页缩进 1080p 再推镜，文字会小到看不清，
// 推镜还会把边上的内容裁掉。直接按元素裁，拿到的就是满画幅的有效内容。
// 用法：平台跑着（npm run dev），然后 node docs/video/shoot.mjs
import puppeteer from '/Users/aisandbox/Documents/companydata/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js'
import fs from 'node:fs/promises'
import path from 'node:path'

const OUT = path.join(import.meta.dirname, 'shots')
const BASE = 'http://localhost:5173'
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

await fs.mkdir(OUT, { recursive: true })
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--hide-scrollbars'] })
const page = await browser.newPage()
await page.setViewport({ width: 1600, height: 1200, deviceScaleFactor: 2 })

async function go(hash) {
  await page.goto(BASE + hash, { waitUntil: 'networkidle2' })
  await page.evaluate(() => { try { localStorage.setItem('vb:lang', 'en'); localStorage.setItem('vb:theme', 'light') } catch { /* */ } })
  await page.reload({ waitUntil: 'networkidle2' })
  await sleep(1800)
}

/** 截一个元素，四周留点白。找不到就跳过，不中断。 */
async function shotEl(sel, name, pad = 24) {
  const ok = await page.evaluate((s) => {
    const el = document.querySelector(s)
    if (!el) return false
    el.scrollIntoView({ block: 'center' })
    return true
  }, sel)
  if (!ok) { console.log('✘ 找不到', sel, '→', name); return false }
  await sleep(500)
  const b = await page.evaluate((s, p) => {
    const r = document.querySelector(s).getBoundingClientRect()
    return { x: Math.max(0, r.x - p), y: Math.max(0, r.y - p), width: Math.min(r.width + p * 2, innerWidth), height: Math.min(r.height + p * 2, innerHeight) }
  }, sel, pad)
  await page.screenshot({ path: path.join(OUT, name + '.png'), clip: b })
  console.log('✔', name, Math.round(b.width) + '×' + Math.round(b.height))
  return true
}

// —— 元件抽屉：参数表 + 常见坑（VDD = VCC 那条）——
await go('/#/admin')
await page.evaluate(async () => {
  const b = [...document.querySelectorAll('.lab-tabs .chip')].find((x) => /Parts/i.test(x.textContent))
  b?.click(); await new Promise((r) => setTimeout(r, 500))
  const inp = document.querySelector('.parts-bar input')
  const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
  set.call(inp, 'LCD1602'); inp.dispatchEvent(new Event('input', { bubbles: true }))
  await new Promise((r) => setTimeout(r, 400))
  document.querySelector('.parts-cell')?.click()
})
await sleep(1500)
// 抽屉只有 620px 宽，撑成一栏再截，文字才够大
await page.addStyleTag({ content: '.part-drawer{width:100vw!important;border:0!important;box-shadow:none!important} .part-scrim{display:none!important} .part-close{display:none!important} .part-body{max-width:1180px;margin:0 auto}' })
await sleep(600)
await shotEl('.part-rows', 'S_wiring_rows')
await shotEl('.part-pitfalls', 'S_pitfalls')
await shotEl('.part-buy', 'S_buy', 16)

// —— AI 撒过的谎：这份文件是产品的一部分 ——
await go('/#/doc/prompts/04-ai-lies.md')
await shotEl('.md table', 'S_lies_table')

// —— 元件库全貌 ——
await go('/#/admin')
await page.evaluate(async () => {
  const b = [...document.querySelectorAll('.lab-tabs .chip')].find((x) => /Parts/i.test(x.textContent))
  b?.click()
})
await sleep(1200)
await shotEl('.parts-grid', 'S_parts_grid')

// —— 元件图鉴（套件清单页里那一大片零件图）——
await go('/#/doc/hardware/kit-inventory.md')
await shotEl('.parts-gallery', 'S_gallery')

// —— 学习路径 ——
await go('/#/path')
await shotEl('.content', 'S_path', 0)

await browser.close()
console.log('shots ->', OUT)
