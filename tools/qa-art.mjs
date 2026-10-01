// 元件贴图质检：把每张生成的贴图交给 /api/identify，问模型"这张图里是不是这个零件"。
// 认不出来的图会误导新手，应该重画或撤掉。重画完可以再跑一次对比。
// 用法：先确保本地服务在跑（npm run dev），然后 node tools/qa-art.mjs
// 注意：判官偏严，"不合格"里混着三类情况，看 says 自己判断：
//   1) 图真的画错了（振膜画成旋钮、薄膜键盘画成墙壁开关）
//   2) 图没错，是贴图和元件库条目对不上（单个电阻 vs 电阻包）
//   3) 吹毛求疵（端子 4 位还是 3 位、丝印写成 MPU6000）
import fs from 'node:fs/promises'
import path from 'node:path'

const ROOT = '/Users/aisandbox/Documents/embeded'
const ART = path.join(ROOT, 'platform/public/art')
const cat = JSON.parse(await fs.readFile(path.join(ROOT, 'content-en/hardware/parts-catalog.json'), 'utf8')).parts
const manifest = JSON.parse(await fs.readFile(path.join(ROOT, 'content/art/manifest.json'), 'utf8')).parts

// art name -> catalog id（同 parts.ts 的 IMG，反过来取一个代表）
const MAP = {
  bluepill: 'bluepill', breadboard: 'breadboard', button: 'button', buzzer: 'buzzer_active',
  dht11: 'dht11', esp32_wrover: 'esp32_wrover', jumper: 'jumper', lcd1602: 'lcd1602', ldr: 'ldr',
  led_red: 'led_5mm', led_yellow: 'led_5mm', oled: 'oled_096', potentiometer: 'potentiometer',
  resistor_220: 'resistor_kit', resistor_10k: 'resistor_kit', stlink: 'stlink', usb_serial: 'usb_serial',
  sg90: 'sg90', relay: 'relay', hcsr04: 'hcsr04', keypad: 'keypad', sd_module: 'sd_module',
  stepper_28byj: 'stepper_28byj', ws2812: 'ws2812', power_18650: 'power_18650',
  power_adapter: 'power_adapter', dc_motor_l298n: 'dc_motor_l298n', electrolytic_1000uf: 'electrolytic_1000uf',
  ds18b20: 'ds18b20', pump_diode: 'pump_diode', rtc_ds3231: 'rtc_ds3231', hc05: 'hc05',
  ir_receiver: 'ir_receiver', mosfet: 'mosfet', mpu6050: 'mpu6050', mq2: 'mq2', pir: 'pir',
  rain: 'rain', soil_moisture: 'soil_moisture', sound: 'sound', water_pump: 'water_pump',
}

const files = (await fs.readdir(ART)).filter((f) => f.startsWith('part_') && f.endsWith('.png'))
const out = []
for (const f of files) {
  const art = f.replace(/^part_|\.png$/g, '')
  const id = MAP[art]
  const p = id && cat.find((x) => x.id === id)
  if (!p) { out.push({ art, verdict: '?', says: '元件库里没有对应条目，跳过' }); continue }
  const image = 'data:image/png;base64,' + (await fs.readFile(path.join(ART, f))).toString('base64')
  try {
    const r = await fetch('http://localhost:5174/api/identify', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: p.name, expect: p.note, pins: p.pins, image, lang: 'en' }),
    })
    const j = await r.json()
    out.push({ art, id, verdict: j.match === true ? '✔' : j.match === false ? '✘' : '？', says: (j.says || j.error || '').slice(0, 110), looks: j.looks_like || '' })
  } catch (e) { out.push({ art, id, verdict: 'ERR', says: e.message }) }
  process.stderr.write('.')
}
process.stderr.write('\n')
out.sort((a, b) => a.verdict.localeCompare(b.verdict) || a.art.localeCompare(b.art))
for (const r of out) console.log(r.verdict, (r.art + '                    ').slice(0, 21), r.says + (r.looks ? ` → 更像：${r.looks}` : ''))
const bad = out.filter((r) => r.verdict === '✘')
console.log(`\n合计 ${out.length} 张：通过 ${out.filter((r) => r.verdict === '✔').length}，存疑 ${out.filter((r) => r.verdict === '？').length}，不合格 ${bad.length}`)
if (bad.length) console.log('不合格：', bad.map((r) => r.art).join(' '))
