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

const here = path.dirname(fileURLToPath(import.meta.url))
const envFile = path.join(here, '..', '.env')
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
      return json(res, 200, { ...(await step({ messages: body.messages, mock })), mock, agentModel: mock ? 'mock' : agentModel(), mode: 'local' })
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
