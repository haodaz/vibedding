// "直接做"的服务端工具。每个工具：{ name, description, input_schema, run(input) -> string }
// 客户端工具（sim_run、ask_human）只在这里声明 schema，执行在浏览器。
import fs from 'node:fs/promises'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'

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
    name: 'read_pinout', description: '读取当前板子（STM32F103C8T6 蓝药丸）的引脚表：每个脚能干什么、注意事项、是否已在真板子上核对。给出任何引脚号之前必须先查这个。',
    input_schema: { type: 'object', properties: { filter: { type: 'string', description: '可选，只看某类功能，如 UART / I2C / PWM / ADC / SWD / LED' } } },
    run: async ({ filter }) => {
      const j = JSON.parse(await fs.readFile(path.join(ROOT, 'content/hardware/bluepill-pins.json'), 'utf8'))
      const all = [...j.left, ...j.right, ...j.bottom]
      const rows = all.filter((p) => !filter || p.funcs.some((f) => f.toUpperCase().includes(filter.toUpperCase())))
      return `${j.board}（${j.note}）\n` + rows.map((p) => `${p.name}: ${p.funcs.join(', ')}${p.note ? ' — ' + p.note : ''}${p.verified ? ' [已核对]' : ''}`).join('\n')
    },
  },
  {
    name: 'read_board', description: '读取用户的板子档案 content/hardware/board.md（型号、板载 LED 引脚、烧录方式等，用户亲测填写）。',
    input_schema: { type: 'object', properties: {} },
    run: async () => fs.readFile(path.join(ROOT, 'content/hardware/board.md'), 'utf8'),
  },
  {
    name: 'list_parts', description: '列出套件里的元件（名字、干什么、对应任务）。需要用户拿出某个零件时，用这里的 name 引用它，指令卡会显示它的图。',
    input_schema: { type: 'object', properties: {} },
    run: async () => {
      const m = JSON.parse(await fs.readFile(path.join(ROOT, 'content/art/manifest.json'), 'utf8'))
      return m.parts.map((p) => `${p.name.replace(/^part_/, '')}: ${p.label} — ${p.what}`).join('\n')
    },
  },
  {
    name: 'check_env', description: '检查这台电脑的开发环境：PlatformIO 装了没、有没有串口设备/ST-Link 插着。决定"能不能真烧录"之前先查。',
    input_schema: { type: 'object', properties: {} },
    run: async () => {
      const pio = await sh('sh', ['-c', 'command -v pio && pio --version'], ROOT, 10000)
      const ports = await sh('sh', ['-c', 'ls /dev/cu.* 2>/dev/null | grep -v Bluetooth'], ROOT, 5000)
      const usb = await sh('sh', ['-c', "system_profiler SPUSBDataType 2>/dev/null | grep -i -E 'st-link|stlink|stm32|ch340|cp210|ftdi' | sed 's/^ *//'"], ROOT, 15000)
      return `PlatformIO: ${pio.ok ? pio.out : '未安装（需要用户运行 bash tools/setup-mac.sh）'}\n串口设备: ${ports.out || '无'}\nUSB: ${usb.out || '没看到 ST-Link / 串口芯片'}`
    },
  },
  {
    name: 'read_file', description: '读项目里的文件（firmware/、content/、tools/、docs/ 下）。',
    input_schema: { type: 'object', properties: { path: { type: 'string', description: '相对项目根目录，如 firmware/01-blink/src/main.cpp' } }, required: ['path'] },
    run: async ({ path: p }) => fs.readFile(safe(p, ALLOWED_READ), 'utf8'),
  },
  {
    name: 'list_files', description: '列目录（firmware/、content/ 下）。',
    input_schema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] },
    run: async ({ path: p }) => (await fs.readdir(safe(p, ALLOWED_READ), { withFileTypes: true })).map((d) => (d.isDirectory() ? d.name + '/' : d.name)).join('\n'),
  },
  {
    name: 'write_firmware', description: '写固件文件。只能写 firmware/ 下（会自动建目录）。新工程请同时写 platformio.ini（可参考 firmware/01-blink/platformio.ini）和 src/main.cpp。',
    input_schema: { type: 'object', properties: { path: { type: 'string', description: '如 firmware/02-light/src/main.cpp' }, content: { type: 'string' } }, required: ['path', 'content'] },
    run: async ({ path: p, content }) => {
      const abs = safe(p, ['firmware'])
      await fs.mkdir(path.dirname(abs), { recursive: true })
      await fs.writeFile(abs, content)
      return `已写入 ${p}（${content.length} 字符）`
    },
  },
  {
    name: 'pio_build', description: '用 PlatformIO 编译一个固件工程（firmware/xxx）。返回最后 60 行输出。',
    input_schema: { type: 'object', properties: { project: { type: 'string', description: '如 firmware/01-blink' } }, required: ['project'] },
    run: async ({ project }) => { const r = await sh('pio', ['run'], safe(project, ['firmware']), 300000); return (r.ok ? '编译成功\n' : '编译失败\n') + tail(r.out) },
  },
  {
    name: 'pio_upload', description: '编译并烧录到板子（pio run -t upload）。需要 ST-Link 或串口已连接。返回最后 60 行输出。',
    input_schema: { type: 'object', properties: { project: { type: 'string' } }, required: ['project'] },
    run: async ({ project }) => { const r = await sh('pio', ['run', '-t', 'upload'], safe(project, ['firmware']), 300000); return (r.ok ? '烧录成功\n' : '烧录失败\n') + tail(r.out) },
  },
  {
    name: 'serial_read', description: '读串口几秒钟（pio device monitor），看板子打印了什么。',
    input_schema: { type: 'object', properties: { seconds: { type: 'number', description: '默认 3' }, baud: { type: 'number', description: '默认 115200' } } },
    run: async ({ seconds = 3, baud = 115200 }) => {
      const r = await sh('sh', ['-c', `timeout ${seconds} pio device monitor -b ${baud} --quiet 2>&1 || true`], ROOT, (seconds + 5) * 1000)
      return r.out ? tail(r.out, 40) : '（这段时间串口没有输出）'
    },
  },
  {
    name: 'append_journal', description: '把这次做的事记进今天的学习日志（content/journal/）。做完一件事、或者踩了坑之后调用。',
    input_schema: { type: 'object', properties: { title: { type: 'string' }, body: { type: 'string', description: 'markdown，写"做了什么 / 卡在哪 / 学到一句话"' } }, required: ['title', 'body'] },
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
    name: 'record_ai_mistake', description: '当用户指出你说错了（引脚、库名、电平等），把它记到 content/prompts/04-ai-lies.md 的表格里。',
    input_schema: { type: 'object', properties: { mistake: { type: 'string' }, prevention: { type: 'string' } }, required: ['mistake', 'prevention'] },
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
    name: 'search_parts', description: '在元件知识库里搜（名字、类别、接口、用途关键词）。出采购清单前用它确认每件东西的价格区间、接口、电压、要用的库。空查询 = 列全部。',
    input_schema: { type: 'object', properties: { query: { type: 'string', description: '如 "温湿度" / "I2C" / "电机" / "传感器"' } } },
    run: async ({ query = '' }) => {
      const { parts } = await readJson(CATALOG)
      const q = query.trim().toLowerCase()
      const hit = parts.filter((p) => !q || [p.id, p.name, p.cat, p.iface, p.note, p.buy, p.lib].join(' ').toLowerCase().includes(q))
      if (!hit.length) return `知识库里没有和"${query}"相关的条目（共 ${parts.length} 条）。可以照常推荐，但标 catalog=false 并提醒用户核对；确认后用 add_part 收录。`
      return hit.map((p) => `[${p.id}] ${p.name} · ${p.cat} · 接口 ${p.iface} · ${p.volt} · ¥${p.price} · 搜"${p.buy}" · 库: ${p.lib}${p.note ? ' · ' + p.note : ''}`).join('\n')
    },
  },
  {
    name: 'add_part', description: '把一个新元件收进知识库（用户确认过、或你很确定的）。以后所有人都能查到。',
    input_schema: { type: 'object', properties: { id: { type: 'string', description: '英文短 id，如 sht40' }, name: { type: 'string' }, cat: { type: 'string', description: '主控/工具/被动/输入/传感器/显示/输出/执行/通信/存储/电源' }, iface: { type: 'string' }, volt: { type: 'string' }, price: { type: 'string', description: '元，区间如 "5-10"' }, buy: { type: 'string', description: '淘宝搜索词' }, lib: { type: 'string', description: 'Arduino 库或 API' }, note: { type: 'string' } }, required: ['id', 'name', 'cat', 'iface', 'volt', 'price', 'buy'] },
    run: async (p) => {
      const j = await readJson(CATALOG)
      if (j.parts.some((x) => x.id === p.id)) return `已有 ${p.id}，没有重复添加`
      j.parts.push({ lib: '', note: '', ...p })
      await fs.writeFile(CATALOG, JSON.stringify(j, null, 2) + '\n')
      return `已收录 ${p.name}（${p.id}）`
    },
  },
  {
    name: 'read_inventory', description: '看用户已经有哪些元件。出采购清单前必须先看，已有的不要让人重复买。',
    input_schema: { type: 'object', properties: {} },
    run: async () => { const j = await readJson(INVENTORY); return j.have.length ? j.have.map((h) => `${h.id ?? ''} ${h.name ?? ''} x${h.qty ?? 1}${h.note ? ' — ' + h.note : ''}`.trim()).join('\n') : '库存是空的（还没聊出来用户有什么）' },
  },
  {
    name: 'update_inventory', description: '用户提到自己有/买了/坏了某个元件，就更新库存。add=加，remove=删。',
    input_schema: { type: 'object', properties: { action: { type: 'string', enum: ['add', 'remove'] }, id: { type: 'string', description: '知识库 id，没有就留空' }, name: { type: 'string' }, qty: { type: 'number' }, note: { type: 'string' } }, required: ['action', 'name'] },
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
    name: 'save_project', description: '把一个需求存成项目（content/projects/<slug>/）：brief.md 需求与方案、bom.md 采购清单、plan.md 步骤与进度。已存在就覆盖对应文件（只传要更新的字段）。',
    input_schema: { type: 'object', properties: { slug: { type: 'string', description: '英文短名，如 auto-watering' }, title: { type: 'string' }, brief: { type: 'string', description: 'markdown：一句话需求、方案、约束' }, bom: { type: 'string', description: 'markdown 表格：件 / 数量 / 为什么 / 价格 / 搜索词 / 状态(已有|待买|已到)' }, plan: { type: 'string', description: 'markdown：- [ ] 步骤，完成的打 [x]' } }, required: ['slug', 'title'] },
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
    name: 'list_projects', description: '列出已有项目和各自进度（plan.md 里 [x] 的比例）。用户说"继续上次的"时先看这个。',
    input_schema: { type: 'object', properties: {} },
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
    name: 'read_project', description: '读一个项目的 brief / bom / plan。',
    input_schema: { type: 'object', properties: { slug: { type: 'string' } }, required: ['slug'] },
    run: async ({ slug }) => {
      const dir = path.join(PROJECTS, slugify(slug))
      const parts = []
      for (const f of ['brief.md', 'bom.md', 'plan.md']) { const t = await fs.readFile(path.join(dir, f), 'utf8').catch(() => null); if (t) parts.push(`## ${f}\n${t}`) }
      return parts.length ? parts.join('\n\n') : `没有项目 ${slug}`
    },
  },
]

// 客户端工具：在浏览器里执行
export const CLIENT_TOOLS = [
  {
    name: 'sim_run', description: '把 Arduino 风格代码放进浏览器里的虚拟蓝药丸跑几秒（不需要真板子）。返回引脚变化、串口输出、警告。适合在烧真板子之前先验证逻辑；用户没有板子或工具链时，这就是"烧录"。只支持教学子集：pinMode/digitalWrite/digitalRead/analogWrite/analogRead/delay/millis/Serial，不支持指针、struct、switch、中断。',
    input_schema: { type: 'object', properties: { code: { type: 'string' }, seconds: { type: 'number', description: '跑多久，默认 3' } }, required: ['code'] },
  },
  {
    name: 'ask_human', description: '需要用户在物理世界做事、或在你够不着的地方操作时调用。会弹出一张指令卡，暂停等用户回复。kind: wire=接线/拿零件（给 parts 和 wires 会画图）; press=按板子上的键; paste=让用户在终端跑命令或粘贴内容（给 paste）; observe=让用户观察并选择（给 options）。一次只问一件事，步骤要具体到"哪个脚插哪里"。',
    input_schema: {
      type: 'object',
      properties: {
        kind: { type: 'string', enum: ['wire', 'press', 'paste', 'observe'] },
        title: { type: 'string', description: '一句话，如"把 LED 接到 PA1"' },
        why: { type: 'string', description: '为什么要这么做，一两句人话' },
        steps: { type: 'array', items: { type: 'string' }, description: '具体步骤，每条一个动作' },
        parts: { type: 'array', items: { type: 'string' }, description: 'wire 用：涉及的元件 name（来自 list_parts），如 ["bluepill","led_red","resistor_220"]' },
        wires: { type: 'string', description: 'wire 用：接线描述，格式 "a.脚 > b.脚 #颜色 \\"备注\\"; ..."，如 "bluepill.PA1 > resistor_220.一端 #39c5ff; resistor_220.另一端 > led_red.长脚(+) #ff5c5c; led_red.短脚(-) > bluepill.GND #8b93a7"' },
        paste: { type: 'string', description: 'paste 用：要用户复制的命令或文本' },
        expect: { type: 'string', description: '做完后应该看到什么' },
        options: { type: 'array', items: { type: 'string' }, description: 'observe 用：可选答案，如 ["亮了","没亮","闪一下就灭"]' },
      },
      required: ['kind', 'title', 'steps'],
    },
  },
]

// 知识库检索工具：在浏览器里执行（知识库打包进前端，纯静态部署也能用）。实现见 platform/src/workshop/knowledge.ts
CLIENT_TOOLS.push(
  { name: 'search_projects', description: '在项目食谱库里找和用户需求最像的项目（零件、接线、分步、代码骨架、常见坑）。用户提出想做什么之后**第一步**先查这个，有相近的就以它为底稿改，不要从零瞎编。', input_schema: { type: 'object', properties: { query: { type: 'string', description: '关键词，如 "浇花 湿度 水泵"' }, max: { type: 'number' } }, required: ['query'] } },
  { name: 'search_troubleshooting', description: '排障库：症状/报错关键字 → 按概率排序的原因、一分钟验证法、解决办法。编译/烧录失败、灯不亮、串口乱码、传感器读不到时先查。', input_schema: { type: 'object', properties: { query: { type: 'string', description: '现象或报错关键字，如 "unknown chip id" / "串口乱码" / "舵机抖"' }, max: { type: 'number' } }, required: ['query'] } },
  { name: 'explain_concept', description: '术语表：一个概念的比喻、准确定义、常见误解、平台上的例子。给用户解释 PWM/上拉/I2C 这类词时用它，口径统一。', input_schema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } },
  { name: 'get_snippet', description: '代码片段库：按主题（GPIO/PWM/ADC/UART/I2C/舵机/定时/中断/状态机…）取一段可编译的最小程序和逐段解释。写固件前先取相近片段当底稿。', input_schema: { type: 'object', properties: { query: { type: 'string', description: '如 "按键去抖" / "OLED 显示" / "舵机"' }, max: { type: 'number' } }, required: ['query'] } },
  { name: 'list_boards', description: '列出平台支持的开发板（蓝药丸、Nucleo、ESP32、UNO…）和各自适合谁。用户手里不是蓝药丸时先看。', input_schema: { type: 'object', properties: {} } },
  { name: 'read_board_profile', description: '读某块板子的档案：platformio 配置、板载 LED、总线引脚、怎么烧录、坑、完整引脚表。用户用的不是蓝药丸时，引脚必须查这个而不是 read_pinout。', input_schema: { type: 'object', properties: { board: { type: 'string', description: 'bluepill / nucleo_f103rb / nucleo_f411re / esp32_devkit / arduino_uno' }, filter: { type: 'string', description: '可选，只看某类功能' } }, required: ['board'] } },
  { name: 'part_detail', description: '一个元件的完整档案：引脚标签、怎么接蓝药丸、最小代码、坑。写接线卡和代码前查。', input_schema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] } },
)

CLIENT_TOOLS.push({
  name: 'propose_bom', description: '给用户展示一张采购清单卡片（可勾选"已有"），等用户确认。先 read_inventory 和 search_parts，再调这个。返回用户勾选后的结果：哪些已有、哪些要买、总预算。确认后记得 save_project 存 bom 并 update_inventory。',
  input_schema: {
    type: 'object',
    properties: {
      title: { type: 'string', description: '项目名' },
      items: { type: 'array', items: { type: 'object', properties: {
        id: { type: 'string', description: '知识库 id，没有留空' }, name: { type: 'string' }, qty: { type: 'number' },
        role: { type: 'string', description: '在这个项目里干什么，一句话' }, why: { type: 'string', description: '为什么选它 / 替代品' },
        price: { type: 'string', description: '单价区间，元' }, buy: { type: 'string', description: '淘宝搜索词' },
        have: { type: 'boolean', description: '用户库存里已经有' }, catalog: { type: 'boolean', description: '是否在知识库里（不在要提醒核对）' },
        optional: { type: 'boolean', description: '可选件' },
      }, required: ['name', 'qty', 'role', 'price', 'buy'] } },
      note: { type: 'string', description: '整体提醒：供电、5V/3.3V、先买什么后买什么' },
    },
    required: ['title', 'items'],
  },
})

export const toolDefs = () => [...TOOLS, ...CLIENT_TOOLS].map(({ name, description, input_schema }) => ({ name, description, input_schema }))
export async function runTool(name, input) {
  const t = TOOLS.find((x) => x.name === name)
  if (!t) throw new Error('未知工具 ' + name)
  return String(await t.run(input ?? {}))
}
