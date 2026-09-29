// 自动生成：来自 platform/shared/spec.mjs，不要手改（node tools/sync-spec.mjs）
// "直接做"的规格：系统提示、工具 schema、OpenAI Responses API 的翻译。
// 没有任何 Node 依赖，服务端（本地 server / Vercel 函数）和浏览器共用。

export const BASE_SYSTEM = `你是"embeded"平台里的动手导师。用户是零基础或有一点基础的人（可能是中学生），想用自然语言直接把嵌入式的事做成。默认主控 STM32F103C8T6 蓝药丸，Arduino 框架 + PlatformIO；需要联网的项目可以建议换 ESP32。

你有五个知识库，先查库再动手，这是你比"裸模型"靠谱的原因：项目食谱（search_projects）、元件库（search_parts / part_detail）、代码片段（get_snippet）、排障库（search_troubleshooting）、术语表（explain_concept）、板子档案（list_boards / read_board_profile）。

承接需求的流程：
0. **先 search_projects。** 有相近食谱就以它为底稿（零件、接线、步骤、代码骨架都现成），只按用户情况改。没有再从零设计。
1. **弄清楚要做什么。** 开放式需求先问 1～3 个关键问题（规模、供电、要不要联网、预算），一次问完。简单请求（"要有光"）直接开做。
2. **出方案和采购清单。** 先 read_inventory 看用户已有什么，再 search_parts 查知识库，然后**必须用 propose_bom 工具**展示清单（可勾选的卡片），不要在正文里写采购表格。每件写清楚干什么用、为什么选它、价格区间、淘宝搜索词、可替代品；用 id 对应知识库条目。用户已有的标 have。知识库没有的照样可以列，但 catalog=false 并提醒核对。add_part 只收录电子模块/元件，耗材不收。用户确认后再 save_project 存 bom。
3. **用户提到自己有什么，就 update_inventory 记下来。** 库存是聊出来的，不要一上来盘问。
4. **save_project 存项目**（需求、清单、步骤），每完成一步更新进度。对话丢了项目还在。
5. **分步实施。** 每一步：part_detail 确认接法 → ask_human(wire) → get_snippet 取底稿再写代码 → sim_run 验证逻辑 → 能真烧就烧，不能就在虚拟板子上收尾 → ask_human(observe) 问结果 → append_journal。
6. 用户没有板子 / 零件还没到，就把能在虚拟板子上做的先做了，告诉他到货后从哪一步继续。

出问题时：先 search_troubleshooting，按它给的顺序验证，一次只改一个变量。解决了一个排障库里没有的新坑，用 add_troubleshooting 记进去。
解释概念时：先 explain_concept，用它的比喻。

硬规则：
- 引脚号必须来自 read_pinout（蓝药丸）或 read_board_profile（其他板子），不要凭记忆。蓝药丸板载 LED 是 PC13、低电平点亮。
- 5V 器件（超声波、MQ 气体、继电器）接 STM32 要提醒分压/电平问题。电机、水泵、灯带不能直接接 GPIO。
- 每一步用一两句话说"我在做什么、为什么"，讲人话，先比喻再术语。不长篇大论。
- ask_human 一次只问一件事，步骤具体到"哪个脚插哪个孔"，用元件 id 引用零件。
- 用户说你错了，就 record_ai_mistake 记下来，然后改。
- 全程中文。`

export const BASE_SYSTEM_EN = `You are the hands-on mentor inside "Vibedding". The user is a beginner (maybe a high-school student) who wants to build real embedded things by talking in plain English. Default board: STM32F103C8T6 "Blue Pill", Arduino framework + PlatformIO; suggest an ESP32 when the project needs Wi-Fi. The user is in the US: prices in USD, buy from Amazon / Adafruit / SparkFun / DigiKey.

You have five knowledge bases — search before you act; this is what makes you more reliable than a bare model: project recipes (search_projects), parts (search_parts / part_detail), code snippets (get_snippet), troubleshooting (search_troubleshooting), glossary (explain_concept), board profiles (list_boards / read_board_profile).

How to take a request:
0. **search_projects first.** If a recipe is close, use it as the base (parts, wiring, steps, code skeleton are ready) and only adapt. Design from scratch only if nothing fits.
1. **Understand the goal.** For open-ended requests ask 1-3 key questions at once (scale, power, connectivity, budget). Simple requests ("Let there be light") — just do it.
2. **Plan and shopping list.** read_inventory first, then search_parts, then **you must use propose_bom** to show the list (a checkable card) — never a table in prose. For each item: what it does, why this one, price range, Amazon search phrase, alternatives; use catalog ids so the card shows pictures. Mark owned items have. Items not in the catalog are fine but set catalog=false and say to verify. add_part only for electronic modules, not consumables. After the user confirms, save_project with the bom.
3. **When the user mentions owning something, update_inventory.** Inventory is discovered in conversation, not interrogated.
4. **save_project** (brief, bom, plan) and update progress after each step. The project survives even if the chat is lost.
5. **Build step by step.** Each step: part_detail to confirm wiring → ask_human(wire) → get_snippet for a base, then write code → sim_run to verify logic → flash for real if possible, otherwise finish on the virtual board → ask_human(observe) → append_journal.
6. No board / parts not arrived yet: do everything possible on the virtual board and say where to resume once parts arrive.

When something fails: search_troubleshooting first, verify in its order, change one variable at a time. Solved a new pitfall not in the library? add_troubleshooting.
When explaining a concept: explain_concept first, use its analogy.

Hard rules:
- Pin numbers must come from read_pinout (Blue Pill) or read_board_profile (other boards) — never from memory. Blue Pill onboard LED is PC13, active LOW.
- 5V parts (ultrasonic, MQ gas, relays) on an STM32 need a level/divider warning. Motors, pumps, LED strips never go directly on a GPIO.
- Say in one or two sentences what you are doing and why. Plain English, analogy before jargon. Keep it short.
- ask_human asks for one thing at a time, steps down to "which pin into which hole", referencing parts by catalog id. Add a "safety" line whenever mains, batteries, motors, hot parts or anything that could burn out the board is involved.
- No tools for installing software, deleting files or changing system settings: use ask_human(paste) with a copyable command and explain what it does.
- If the user says you were wrong, record_ai_mistake, then fix it.
- Reply in English.`

export const MODE_NOTES_EN = {
  local: (root) => `Runtime: local hands-on mode. The project lives on this computer at ${root} . Any command you give must be copy-paste runnable with that real path — no placeholders. You have real tools: pio_build, pio_upload, serial_read. No tools for installing software or changing the system: use ask_human(paste).`,
  static: () => `Runtime: web mode (not connected to the user's computer; no terminal). Three ways to run code: 1) sim_run on the virtual board to check logic; 2) cloud_build compiles real firmware in the cloud (returns Flash/RAM usage and compiler errors); 3) web_flash lets the user flash the compiled firmware from the browser (Chrome/Edge; STM32 needs a USB-TTL adapter on PA9/PA10 with BOOT0 set to 1, ESP32 just USB). Flow: write code → write_firmware → sim_run → cloud_build → on success web_flash → ask_human(observe). If the cloud build fails, read the error, fix, rebuild. Without hardware, stop at cloud_build. Never ask the user to run terminal commands.`,
}

export const MODE_NOTES = {
  local: (root) => `运行模式：本地动手模式。项目在这台电脑上的绝对路径是 ${root} 。给用户的任何命令都要能原样复制运行，用这个真实路径，不要写占位符。你有真实的编译（pio_build）、烧录（pio_upload）、读串口（serial_read）工具；安装软件、删文件、改系统设置没有工具，一律 ask_human(paste) 给可复制的命令让用户跑。`,
  static: () => `运行模式：网页版（没有连接用户的电脑，不能跑终端命令）。你有三种跑代码的方式：1) 虚拟板子 sim_run 验证逻辑；2) cloud_build 云端编译真固件（返回 Flash/RAM 占用和编译错误）；3) web_flash 让用户用浏览器把编译好的固件烧进真板子（需要 Chrome/Edge；STM32 需要 USB 转 TTL 接 PA9/PA10 并把 BOOT0 拨到 1，ESP32 直接 USB）。流程：写好代码 → write_firmware 保存 → sim_run → cloud_build → 成功就 web_flash → ask_human(observe) 问结果。云编译报错就读错误改代码再编。用户没有硬件时到 cloud_build 为止。不要让用户在终端跑命令。`,
}
export const systemFor = (mode, root = '', lang = 'zh') => lang === 'en'
  ? BASE_SYSTEM_EN + '\n\n' + (MODE_NOTES_EN[mode] ?? MODE_NOTES_EN.static)(root)
  : BASE_SYSTEM + '\n\n' + (MODE_NOTES[mode] ?? MODE_NOTES.static)(root)

// ---------- 工具 schema ----------
const O = (properties, required) => ({ type: 'object', properties, ...(required ? { required } : {}) })
const S = (description) => ({ type: 'string', ...(description ? { description } : {}) })
const N = (description) => ({ type: 'number', ...(description ? { description } : {}) })

export const SERVER_TOOL_SCHEMAS = [
  { name: 'read_pinout', description: '读取当前板子（STM32F103C8T6 蓝药丸）的引脚表：每个脚能干什么、注意事项、是否已在真板子上核对。给出任何引脚号之前必须先查这个。', input_schema: O({ filter: S('可选，只看某类功能，如 UART / I2C / PWM / ADC / SWD / LED') }) },
  { name: 'read_board', description: '读取用户的板子档案（型号、板载 LED 引脚、烧录方式等，用户亲测填写）。', input_schema: O({}) },
  { name: 'list_parts', description: '列出套件里常见元件（名字、干什么、对应任务）。需要用户拿出某个零件时，用这里的 id 引用它，指令卡会显示它的图。', input_schema: O({}) },
  { name: 'check_env', description: '检查开发环境：PlatformIO 装了没、有没有串口设备/ST-Link 插着。决定"能不能真烧录"之前先查。', input_schema: O({}) },
  { name: 'read_file', description: '读项目里的文件（firmware/、content/、tools/、docs/ 下）。', input_schema: O({ path: S('相对项目根目录，如 firmware/01-blink/src/main.cpp') }, ['path']) },
  { name: 'list_files', description: '列目录（firmware/、content/ 下）。', input_schema: O({ path: S() }, ['path']) },
  { name: 'write_firmware', description: '写固件文件。只能写 firmware/ 下（会自动建目录）。新工程请同时写 platformio.ini（可参考 firmware/01-blink/platformio.ini）和 src/main.cpp。', input_schema: O({ path: S('如 firmware/02-light/src/main.cpp'), content: S() }, ['path', 'content']) },
  { name: 'pio_build', description: '用 PlatformIO 编译一个固件工程（firmware/xxx）。返回最后 60 行输出。', input_schema: O({ project: S('如 firmware/01-blink') }, ['project']) },
  { name: 'pio_upload', description: '编译并烧录到板子（pio run -t upload）。需要 ST-Link 或串口已连接。返回最后 60 行输出。', input_schema: O({ project: S() }, ['project']) },
  { name: 'serial_read', description: '读串口几秒钟（pio device monitor），看板子打印了什么。', input_schema: O({ seconds: N('默认 3'), baud: N('默认 115200') }) },
  { name: 'append_journal', description: '把这次做的事记进今天的学习日志。做完一件事、或者踩了坑之后调用。', input_schema: O({ title: S(), body: S('markdown，写"做了什么 / 卡在哪 / 学到一句话"') }, ['title', 'body']) },
  { name: 'record_ai_mistake', description: '当用户指出你说错了（引脚、库名、电平等），把它记到"AI 常犯的错"清单里。', input_schema: O({ mistake: S(), prevention: S() }, ['mistake', 'prevention']) },
  { name: 'search_parts', description: '在元件知识库里搜（名字、类别、接口、用途关键词）。出采购清单前用它确认每件东西的价格区间、接口、电压、要用的库。空查询 = 列全部。', input_schema: O({ query: S('如 "温湿度" / "I2C" / "电机" / "传感器"') }) },
  { name: 'add_part', description: '把一个新元件收进知识库（用户确认过、或你很确定的）。只收电子模块/元件。', input_schema: O({ id: S('英文短 id，如 sht40'), name: S(), cat: S('主控/工具/被动/输入/传感器/显示/输出/执行/通信/存储/电源/机械耗材'), iface: S(), volt: S(), price: S('元，区间如 "5-10"'), buy: S('淘宝搜索词'), lib: S('Arduino 库或 API'), note: S() }, ['id', 'name', 'cat', 'iface', 'volt', 'price', 'buy']) },
  { name: 'read_inventory', description: '看用户已经有哪些元件。出采购清单前必须先看，已有的不要让人重复买。', input_schema: O({}) },
  { name: 'update_inventory', description: '用户提到自己有/买了/坏了某个元件，就更新库存。add=加，remove=删。', input_schema: O({ action: { type: 'string', enum: ['add', 'remove'] }, id: S('知识库 id，没有就留空'), name: S(), qty: N(), note: S() }, ['action', 'name']) },
  { name: 'save_project', description: '把一个需求存成项目：brief 需求与方案、bom 采购清单、plan 步骤与进度。已存在就覆盖对应字段（只传要更新的字段）。', input_schema: O({ slug: S('英文短名，如 auto-watering'), title: S(), brief: S('markdown：一句话需求、方案、约束'), bom: S('markdown 表格：件 / 数量 / 为什么 / 价格 / 搜索词 / 状态(已有|待买|已到)'), plan: S('markdown：- [ ] 步骤，完成的打 [x]') }, ['slug', 'title']) },
  { name: 'list_projects', description: '列出已有项目和各自进度。用户说"继续上次的"时先看这个。', input_schema: O({}) },
  { name: 'read_project', description: '读一个项目的 brief / bom / plan。', input_schema: O({ slug: S() }, ['slug']) },
  { name: 'add_troubleshooting', description: '把一个刚解决的、排障库里没有的新坑记进排障库：症状、信号、原因、验证、解决。以后所有人都受益。', input_schema: O({ id: S('英文短 id'), stage: S('环境/编译/烧录/板子/串口/GPIO/PWM/ADC/I2C/SPI/传感器/执行器/电源/模拟器/AI'), symptom: S(), signals: { type: 'array', items: S() }, cause: S(), check: S('一分钟内能做的验证'), fix: S(), explain: S('一两句人话讲原理') }, ['id', 'stage', 'symptom', 'signals', 'cause', 'check', 'fix']) },
]

export const CLIENT_TOOL_SCHEMAS = [
  { name: 'sim_run', description: '把 Arduino 风格代码放进浏览器里的虚拟蓝药丸跑几秒（不需要真板子）。返回引脚变化、串口输出、警告。适合在烧真板子之前先验证逻辑；用户没有板子或工具链时，这就是"烧录"。只支持教学子集：pinMode/digitalWrite/digitalRead/analogWrite/analogRead/delay/millis/Serial，不支持指针、struct、switch、中断。', input_schema: O({ code: S(), seconds: N('跑多久，默认 3') }, ['code']) },
  { name: 'ask_human', description: '需要用户在物理世界做事、或在你够不着的地方操作时调用。会弹出一张指令卡，暂停等用户回复。kind: wire=接线/拿零件（给 parts 和 wires 会画图）; press=按板子上的键; paste=让用户在终端跑命令或粘贴内容（给 paste）; observe=让用户观察并选择（给 options）。一次只问一件事，步骤要具体到"哪个脚插哪里"。', input_schema: O({ kind: { type: 'string', enum: ['wire', 'press', 'paste', 'observe'] }, title: S('一句话，如"把 LED 接到 PA1"'), why: S('为什么要这么做，一两句人话'), steps: { type: 'array', items: S(), description: '具体步骤，每条一个动作' }, parts: { type: 'array', items: S(), description: 'wire 用：涉及的元件 id，如 ["bluepill","led_5mm","resistor_kit"]' }, wires: S('wire 用：接线描述，格式 "a.脚 > b.脚 #颜色 \\"备注\\"; ..."，如 "bluepill.PA1 > resistor_220.一端 #39c5ff; resistor_220.另一端 > led_red.长脚(+) #ff5c5c; led_red.短脚(-) > bluepill.GND #8b93a7"'), paste: S('paste 用：要用户复制的命令或文本'), expect: S('做完后应该看到什么'), safety: S('安全提示：涉及电源、电池、电机、发热或可能烧坏板子时必填，一两句'), options: { type: 'array', items: S(), description: 'observe 用：可选答案，如 ["亮了","没亮","闪一下就灭"]' } }, ['kind', 'title', 'steps']) },
  { name: 'propose_bom', description: '给用户展示一张采购清单卡片（可勾选"已有"），等用户确认。先 read_inventory 和 search_parts，再调这个。返回用户勾选后的结果：哪些已有、哪些要买、总预算。确认后记得 save_project 存 bom 并 update_inventory。', input_schema: O({ title: S('项目名'), items: { type: 'array', items: O({ id: S('知识库 id，没有留空'), name: S(), qty: N(), role: S('在这个项目里干什么，一句话'), why: S('为什么选它 / 替代品'), price: S('单价区间，元'), buy: S('淘宝搜索词'), have: { type: 'boolean', description: '用户库存里已经有' }, catalog: { type: 'boolean', description: '是否在知识库里' }, optional: { type: 'boolean', description: '可选件' } }, ['name', 'qty', 'role', 'price', 'buy']) }, note: S('整体提醒：供电、5V/3.3V、先买什么后买什么') }, ['title', 'items']) },
  { name: 'search_projects', description: '在项目食谱库里找和用户需求最像的项目（零件、接线、分步、代码骨架、常见坑）。用户提出想做什么之后**第一步**先查这个，有相近的就以它为底稿改，不要从零瞎编。', input_schema: O({ query: S('关键词，如 "浇花 湿度 水泵"'), max: N() }, ['query']) },
  { name: 'search_troubleshooting', description: '排障库：症状/报错关键字 → 按概率排序的原因、一分钟验证法、解决办法。编译/烧录失败、灯不亮、串口乱码、传感器读不到时先查。', input_schema: O({ query: S('现象或报错关键字，如 "unknown chip id" / "串口乱码" / "舵机抖"'), max: N() }, ['query']) },
  { name: 'explain_concept', description: '术语表：一个概念的比喻、准确定义、常见误解、平台上的例子。给用户解释 PWM/上拉/I2C 这类词时用它，口径统一。', input_schema: O({ query: S() }, ['query']) },
  { name: 'get_snippet', description: '代码片段库：按主题（GPIO/PWM/ADC/UART/I2C/舵机/定时/中断/状态机…）取一段可编译的最小程序和逐段解释。写固件前先取相近片段当底稿。', input_schema: O({ query: S('如 "按键去抖" / "OLED 显示" / "舵机"'), max: N() }, ['query']) },
  { name: 'list_boards', description: '列出平台支持的开发板（蓝药丸、Nucleo、ESP32、UNO…）和各自适合谁。用户手里不是蓝药丸时先看。', input_schema: O({}) },
  { name: 'read_board_profile', description: '读某块板子的档案：platformio 配置、板载 LED、总线引脚、怎么烧录、坑、完整引脚表。用户用的不是蓝药丸时，引脚必须查这个而不是 read_pinout。', input_schema: O({ board: S('bluepill / nucleo_f103rb / nucleo_f411re / esp32_devkit / arduino_uno'), filter: S('可选，只看某类功能') }, ['board']) },
  { name: 'part_detail', description: '一个元件的完整档案：引脚标签、怎么接蓝药丸、最小代码、坑。写接线卡和代码前查。', input_schema: O({ id: S() }, ['id']) },
]

// 体验模式（Vercel / 纯静态）能用的服务端工具子集：在浏览器里用 localStorage 和打包的 JSON 实现
export const STATIC_ONLY_CLIENT_TOOLS = ['cloud_build']   // 本地模式不需要云编译
export const STATIC_SERVER_TOOLS = ['read_pinout', 'read_board', 'list_parts', 'check_env', 'write_firmware', 'append_journal', 'record_ai_mistake', 'search_parts', 'add_part', 'read_inventory', 'update_inventory', 'save_project', 'list_projects', 'read_project', 'add_troubleshooting']

export function toolDefsFor(mode) {
  const server = mode === 'local' ? SERVER_TOOL_SCHEMAS : SERVER_TOOL_SCHEMAS.filter((t) => STATIC_SERVER_TOOLS.includes(t.name))
  const client = mode === 'local' ? CLIENT_TOOL_SCHEMAS.filter((t) => !STATIC_ONLY_CLIENT_TOOLS.includes(t.name)) : CLIENT_TOOL_SCHEMAS
  return [...server, ...client].map(({ name, description, input_schema }) => ({ name, description, input_schema }))
}

// ---------- OpenAI Responses API ----------
export function toOpenAIInput(messages) {
  const items = []
  for (const m of messages) {
    if (typeof m.content === 'string') { items.push({ role: m.role, content: m.content }); continue }
    for (const b of m.content) {
      if (b.type === 'text') items.push({ role: m.role, content: m.role === 'assistant' ? [{ type: 'output_text', text: b.text }] : b.text })
      else if (b.type === 'tool_use') items.push({ type: 'function_call', call_id: b.id, name: b.name, arguments: JSON.stringify(b.input ?? {}) })
      else if (b.type === 'tool_result') items.push({ type: 'function_call_output', call_id: b.tool_use_id, output: typeof b.content === 'string' ? b.content : JSON.stringify(b.content) })
    }
  }
  return items
}
export function parseOpenAIOutput(data) {
  const content = []
  for (const item of data.output ?? []) {
    if (item.type === 'message') for (const part of item.content ?? []) if (part.type === 'output_text' && part.text) content.push({ type: 'text', text: part.text })
    if (item.type === 'function_call') {
      let input = {}
      try { input = JSON.parse(item.arguments || '{}') } catch { input = { _raw: item.arguments } }
      content.push({ type: 'tool_use', id: item.call_id, name: item.name, input })
    }
  }
  const hasTool = content.some((c) => c.type === 'tool_use')
  return { content, stop_reason: hasTool ? 'tool_use' : 'end_turn', model: data.model, usage: data.usage ?? null, stop_details: null }
}
export async function openaiStep({ apiKey, base = 'https://api.openai.com/v1', model, system, tools, messages, reasoning = '' }) {
  const body = { model, instructions: system, input: toOpenAIInput(messages), tools: tools.map((t) => ({ type: 'function', name: t.name, description: t.description, parameters: t.input_schema })), max_output_tokens: 8000 }
  if (reasoning) body.reasoning = { effort: reasoning }
  base = base || 'https://api.openai.com/v1'
  const r = await fetch(`${base}/responses`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` }, body: JSON.stringify(body) })
  if (!r.ok) throw new Error(`OpenAI ${r.status}: ${(await r.text()).slice(0, 400)}`)
  return parseOpenAIOutput(await r.json())
}


// ---------- 用量计费（每 1M token 美元，口径同 datasquare 的 token-tracker）----------
export const PRICING_PER_1M = {
  'gpt-6-astra': { input: 10.0, output: 30.0 },
  'gpt-5.6-terra': { input: 2.5, output: 10.0 },
  'gpt-5.6-luna': { input: 0.5, output: 2.0 },
  'gpt-4o': { input: 2.5, output: 10.0 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'claude-opus-5': { input: 5.0, output: 25.0 },
  'claude-sonnet-5': { input: 2.0, output: 10.0 },
  'claude-haiku-4-5': { input: 1.0, output: 5.0 },
}
const DEFAULT_PRICING = { input: 1.0, output: 3.0 }
export function usageRecord(model, usage, extra = {}) {
  const u = usage ?? {}
  const input = Number(u.input_tokens ?? 0), output = Number(u.output_tokens ?? 0)
  const cached = Number(u.input_tokens_details?.cached_tokens ?? u.cache_read_input_tokens ?? 0)
  const reasoning = Number(u.output_tokens_details?.reasoning_tokens ?? 0)
  const p = PRICING_PER_1M[model] ?? DEFAULT_PRICING
  // 缓存命中的输入按 1/10 算（OpenAI 的缓存折扣）
  const cost = ((input - cached) * p.input + cached * p.input * 0.1 + output * p.output) / 1_000_000
  return { model, input_tokens: input, output_tokens: output, cached_tokens: cached, reasoning_tokens: reasoning, cost_usd: Number(cost.toFixed(6)), ...extra }
}
