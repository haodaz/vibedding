// "直接做"的服务端工具。每个工具：{ name, description, input_schema, run(input) -> string }
// 客户端工具（sim_run、ask_human）只在这里声明 schema，执行在浏览器。
import fs from 'node:fs/promises'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
import { SERVER_TOOL_SCHEMAS, toolDefsFor } from '../shared/spec.mjs'

const exec = promisify(execFile)
const here = path.dirname(fileURLToPath(import.meta.url))
export const ROOT = path.join(here, '..', '..')            // embeded/
const ALLOWED_WRITE = ['firmware', 'content/journal', 'content/hardware', 'content/projects']
const ALLOWED_READ = ['firmware', 'content', 'tools', 'docs']
const CATALOG = path.join(ROOT, 'content/hardware/parts-catalog.json')
const INVENTORY = path.join(ROOT, 'content/hardware/inventory.json')
const PROJECTS = path.join(ROOT, 'content/projects')
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'project'
const readJson = async (f) => JSON.parse(await fs.readFile(f, 'utf8'))

function safe(rel, allowed) {
  const p = path.normalize(rel).replace(/^(\.\.(\/|\\|$))+/, '')
  if (!allowed.some((a) => p === a || p.startsWith(a + '/'))) throw new Error(`不允许访问 ${rel}，只能在 ${allowed.join(' / ')} 里`)
  return path.join(ROOT, p)
}
async function sh(cmd, args, cwd, timeout = 180000) {
  try {
    const { stdout, stderr } = await exec(cmd, args, { cwd, timeout, maxBuffer: 4e6, env: { ...process.env, PATH: process.env.HOME + '/.local/bin:' + process.env.HOME + '/.platformio/penv/bin:' + process.env.PATH + ':/usr/local/bin:/opt/homebrew/bin' } })
    return { ok: true, out: (stdout + '\n' + stderr).trim() }
  } catch (e) {
    return { ok: false, out: ((e.stdout ?? '') + '\n' + (e.stderr ?? '') + '\n' + e.message).trim() }
  }
}
const tail = (s, n = 60) => s.split('\n').slice(-n).join('\n')

export const TOOLS = [
  {
    name: 'read_pinout',
    run: async ({ filter }) => {
      const j = JSON.parse(await fs.readFile(path.join(ROOT, 'content/hardware/bluepill-pins.json'), 'utf8'))
      const all = [...j.left, ...j.right, ...j.bottom]
      const rows = all.filter((p) => !filter || p.funcs.some((f) => f.toUpperCase().includes(filter.toUpperCase())))
      return `${j.board}（${j.note}）\n` + rows.map((p) => `${p.name}: ${p.funcs.join(', ')}${p.note ? ' — ' + p.note : ''}${p.verified ? ' [已核对]' : ''}`).join('\n')
    },
  },
  {
    name: 'read_board',
    run: async () => fs.readFile(path.join(ROOT, 'content/hardware/board.md'), 'utf8'),
  },
  {
    name: 'list_parts',
    run: async () => {
      const m = JSON.parse(await fs.readFile(path.join(ROOT, 'content/art/manifest.json'), 'utf8'))
      return m.parts.map((p) => `${p.name.replace(/^part_/, '')}: ${p.label} — ${p.what}`).join('\n')
    },
  },
  {
    name: 'check_env',
    run: async () => {
      const pio = await sh('sh', ['-c', 'command -v pio && pio --version'], ROOT, 10000)
      const ports = await sh('sh', ['-c', 'ls /dev/cu.* 2>/dev/null | grep -v Bluetooth'], ROOT, 5000)
      const usb = await sh('sh', ['-c', "system_profiler SPUSBDataType 2>/dev/null | grep -i -E 'st-link|stlink|stm32|ch340|cp210|ftdi' | sed 's/^ *//'"], ROOT, 15000)
      return `PlatformIO: ${pio.ok ? pio.out : '未安装（需要用户运行 bash tools/setup-mac.sh）'}\n串口设备: ${ports.out || '无'}\nUSB: ${usb.out || '没看到 ST-Link / 串口芯片'}`
    },
  },
  {
    name: 'read_file',
    run: async ({ path: p }) => fs.readFile(safe(p, ALLOWED_READ), 'utf8'),
  },
  {
    name: 'list_files',
    run: async ({ path: p }) => (await fs.readdir(safe(p, ALLOWED_READ), { withFileTypes: true })).map((d) => (d.isDirectory() ? d.name + '/' : d.name)).join('\n'),
  },
  {
    name: 'write_firmware',
    run: async ({ path: p, content }) => {
      const abs = safe(p, ['firmware'])
      await fs.mkdir(path.dirname(abs), { recursive: true })
      await fs.writeFile(abs, content)
      return `已写入 ${p}（${content.length} 字符）`
    },
  },
  {
    name: 'pio_build',
    run: async ({ project }) => { const r = await sh('pio', ['run'], safe(project, ['firmware']), 300000); return (r.ok ? '编译成功\n' : '编译失败\n') + tail(r.out) },
  },
  {
    name: 'pio_upload',
    run: async ({ project }) => { const r = await sh('pio', ['run', '-t', 'upload'], safe(project, ['firmware']), 300000); return (r.ok ? '烧录成功\n' : '烧录失败\n') + tail(r.out) },
  },
  {
    name: 'serial_read',
    run: async ({ seconds = 3, baud = 115200, port }) => {
      // pio device monitor 不能脚本化，用 PlatformIO 自带 python 的 pyserial 直接读
      const py = process.env.HOME + '/.local/share/uv/tools/platformio/bin/python'
      const ports = (await sh('sh', ['-c', 'ls /dev/cu.* 2>/dev/null | grep -v -i bluetooth | grep -v debug-console'], ROOT, 5000)).out.split('\n').filter(Boolean)
      const p = port || ports[0]
      if (!p) return '没有找到串口设备（板子插上了吗？）'
      const r = await sh(py, [path.join(ROOT, 'tools', 'serial-read.py'), p, String(baud), String(seconds)], ROOT, (seconds + 8) * 1000)
      return r.out ? `串口 ${p} @${baud}，${seconds} 秒：\n` + tail(r.out, 40) : `（${p} 这段时间没有输出）`
    },
  },
  {
    name: 'append_journal',
    run: async ({ title, body }) => {
      const d = new Date(); const day = d.toISOString().slice(0, 10)
      const file = path.join(ROOT, 'content/journal', `${day}.md`)
      let cur = await fs.readFile(file, 'utf8').catch(() => `---\ntitle: ${day} 的日志\ndate: ${day}\nmood: 🤖\nsummary: 和 AI 一起做东西\n---\n`)
      cur += `\n## ${title}（${d.toTimeString().slice(0, 5)} · 直接做）\n${body}\n`
      await fs.writeFile(file, cur)
      return `已记入 content/journal/${day}.md`
    },
  },
  {
    name: 'record_ai_mistake',
    run: async ({ mistake, prevention }) => {
      const file = path.join(ROOT, 'content/prompts/04-ai-lies.md')
      let s = await fs.readFile(file, 'utf8')
      s = s.replace(/(\| 波特率、I2C 地址"想当然" \| 用扫描程序\/实测确认 \|)/, `$1\n| ${mistake.replace(/\|/g, '/')} | ${prevention.replace(/\|/g, '/')} |`)
      await fs.writeFile(file, s)
      return '已记录'
    },
  },
  // ---------- 元件知识库 / 库存 ----------
  {
    name: 'search_parts',
    run: async ({ query = '' }) => {
      const { parts } = await readJson(CATALOG)
      const q = query.trim().toLowerCase()
      const hit = parts.filter((p) => !q || [p.id, p.name, p.cat, p.iface, p.note, p.buy, p.lib].join(' ').toLowerCase().includes(q))
      if (!hit.length) return `知识库里没有和"${query}"相关的条目（共 ${parts.length} 条）。可以照常推荐，但标 catalog=false 并提醒用户核对；确认后用 add_part 收录。`
      return hit.map((p) => `[${p.id}] ${p.name} · ${p.cat} · 接口 ${p.iface} · ${p.volt} · ¥${p.price} · 搜"${p.buy}" · 库: ${p.lib}${p.note ? ' · ' + p.note : ''}`).join('\n')
    },
  },
  {
    name: 'add_part',
    run: async (p) => {
      const j = await readJson(CATALOG)
      if (j.parts.some((x) => x.id === p.id)) return `已有 ${p.id}，没有重复添加`
      j.parts.push({ lib: '', note: '', ...p })
      await fs.writeFile(CATALOG, JSON.stringify(j, null, 2) + '\n')
      return `已收录 ${p.name}（${p.id}）`
    },
  },
  {
    name: 'read_inventory',
    run: async () => { const j = await readJson(INVENTORY); return j.have.length ? j.have.map((h) => `${h.id ?? ''} ${h.name ?? ''} x${h.qty ?? 1}${h.note ? ' — ' + h.note : ''}`.trim()).join('\n') : '库存是空的（还没聊出来用户有什么）' },
  },
  {
    name: 'update_inventory',
    run: async ({ action, id, name, qty = 1, note = '' }) => {
      const j = await readJson(INVENTORY)
      if (action === 'remove') j.have = j.have.filter((h) => h.id !== id && h.name !== name)
      else { const cur = j.have.find((h) => (id && h.id === id) || h.name === name); if (cur) { cur.qty = qty; cur.note = note || cur.note } else j.have.push({ id: id || undefined, name, qty, note }) }
      await fs.writeFile(INVENTORY, JSON.stringify(j, null, 2) + '\n')
      return `库存已更新：${action} ${name} x${qty}`
    },
  },
  // ---------- 项目 ----------
  {
    name: 'save_project',
    run: async ({ slug, title, brief, bom, plan }) => {
      const dir = path.join(PROJECTS, slugify(slug)); await fs.mkdir(dir, { recursive: true })
      const fm = (extra = '') => `---\ntitle: ${title}\nupdated: ${new Date().toISOString().slice(0, 10)}\n${extra}---\n`
      if (brief !== undefined) await fs.writeFile(path.join(dir, 'brief.md'), fm() + brief + '\n')
      if (bom !== undefined) await fs.writeFile(path.join(dir, 'bom.md'), fm() + bom + '\n')
      if (plan !== undefined) await fs.writeFile(path.join(dir, 'plan.md'), fm() + plan + '\n')
      return `项目已保存到 content/projects/${slugify(slug)}/（${[brief !== undefined && 'brief', bom !== undefined && 'bom', plan !== undefined && 'plan'].filter(Boolean).join(', ')}）`
    },
  },
  {
    name: 'list_projects',
    run: async () => {
      const dirs = await fs.readdir(PROJECTS, { withFileTypes: true }).catch(() => [])
      const out = []
      for (const d of dirs) {
        if (!d.isDirectory()) continue
        const plan = await fs.readFile(path.join(PROJECTS, d.name, 'plan.md'), 'utf8').catch(() => '')
        const brief = await fs.readFile(path.join(PROJECTS, d.name, 'brief.md'), 'utf8').catch(() => '')
        const title = (brief.match(/^title:\s*(.+)$/m) ?? plan.match(/^title:\s*(.+)$/m))?.[1] ?? d.name
        const done = (plan.match(/- \[x\]/gi) ?? []).length, total = (plan.match(/- \[[ x]\]/gi) ?? []).length
        out.push(`${d.name}: ${title}${total ? ` · ${done}/${total} 步` : ''}`)
      }
      return out.length ? out.join('\n') : '还没有项目'
    },
  },
  {
    name: 'read_project',
    run: async ({ slug }) => {
      const dir = path.join(PROJECTS, slugify(slug))
      const parts = []
      for (const f of ['brief.md', 'bom.md', 'plan.md']) { const t = await fs.readFile(path.join(dir, f), 'utf8').catch(() => null); if (t) parts.push(`## ${f}\n${t}`) }
      return parts.length ? parts.join('\n\n') : `没有项目 ${slug}`
    },
  },
]

TOOLS.push({
  name: 'add_troubleshooting',
  run: async ({ id, stage, symptom, signals = [], cause, check, fix, explain = '' }) => {
    const file = path.join(ROOT, 'content/knowledge/troubleshooting.json')
    const j = await readJson(file)
    if (j.entries.some((e) => e.id === id)) return `排障库已有 ${id}`
    j.entries.push({ id, stage, symptom, signals, causes: [{ cause, probability: '高', check, fix }], explain, ask_ai: `我的板子是 STM32F103C8T6 蓝药丸，PlatformIO + Arduino 框架。现象：${symptom}。请按概率列出原因和验证方法。` })
    await fs.writeFile(file, JSON.stringify(j, null, 2) + '\n')
    return `已记入排障库：${id}（重启平台后前端检索可见）`
  },
})

// 校验：每个 runner 都有 schema
for (const t of TOOLS) if (!SERVER_TOOL_SCHEMAS.some((x) => x.name === t.name)) throw new Error('缺 schema: ' + t.name)

export const toolDefs = () => toolDefsFor('local')
export async function runTool(name, input) {
  const t = TOOLS.find((x) => x.name === name)
  if (!t) throw new Error('未知工具 ' + name)
  return String(await t.run(input ?? {}))
}
