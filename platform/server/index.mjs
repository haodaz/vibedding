// 平台的本地小服务（端口 5174）。两件事：
//   GET  /api/status   机器状态：pio 装了没、有没有串口设备（板子插上了没）
//   POST /api/review   把用户代码 + 任务要求交给 Claude 评审
// 密钥：platform/.env 里写 ANTHROPIC_API_KEY=...，或者用过 `ant auth login` 也行。
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { execSync, exec as execCb } from 'node:child_process'
import { promisify } from 'node:util'
const execAsync = promisify(execCb)
import { fileURLToPath } from 'node:url'
import Anthropic from '@anthropic-ai/sdk'
import { runTool } from './tools.mjs'
import { step, agentModel, provider } from './agent.mjs'
import { NEBIUS_BASE, NEBIUS_MODELS, DIAGNOSE_SYSTEM, DIAGNOSE_SYSTEM_EN } from '../shared/spec.mjs'
import { usageRecord } from '../shared/spec.mjs'
import { rest, authAdmin, hasService } from '../../api/_lib.js'
import { ROOT } from './tools.mjs'


const here = path.dirname(fileURLToPath(import.meta.url))
const envFile = path.join(here, '..', '.env')
// 本地模式的用量：追加到 platform/usage.jsonl
const USAGE_FILE = path.join(here, '..', 'usage.jsonl')
function logUsage(rec) { try { fs.appendFileSync(USAGE_FILE, JSON.stringify({ ts: new Date().toISOString(), ...rec }) + '\n') } catch { /* ignore */ } }
function readUsage(days) {
  const since = Date.now() - days * 864e5
  try { return fs.readFileSync(USAGE_FILE, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)).filter((r) => new Date(r.ts).getTime() >= since).reverse() } catch { return [] }
}
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}

const MODEL = process.env.REVIEW_MODEL || 'claude-opus-5'
let client = null
function getClient() {
  if (!client) client = new Anthropic()
  return client
}
function hasCredentials() {
  if (process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN) return true
  try {
    const cfg = path.join(process.env.HOME || '', '.config', 'anthropic')
    return fs.existsSync(cfg) && fs.readdirSync(cfg).length > 0
  } catch { return false }
}

function sh(cmd) {
  try { return execSync(cmd, { encoding: 'utf8', timeout: 15000, stdio: ['ignore', 'pipe', 'ignore'], env: { ...process.env, PATH: process.env.HOME + '/.local/bin:' + process.env.PATH } }).trim() } catch { return '' }
}

// 状态：USB 扫描（system_profiler）很慢，后台每 6 秒扫一次，接口直接回缓存
let usbCache = { ports: [], usb: [], pio: null, at: 0 }
const shA = async (cmd) => { try { const { stdout } = await execAsync(cmd, { encoding: 'utf8', timeout: 20000, env: { ...process.env, PATH: process.env.HOME + '/.local/bin:' + process.env.PATH } }); return stdout.trim() } catch { return '' } }
let scanning = false
async function scanUsb() {
  if (scanning) return; scanning = true
  try {
    const ports = (await shA('ls /dev/cu.* 2>/dev/null')).split('\n').filter((p) => p && !/Bluetooth|debug-console/i.test(p))
    const usb = (await shA("system_profiler SPUSBDataType 2>/dev/null | grep -i -E 'st-link|stlink|stm32|ch340|cp210|ftdi|usb serial' | sed 's/^ *//'")).split('\n').filter(Boolean)
    const pio = usbCache.pio ?? ((await shA('command -v pio')) ? await shA('pio --version') : null)
    usbCache = { ports, usb, pio, at: Date.now() }
  } finally { scanning = false }
}
scanUsb(); setInterval(scanUsb, 6000)
function status() {
  return { pio: usbCache.pio, node: process.version, ports: usbCache.ports, usb: usbCache.usb, ai: provider() === 'mock' ? null : agentModel(), mode: 'local', time: new Date().toISOString() }
}

const SYSTEM = `你是一位有耐心的嵌入式导师，在辅导一个零基础、非科班、但很聪明的成年人学 STM32。
对方用 Arduino 框架（STM32duino）写代码，可能在浏览器里的模拟器上跑，也可能烧进真板子。

评审原则：
- 先说这段代码能不能达到任务目标，再说问题。用中文，讲人话，比喻优先于术语。
- 问题按严重程度排：会导致不工作的 > 真板子上会出事的（比如没串限流电阻、没开时钟）> 风格。
- 每个问题给一句"为什么"，不要只说"应该这样"。
- 最多指出 3 个最重要的问题，不要面面俱到。
- 如果代码是对的，说清楚它为什么对，然后给一个"下一步可以试试"的延伸。
- 不要重写整段代码，只给需要改的那几行。
- 结尾用一行"🎯 验收：…"总结这段代码是否满足任务卡的验收标准。
用 markdown，短段落。`

async function review(body) {
  const { code, task, rubric, log } = body
  const user = [
    `## 任务`, task || '（未提供）',
    rubric ? `\n## 验收标准\n${rubric}` : '',
    `\n## 学员的代码\n\`\`\`cpp\n${code}\n\`\`\``,
    log ? `\n## 模拟器运行输出（最近）\n\`\`\`\n${log}\n\`\`\`` : '',
  ].join('\n')
  const res = await getClient().messages.create({
    model: MODEL,
    max_tokens: 4000,
    system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: user }],
  })
  if (res.stop_reason === 'refusal') return { error: '模型拒绝了这个请求：' + (res.stop_details?.explanation ?? '') }
  const text = res.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n')
  return { review: text, model: res.model, usage: res.usage }
}

// 用户给某个元件传实物照片时，先让模型核对"照片里的真是这个零件吗"。
// 故意不做成硬拦截：模型看走眼是常事（见 content/prompts/04-ai-lies.md），
// 所以只给判断和理由，最终留给用户决定。
const IDENTIFY_SYSTEM = `你在帮一个零基础的人核对手里的电子元件。用户说某张照片是某个零件，你要判断照片里的东西是不是它。
判断依据：外形、颜色、接口针数、丝印、明显特征。看不清就说看不清，不要硬猜。
只输出 JSON，不要别的：{"match": true/false/null, "says": "一两句话说明，讲人话", "looks_like": "如果不是，你觉得它更像什么，否则空字符串"}
match 为 null 表示照片看不清或信息不足。says 用用户的语言（lang 字段给出）。`

async function identify(body) {
  const { name, expect = '', pins = '', image, lang = 'zh' } = body
  if (!image) return { error: 'no-image' }
  const m = /^data:(image\/[a-z+]+);base64,(.+)$/i.exec(image)
  if (!m) return { error: 'bad-image' }
  const text = [
    `用户说这张照片里是：${name}`,
    expect ? `这个零件应该长这样：${expect}` : '',
    pins ? `它的引脚/接口应该是：${pins}` : '',
    `lang: ${lang}`,
  ].filter(Boolean).join('\n')

  let out
  if (provider() === 'nebius') {
    // Nemotron 不收图片，换同在 Nebius 上的视觉模型
    const r = await fetch(`${(process.env.NEBIUS_BASE_URL || NEBIUS_BASE).trim()}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${(process.env.NEBIUS_API_KEY || '').trim()}` },
      body: JSON.stringify({
        model: (process.env.VISION_MODEL || NEBIUS_MODELS.vision).trim(), max_tokens: 600,
        messages: [
          { role: 'system', content: IDENTIFY_SYSTEM },
          { role: 'user', content: [{ type: 'image_url', image_url: { url: image } }, { type: 'text', text }] },
        ],
      }),
    })
    if (!r.ok) return { error: `nebius-${r.status}` }
    out = ((await r.json()).choices?.[0]?.message?.content ?? '').trim()
  } else if (provider() === 'openai') {
    const base = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
    const r = await fetch(`${base}/responses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: agentModel(), instructions: IDENTIFY_SYSTEM, max_output_tokens: 600,
        input: [{ role: 'user', content: [{ type: 'input_image', image_url: image }, { type: 'input_text', text }] }],
      }),
    })
    if (!r.ok) return { error: `openai-${r.status}` }
    const j = await r.json()
    out = (j.output ?? []).flatMap((o) => o.content ?? []).filter((c) => c.type === 'output_text').map((c) => c.text).join('').trim()
  } else {
    const res = await getClient().messages.create({
      model: MODEL,
      max_tokens: 600,
      system: [{ type: 'text', text: IDENTIFY_SYSTEM, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: [
        { type: 'image', source: { type: 'base64', media_type: m[1], data: m[2] } },
        { type: 'text', text },
      ] }],
    })
    if (res.stop_reason === 'refusal') return { error: 'refused' }
    out = res.content.filter((b) => b.type === 'text').map((b) => b.text).join('').trim()
  }
  try { return JSON.parse(out.replace(/^```json\s*|\s*```$/g, '')) }
  catch { return { match: null, says: out.slice(0, 300), looks_like: '' } }
}

// 排障：烧进去了却不工作。这是整条链路上最难的一步，也是唯一值得上 Ultra 的地方——
// 要同时把供电、接线、电平、时序、代码摆在一起比，而不是顺着一条线往下走。
async function diagnose(body) {
  const { symptom, code = '', serial = '', board = '', profile = '', wiring = '', tried = '', kb = '', lang = 'zh' } = body
  if (!symptom) return { error: 'no-symptom' }
  const L = lang === 'en'
  const user = [
    L ? `## What the user sees\n${symptom}` : `## 现象\n${symptom}`,
    board ? (L ? `\n## Board\n${board}` : `\n## 板子\n${board}`) : '',
    profile ? (L ? `\n## Board profile — THE ONLY source of truth for pins and logic levels\n${profile.slice(0, 5000)}`
                 : `\n## 板子档案 —— 引脚和电平只能以这里为准\n${profile.slice(0, 5000)}`) : '',
    wiring ? (L ? `\n## Wiring as known\n${wiring}` : `\n## 已知接线\n${wiring}`) : '',
    serial ? (L ? `\n## Serial output\n\`\`\`\n${serial.slice(0, 3000)}\n\`\`\`` : `\n## 串口输出\n\`\`\`\n${serial.slice(0, 3000)}\n\`\`\``)
           : (L ? '\n## Serial output\n(nothing — note that this is itself evidence)' : '\n## 串口输出\n（什么都没有——注意这本身就是证据）'),
    code ? (L ? `\n## Code on the board\n\`\`\`cpp\n${code.slice(0, 6000)}\n\`\`\`` : `\n## 板子上的代码\n\`\`\`cpp\n${code.slice(0, 6000)}\n\`\`\``) : '',
    tried ? (L ? `\n## Already ruled out\n${tried}` : `\n## 已经排除\n${tried}`) : '',
    kb ? (L ? `\n## Related entries from the troubleshooting library\n${kb.slice(0, 4000)}` : `\n## 排障库里的相关条目\n${kb.slice(0, 4000)}`) : '',
  ].filter(Boolean).join('\n')
  const system = L ? DIAGNOSE_SYSTEM_EN : DIAGNOSE_SYSTEM

  if (provider() === 'nebius') {
    const model = (process.env.DIAGNOSE_MODEL || NEBIUS_MODELS.ultra).trim()
    const r = await fetch(`${(process.env.NEBIUS_BASE_URL || NEBIUS_BASE).trim()}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${(process.env.NEBIUS_API_KEY || '').trim()}` },
      // Ultra 是推理模型：思考走 reasoning_content，正文走 content。
      // max_tokens 给小了会在推理阶段就被截断，思考过程溢进正文（实测 2000 不够）。
      body: JSON.stringify({ model, max_tokens: 6000, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }),
    })
    if (!r.ok) return { error: `nebius-${r.status}: ${(await r.text()).slice(0, 200)}` }
    const j = await r.json()
    const msg = j.choices?.[0]?.message ?? {}
    const analysis = (msg.content ?? '').trim()
    if (!analysis) return { error: 'empty-answer' }   // 还在推理就没额度了
    // 推理过程单独带出来：这是教学平台，"看它怎么想的"本身有价值
    return { analysis, reasoning: (msg.reasoning_content ?? '').trim() || undefined, model }
  }
  if (provider() === 'openai') {
    const base = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
    const r = await fetch(`${base}/responses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({ model: agentModel(), instructions: system, max_output_tokens: 2000, input: [{ role: 'user', content: user }] }),
    })
    if (!r.ok) return { error: `openai-${r.status}` }
    const j = await r.json()
    const text = (j.output ?? []).flatMap((o) => o.content ?? []).filter((c) => c.type === 'output_text').map((c) => c.text).join('').trim()
    return { analysis: text, model: agentModel() }
  }
  const res = await getClient().messages.create({
    model: MODEL, max_tokens: 2000,
    system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: user }],
  })
  return { analysis: res.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim(), model: MODEL }
}

function json(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' })
  res.end(JSON.stringify(obj))
}

http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type', 'Access-Control-Allow-Methods': 'GET,POST' })
    return res.end()
  }
  try {
    if (req.url === '/api/status' && req.method === 'GET') return json(res, 200, status())
    if (req.url === '/api/agent/step' && req.method === 'POST') {
      let raw = ''
      for await (const chunk of req) raw += chunk
      const body = JSON.parse(raw)
      const mock = provider() === 'mock' || !!body.mock
      const out = await step({ messages: body.messages, mock, lang: body.lang })
      if (!mock && out.usage) logUsage(usageRecord(agentModel(), out.usage, { email: 'local', mode: 'local', lang: body.lang ?? 'zh', tool_calls: out.content.filter((c) => c.type === 'tool_use').length }))
      return json(res, 200, { ...out, mock, agentModel: mock ? 'mock' : agentModel(), mode: 'local' })
    }
    if (req.url === '/api/admin/me') return json(res, 200, { role: 'admin', email: 'local' })
    if (req.url.startsWith('/api/admin/usage')) {
      const days = Number(new URL(req.url, 'http://x').searchParams.get('days') || 30)
      const rows = readUsage(days)
      const agg = (key) => { const m = {}; for (const r of rows) { const k = key(r) ?? '—'; const a = (m[k] ??= { key: k, calls: 0, input: 0, output: 0, cached: 0, cost: 0 }); a.calls++; a.input += r.input_tokens; a.output += r.output_tokens; a.cached += r.cached_tokens; a.cost += Number(r.cost_usd) }; return Object.values(m) }
      const total = { calls: rows.length, input: 0, output: 0, cached: 0, cost: 0 }
      for (const r of rows) { total.input += r.input_tokens; total.output += r.output_tokens; total.cached += r.cached_tokens; total.cost += Number(r.cost_usd) }
      const today = new Date().toISOString().slice(0, 10), week = new Date(Date.now() - 7 * 864e5).toISOString()
      const sum = (f) => rows.filter(f).reduce((s, r) => s + Number(r.cost_usd), 0)
      return json(res, 200, { days, total, today_cost: sum((r) => r.ts.startsWith(today)), week_cost: sum((r) => r.ts >= week), by_day: agg((r) => r.ts.slice(0, 10)).sort((a, b) => a.key.localeCompare(b.key)), by_user: agg((r) => r.email), by_model: agg((r) => r.model), recent: rows.slice(0, 50) })
    }
    if (req.url.startsWith('/api/admin/users')) {
      // 本地模式：用 .env 里的服务密钥直接管线上账号（和 Vercel 函数同一套逻辑，只是不需要登录）
      if (!hasService()) return json(res, 200, { error: '需要 platform/.env 里的 VITE_SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY' })
      let raw = ''; for await (const chunk of req) raw += chunk
      const body = raw ? JSON.parse(raw) : {}
      try {
        if (req.method === 'GET') {
          const list = await authAdmin('users?per_page=1000'); const users = list.users ?? list ?? []
          const profiles = await rest('profiles?select=*'); const pmap = Object.fromEntries(profiles.map((p) => [p.user_id, p]))
          const since = new Date(Date.now() - 30 * 864e5).toISOString()
          const usage = await rest(`usage_log?select=user_id,cost_usd,input_tokens,output_tokens&ts=gte.${since}&limit=10000`)
          const umap = {}; for (const r of usage) { const u = (umap[r.user_id] ??= { cost: 0, tokens: 0, calls: 0 }); u.cost += Number(r.cost_usd); u.tokens += r.input_tokens + r.output_tokens; u.calls++ }
          return json(res, 200, { users: users.map((u) => ({ id: u.id, email: u.email, created_at: u.created_at, last_sign_in_at: u.last_sign_in_at, role: pmap[u.id]?.role ?? 'user', disabled: pmap[u.id]?.disabled ?? false, display_name: pmap[u.id]?.display_name ?? '', usage30: umap[u.id] ?? { cost: 0, tokens: 0, calls: 0 } })) })
        }
        if (req.method === 'POST') {
          const { email, password, role = 'user', display_name = '' } = body
          if (!email || !password || password.length < 6) return json(res, 400, { error: 'email + password(>=6) required' })
          const u = await authAdmin('users', { method: 'POST', body: JSON.stringify({ email, password, email_confirm: true }) })
          await rest('profiles', { method: 'POST', prefer: 'resolution=merge-duplicates,return=representation', body: JSON.stringify({ user_id: u.id, email, role, display_name }) })
          return json(res, 200, { ok: true, id: u.id })
        }
        if (req.method === 'PATCH') {
          const { user_id, role, disabled, display_name } = body
          const patch = {}; if (role) patch.role = role; if (typeof disabled === 'boolean') patch.disabled = disabled; if (typeof display_name === 'string') patch.display_name = display_name
          await rest('profiles', { method: 'POST', prefer: 'resolution=merge-duplicates,return=representation', body: JSON.stringify({ user_id, ...patch }) })
          if (typeof disabled === 'boolean') await authAdmin(`users/${user_id}`, { method: 'PUT', body: JSON.stringify({ ban_duration: disabled ? '876000h' : 'none' }) })
          return json(res, 200, { ok: true })
        }
      } catch (e) { return json(res, 500, { error: e.message }) }
    }
    if (req.url.startsWith('/api/firmware')) {
      // 本地模式：把 pio_build 编好的固件按云编译的格式返回，给浏览器烧录用
      const project = new URL(req.url, 'http://x').searchParams.get('project') || ''
      const dir = path.join(ROOT, project.replace(/^\/+/, ''))
      if (!project.startsWith('firmware/') || project.includes('..')) return json(res, 400, { error: 'bad project' })
      const buildDir = path.join(dir, '.pio', 'build')
      const envs = fs.existsSync(buildDir) ? fs.readdirSync(buildDir).filter((e) => fs.existsSync(path.join(buildDir, e, 'firmware.bin'))) : []
      if (!envs.length) return json(res, 200, { ok: false, error: '还没编译过，先 pio_build' })
      const ini = fs.existsSync(path.join(dir, 'platformio.ini')) ? fs.readFileSync(path.join(dir, 'platformio.ini'), 'utf8') : ''
      const platform = /espressif32/.test(ini) ? 'espressif32' : /atmelavr/.test(ini) ? 'atmelavr' : 'ststm32'
      const b = path.join(buildDir, envs[0])
      const images = []
      const add = (file, addr) => { const p2 = path.join(b, file); if (fs.existsSync(p2)) { const buf = fs.readFileSync(p2); images.push({ name: file, addr, size: buf.length, b64: buf.toString('base64') }) } }
      if (platform === 'espressif32') { add('bootloader.bin', 0x1000); add('partitions.bin', 0x8000); const boot0 = path.join(process.env.HOME, '.platformio', 'packages', 'framework-arduinoespressif32', 'tools', 'partitions', 'boot_app0.bin'); if (fs.existsSync(boot0)) { const buf = fs.readFileSync(boot0); images.push({ name: 'boot_app0.bin', addr: 0xe000, size: buf.length, b64: buf.toString('base64') }) } add('firmware.bin', 0x10000) }
      else add('firmware.bin', 0x08000000)
      return json(res, 200, { ok: images.length > 0, board: envs[0], platform, images })
    }
    if (req.url === '/api/tool' && req.method === 'POST') {
      let raw = ''
      for await (const chunk of req) raw += chunk
      const { name, input } = JSON.parse(raw)
      try { return json(res, 200, { result: await runTool(name, input) }) }
      catch (e) { return json(res, 200, { result: '工具执行失败：' + e.message, is_error: true }) }
    }
    if (req.url === '/api/review' && req.method === 'POST') {
      if (!hasCredentials()) return json(res, 200, { error: 'no-credentials' })
      let raw = ''
      for await (const chunk of req) raw += chunk
      return json(res, 200, await review(JSON.parse(raw)))
    }
    if (req.url === '/api/diagnose' && req.method === 'POST') {
      if (provider() === 'mock' || (provider() === 'anthropic' && !hasCredentials())) return json(res, 200, { error: 'no-credentials' })
      let raw = ''
      for await (const chunk of req) raw += chunk
      return json(res, 200, await diagnose(JSON.parse(raw)))
    }
    if (req.url === '/api/identify' && req.method === 'POST') {
      // 看图用的是"直接做"那套 provider，不是只认 Anthropic 的评审凭据
      if (provider() === 'mock' || (provider() === 'anthropic' && !hasCredentials())) return json(res, 200, { error: 'no-credentials' })
      let raw = ''
      for await (const chunk of req) raw += chunk
      return json(res, 200, await identify(JSON.parse(raw)))
    }
    json(res, 404, { error: 'not found' })
  } catch (e) {
    console.error(e)
    json(res, 500, { error: e.message })
  }
}).listen(5174, () => console.log('  ➜  embeded server: http://localhost:5174  (agent: ' + (provider() === 'mock' ? '演示剧本' : provider() + ' / ' + agentModel()) + ')'))
