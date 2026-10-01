// 实体库：正文里出现的元件自动变成可点的 tag，点开抽屉看图、参数、接线、坑、购买链接。
// 数据就是 content/hardware/parts-catalog.json（英文版在 content-en/），走 content.ts 统一入口，不需要新表。

import { getJson } from './content'
import { getLang } from './i18n'

export interface Part {
  id: string; name: string; cat: string; iface: string; volt: string
  price: string; buy: string; lib: string; pins: string; wiring: string
  snippet?: string; pitfalls?: string[]; note?: string
}
interface Recipe { id: string; title: string; parts?: { id: string; name: string; role?: string }[] }

const CATALOG = 'hardware/parts-catalog.json'
const RECIPES = 'knowledge/projects.json'

export function allParts(): Part[] { return getJson<{ parts: Part[] }>(CATALOG)?.parts ?? [] }
export function getPart(id: string): Part | null { return allParts().find((p) => p.id === id) ?? null }

// —— 购买链接 ——
// 英文版去 Amazon，中文版去淘宝。申请到 Amazon 联盟账号后把 tag 填这里，全站生效。
const AMAZON_TAG = ''
export function searchUrl(term: string, lang = getLang()): string {
  // 搜索词里可能带括号补充（"…(Adafruit/SparkFun carry an equivalent)"），搜的时候去掉
  const q = term.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim()
  if (lang === 'zh') return 'https://s.taobao.com/search?q=' + encodeURIComponent(q)
  const u = new URL('https://www.amazon.com/s')
  u.searchParams.set('k', q)
  if (AMAZON_TAG) u.searchParams.set('tag', AMAZON_TAG)
  return u.toString()
}
export const buyUrl = (p: Part) => searchUrl(p.buy)

// —— 配图 ——
// public/art/part_*.png，文件名和 catalog id 不完全一致，手工对上。
// 只收通过质检（npm run art:qa）的图。生成模型画不准的那些宁可没图：
// 新手拿错图去认零件，比没有图更糟。没图的回落到分类占位图标。
// 已撤掉（模型反复画错，等更好的模型或用户实物照补上）：
//   bluepill dht11 hc05 keypad lcd1602 oled pir sd_module sg90 sound
const IMG: Record<string, string> = {
  breadboard: 'breadboard', button: 'button',
  buzzer_active: 'buzzer', buzzer_passive: 'buzzer',
  esp32_wrover: 'esp32_wrover', jumper: 'jumper',
  ldr: 'ldr', led_5mm: 'led_red',
  potentiometer: 'potentiometer',
  resistor_kit: 'resistor_220', stlink: 'stlink', usb_serial: 'usb_serial',
  relay: 'relay', hcsr04: 'hcsr04',
  stepper_28byj: 'stepper_28byj', ws2812: 'ws2812',
  power_18650: 'power_18650', power_adapter: 'power_adapter', dc_motor_l298n: 'dc_motor_l298n',
  electrolytic_1000uf: 'electrolytic_1000uf', ds18b20: 'ds18b20', pump_diode: 'pump_diode',
  rtc_ds3231: 'rtc_ds3231', ir_receiver: 'ir_receiver', mosfet: 'mosfet',
  mpu6050: 'mpu6050', mq2: 'mq2', rain: 'rain',
  soil_moisture: 'soil_moisture', water_pump: 'water_pump',
}
export function partImage(id: string): string | null { return IMG[id] ? `/art/part_${IMG[id]}.png` : null }

// —— 相关配件 ——
// 不另外维护关系表：从 30 个项目食谱里"一起出现过"推出来，共同出场次数多的排前面。
export function relatedParts(id: string, limit = 6): Part[] {
  const d = getJson<{ projects?: Recipe[] } | Recipe[]>(RECIPES)
  const recipes: Recipe[] = Array.isArray(d) ? d : (d?.projects ?? [])
  const score = new Map<string, number>()
  for (const r of recipes) {
    const ids = (r.parts ?? []).map((p) => p.id)
    if (!ids.includes(id)) continue
    for (const other of ids) if (other !== id) score.set(other, (score.get(other) ?? 0) + 1)
  }
  const byId = new Map(allParts().map((p) => [p.id, p]))
  return [...score.entries()].sort((a, b) => b[1] - a[1])
    .map(([pid]) => byId.get(pid)).filter((p): p is Part => !!p).slice(0, limit)
}
export function usedIn(id: string, limit = 4): Recipe[] {
  const d = getJson<{ projects?: Recipe[] } | Recipe[]>(RECIPES)
  const recipes: Recipe[] = Array.isArray(d) ? d : (d?.projects ?? [])
  return recipes.filter((r) => (r.parts ?? []).some((p) => p.id === id)).slice(0, limit)
}

// —— 别名索引：正文里怎样的字算提到了这个元件 ——
// 泛词不做 tag：满屏都是，点开也帮不上忙（"LED"到底是哪个 LED？）
const SKIP = new Set([
  'led', 'leds', 'resistor', 'resistors', 'wire', 'wires', 'cable', 'cables', 'sensor', 'sensors',
  'module', 'modules', 'board', 'boards', 'pin', 'pins', 'chip', 'chips', 'kit', 'kits', 'set',
  'diode', 'diodes', 'capacitor', 'transistor', 'switch', 'motor', 'display', 'battery', 'power',
  '电阻', '电容', '二极管', '三极管', '传感器', '模块', '板子', '芯片', '电机', '电池', '开关', '屏幕',
])
// 总线、协议、单位、封装：长得像型号（带数字），但不是某个具体元件
const NOT_A_PART = new Set([
  'i2c', 'spi', 'uart', 'usart', 'gpio', 'pwm', 'adc', 'dac', 'usb', 'usb-c', 'type-c', 'rs232', 'rs485',
  '1wire', 'onewire', 'ttl', 'cmos', 'pcb', 'smd', 'dip', 'sop', 'to-92', 'to-220', '3v3', '5v', '12v',
  'mhz', 'khz', 'kbps', 'mah', '1/4w', '2.54mm', '0.96', '16x2', '20x4',
])
// 常见写法容易撞车，指定谁是正主
const PREFER: Record<string, string> = { esp32: 'esp32_devkit', stm32: 'bluepill', arduino: 'arduino_uno', esp8266: 'esp8266_nodemcu' }

let cache: { key: string; index: Map<string, string>; re: RegExp | null } | null = null

function buildIndex(): { index: Map<string, string>; re: RegExp | null } {
  const parts = allParts()
  const key = parts.length + ':' + (parts[0]?.name ?? '')
  if (cache && cache.key === key) return cache
  const index = new Map<string, string>()
  const add = (alias: string, id: string) => {
    const a = alias.trim().toLowerCase()
    if (a.length < 3 || SKIP.has(a)) return
    const cur = index.get(a)
    if (cur && cur !== id) { index.set(a, PREFER[a] ?? (cur.length <= id.length ? cur : id)); return }
    index.set(a, id)
  }
  for (const p of parts) {
    const bare = p.name.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim()
    // 1) 型号串：带数字的字母数字组合（HC-SR04、STM32F103C8T6、1N5819、ULN2003…），精度最高。
    //    要求 ≥4 字符且字母数字都有，挡掉 I2C、5V 这类；"4x4""16x2" 是尺寸不是型号。
    for (const tok of bare.split(/[\s,/+]+/)) {
      const t = tok.replace(/^[^\w-]+|[^\w-]+$/g, '')
      if (t.length < 4 || !/^[\w-]+$/.test(t)) continue
      if (!/\d/.test(t) || !/[a-z]/i.test(t)) continue
      if (/^\d+x\d+$/i.test(t) || NOT_A_PART.has(t.toLowerCase())) continue
      add(t, p.id)
    }
    // 2) 短产品名整体（"Breadboard"、"Blue Pill"、"ESP32 DevKitC"）
    if (bare.split(/\s+/).length <= 3) add(bare, p.id)
  }
  for (const [alias, id] of Object.entries(PREFER)) if (parts.some((p) => p.id === id)) index.set(alias, id)
  const aliases = [...index.keys()].sort((a, b) => b.length - a.length)   // 长的优先，避免 ESP32 抢走 ESP32-C3
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  // 词边界：英文用 \b 式的前后不粘字母数字；中文别名不受影响
  const re = aliases.length ? new RegExp(`(?<![\\w-])(${aliases.map(esc).join('|')})(?![\\w-])`, 'gi') : null
  cache = { key, index, re }
  return cache
}

export function matchPart(text: string): string | null {
  const { index } = buildIndex()
  return index.get(text.trim().toLowerCase()) ?? null
}

// 把一段已渲染的 HTML 里的元件名包成 tag。跳过代码块、链接、已经是 tag 的地方。
export function tagParts(root: HTMLElement): void {
  const { re, index } = buildIndex()
  if (!re) return
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(n) {
      if (!n.nodeValue || n.nodeValue.length < 3) return NodeFilter.FILTER_REJECT
      const p = n.parentElement
      if (!p || p.closest('code, pre, a, button, .part-tag, .codeblock')) return NodeFilter.FILTER_REJECT
      return NodeFilter.FILTER_ACCEPT
    },
  })
  const targets: Text[] = []
  for (let n = walker.nextNode(); n; n = walker.nextNode()) targets.push(n as Text)
  const seen = new Set<string>()   // 一条消息 / 一篇文档里，同一个元件只标第一次，不然满屏是 tag
  for (const node of targets) {
    const text = node.nodeValue!
    re.lastIndex = 0
    if (!re.test(text)) continue
    re.lastIndex = 0
    const frag = document.createDocumentFragment()
    let last = 0, m: RegExpExecArray | null
    while ((m = re.exec(text))) {
      const id = index.get(m[1].toLowerCase())
      if (!id || seen.has(id)) continue
      seen.add(id)
      if (m.index > last) frag.append(text.slice(last, m.index))
      const b = document.createElement('button')
      b.className = 'part-tag'; b.type = 'button'; b.dataset.part = id; b.textContent = m[1]
      frag.append(b)
      last = m.index + m[0].length
    }
    if (last === 0) continue
    if (last < text.length) frag.append(text.slice(last))
    node.replaceWith(frag)
  }
}

export function openPart(id: string) { window.dispatchEvent(new CustomEvent('vb:part', { detail: id })) }
