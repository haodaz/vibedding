// 云编译服务：收代码，跑 PlatformIO，回固件。一次一个（队列），带令牌。
// 本地试跑：COMPILE_TOKEN=dev node server.mjs   （需要 pio 在 PATH 里）
// 线上：Dockerfile 打包部署到 Railway / Fly.io，环境变量 COMPILE_TOKEN。
import http from 'node:http'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
const exec = promisify(execFile)

const PORT = Number(process.env.PORT || 8080)
const TOKEN = process.env.COMPILE_TOKEN || ''
const PIO = process.env.PIO || 'pio'
const MAX_FILE = 200_000, MAX_FILES = 20, TIMEOUT = Number(process.env.COMPILE_TIMEOUT || 240_000)

// 支持的板子 → platformio.ini 的 env 段
const BOARDS = {
  bluepill: { platform: 'ststm32', board: 'bluepill_f103c8', framework: 'arduino', extra: 'build_flags = -D LED_PIN=PC13' },
  bluepill_f103c8: { platform: 'ststm32', board: 'bluepill_f103c8', framework: 'arduino', extra: 'build_flags = -D LED_PIN=PC13' },
  nucleo_f103rb: { platform: 'ststm32', board: 'nucleo_f103rb', framework: 'arduino', extra: 'build_flags = -D LED_PIN=PA5' },
  nucleo_f411re: { platform: 'ststm32', board: 'nucleo_f411re', framework: 'arduino', extra: 'build_flags = -D LED_PIN=PA5' },
  esp32dev: { platform: 'espressif32', board: 'esp32dev', framework: 'arduino', extra: 'monitor_speed = 115200' },
  esp32_devkit: { platform: 'espressif32', board: 'esp32dev', framework: 'arduino', extra: 'monitor_speed = 115200' },
  esp32_wrover: { platform: 'espressif32', board: 'esp-wrover-kit', framework: 'arduino', extra: 'monitor_speed = 115200\nbuild_flags = -D BOARD_HAS_PSRAM' },
  'esp-wrover-kit': { platform: 'espressif32', board: 'esp-wrover-kit', framework: 'arduino', extra: 'monitor_speed = 115200\nbuild_flags = -D BOARD_HAS_PSRAM' },
  uno: { platform: 'atmelavr', board: 'uno', framework: 'arduino', extra: '' },
}

let chain = Promise.resolve()
const queued = () => new Promise((resolve) => { chain = chain.then(() => new Promise((done) => resolve(done))) })

async function compile({ board = 'bluepill', files = {}, lib_deps = [] }) {
  const spec = BOARDS[board]; if (!spec) throw new Error(`不支持的板子 ${board}（可选：${Object.keys(BOARDS).join(', ')}）`)
  const names = Object.keys(files); if (!names.length) throw new Error('没有文件')
  if (names.length > MAX_FILES) throw new Error('文件太多')
  for (const n of names) { if (!/^(src|include|lib)\/[\w\-./]+\.(c|cpp|h|hpp|ino)$/.test(n) || n.includes('..')) throw new Error(`不允许的文件名 ${n}`); if (String(files[n]).length > MAX_FILE) throw new Error(`${n} 太大`) }
  const deps = (lib_deps || []).filter((d) => /^[\w\-.\/@ ]+$/.test(d)).slice(0, 10)
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'vb-'))
  try {
    const ini = `[env:main]\nplatform = ${spec.platform}\nboard = ${spec.board}\nframework = ${spec.framework}\n${spec.extra}\n${deps.length ? 'lib_deps =\n' + deps.map((d) => '  ' + d).join('\n') + '\n' : ''}`
    await fs.writeFile(path.join(dir, 'platformio.ini'), ini)
    for (const n of names) { await fs.mkdir(path.dirname(path.join(dir, n)), { recursive: true }); await fs.writeFile(path.join(dir, n), String(files[n])) }
    const t0 = Date.now()
    let log = ''
    try { const r = await exec(PIO, ['run', '-e', 'main'], { cwd: dir, timeout: TIMEOUT, maxBuffer: 8e6, env: { ...process.env, PLATFORMIO_SETTING_ENABLE_TELEMETRY: 'false' } }); log = r.stdout + '\n' + r.stderr }
    catch (e) { log = (e.stdout ?? '') + '\n' + (e.stderr ?? '') + '\n' + e.message; return { ok: false, board, log: tail(log), elapsed: Date.now() - t0 } }
    const build = path.join(dir, '.pio', 'build', 'main')
    const images = []
    const add = async (file, addr) => { const p = path.join(build, file); const b = await fs.readFile(p).catch(() => null); if (b) images.push({ name: file, addr, size: b.length, b64: b.toString('base64') }) }
    if (spec.platform === 'espressif32') {
      await add('bootloader.bin', 0x1000); await add('partitions.bin', 0x8000)
      const home = process.env.PLATFORMIO_CORE_DIR || path.join(os.homedir(), '.platformio')
      const boot0 = await fs.readFile(path.join(home, 'packages', 'framework-arduinoespressif32', 'tools', 'partitions', 'boot_app0.bin')).catch(() => null)
      if (boot0) images.push({ name: 'boot_app0.bin', addr: 0xe000, size: boot0.length, b64: boot0.toString('base64') })
      await add('firmware.bin', 0x10000)
    } else if (spec.platform === 'atmelavr') {
      const hex = await fs.readFile(path.join(build, 'firmware.hex'), 'utf8').catch(() => null)
      if (hex) images.push({ name: 'firmware.hex', addr: 0, size: hex.length, hex })
    } else {
      await add('firmware.bin', 0x08000000)
    }
    const m = log.match(/RAM:.*?(\d+\.\d+)%.*?\n.*?Flash:.*?(\d+\.\d+)%/s)
    return { ok: images.length > 0, board, platform: spec.platform, images, ram: m?.[1], flash: m?.[2], log: tail(log), elapsed: Date.now() - t0 }
  } finally { fs.rm(dir, { recursive: true, force: true }).catch(() => {}) }
}
const tail = (s, n = 40) => s.trim().split('\n').slice(-n).join('\n')

http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*'); res.setHeader('Access-Control-Allow-Headers', 'content-type, authorization')
  if (req.method === 'OPTIONS') return res.writeHead(204).end()
  const json = (code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(obj)) }
  if (req.url === '/health') return json(200, { ok: true, boards: Object.keys(BOARDS) })
  if (req.url !== '/compile' || req.method !== 'POST') return json(404, { error: 'not found' })
  if (TOKEN && (req.headers.authorization || '') !== `Bearer ${TOKEN}`) return json(401, { error: 'unauthorized' })
  let raw = ''; for await (const c of req) { raw += c; if (raw.length > 4e6) return json(413, { error: 'too large' }) }
  let body; try { body = JSON.parse(raw) } catch { return json(400, { error: 'bad json' }) }
  const done = await queued()
  try { json(200, await compile(body)) } catch (e) { json(400, { error: e.message }) } finally { done() }
}).listen(PORT, '::', () => console.log(`compile-server listening on port ${PORT} (env PORT=${process.env.PORT ?? 'unset'}, token ${TOKEN ? 'on' : 'OFF'})`))
