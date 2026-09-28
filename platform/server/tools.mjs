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
const ALLOWED_WRITE = ['firmware', 'content/journal', 'content/hardware']
const ALLOWED_READ = ['firmware', 'content', 'tools', 'docs']

function safe(rel, allowed) {
  const p = path.normalize(rel).replace(/^(\.\.(\/|\\|$))+/, '')
  if (!allowed.some((a) => p === a || p.startsWith(a + '/'))) throw new Error(`不允许访问 ${rel}，只能在 ${allowed.join(' / ')} 里`)
  return path.join(ROOT, p)
}
async function sh(cmd, args, cwd, timeout = 180000) {
  try {
    const { stdout, stderr } = await exec(cmd, args, { cwd, timeout, maxBuffer: 4e6, env: { ...process.env, PATH: process.env.PATH + ':' + process.env.HOME + '/.platformio/penv/bin:' + process.env.HOME + '/Library/Python/3.12/bin:/usr/local/bin:/opt/homebrew/bin' } })
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

export const toolDefs = () => [...TOOLS, ...CLIENT_TOOLS].map(({ name, description, input_schema }) => ({ name, description, input_schema }))
export async function runTool(name, input) {
  const t = TOOLS.find((x) => x.name === name)
  if (!t) throw new Error('未知工具 ' + name)
  return String(await t.run(input ?? {}))
}
