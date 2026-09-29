// 平台的本地小服务（端口 5174）。两件事：
//   GET  /api/status   机器状态：pio 装了没、有没有串口设备（板子插上了没）
//   POST /api/review   把用户代码 + 任务要求交给 Claude 评审
// 密钥：platform/.env 里写 ANTHROPIC_API_KEY=...，或者用过 `ant auth login` 也行。
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import Anthropic from '@anthropic-ai/sdk'
import { runTool } from './tools.mjs'
import { step, agentModel, provider } from './agent.mjs'
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
  try { return execSync(cmd, { encoding: 'utf8', timeout: 4000, stdio: ['ignore', 'pipe', 'ignore'], env: { ...process.env, PATH: process.env.HOME + '/.local/bin:' + process.env.PATH } }).trim() } catch { return '' }
}

function status() {
  const ports = sh('ls /dev/cu.* 2>/dev/null').split('\n').filter((p) => p && !/Bluetooth|debug-console/i.test(p))
  const usb = sh("system_profiler SPUSBDataType 2>/dev/null | grep -i -E 'st-link|stlink|stm32|ch340|cp210|ftdi|usb serial' | sed 's/^ *//'")
    .split('\n').filter(Boolean)
  return {
    pio: sh('command -v pio') ? sh('pio --version') : null,
    node: process.version,
    ports,
    usb,
    ai: provider() === 'mock' ? null : agentModel(),
    mode: 'local',
    time: new Date().toISOString(),
  }
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
    json(res, 404, { error: 'not found' })
  } catch (e) {
    console.error(e)
    json(res, 500, { error: e.message })
  }
}).listen(5174, () => console.log('  ➜  embeded server: http://localhost:5174  (agent: ' + (provider() === 'mock' ? '演示剧本' : provider() + ' / ' + agentModel()) + ')'))
