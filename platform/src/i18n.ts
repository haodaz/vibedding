// 界面文案双语。内容（课程/知识库）另有 content-en/；这里只管按钮、导航、提示这类"壳"上的字。
import { useEffect, useState } from 'react'

export type Lang = 'zh' | 'en'
const KEY = 'vb:lang'
export function getLang(): Lang {
  try { const v = localStorage.getItem(KEY); if (v === 'zh' || v === 'en') return v } catch { /* */ }
  return (navigator.language || '').toLowerCase().startsWith('zh') ? 'zh' : 'en'
}
export function setLang(l: Lang) { try { localStorage.setItem(KEY, l) } catch { /* */ } window.dispatchEvent(new Event('vb:lang')) }
export function useLang(): Lang {
  const [l, setL] = useState<Lang>(getLang)
  useEffect(() => { const f = () => setL(getLang()); window.addEventListener('vb:lang', f); return () => window.removeEventListener('vb:lang', f) }, [])
  return l
}

const D: Record<string, [string, string]> = {
  // 通用
  'tagline': ['Embedding your world with AI', 'Embedding your world with AI'],
  'login.sub': ['门外汉 × AI · 动手做嵌入式。登录后进入。', 'Beginners × AI · build real embedded things. Sign in to enter.'],
  'login.email': ['邮箱', 'Email'], 'login.password': ['密码', 'Password'], 'login.go': ['登录', 'Sign in'], 'login.busy': ['登录中…', 'Signing in…'],
  'login.invite': ['还没有账号？这是邀请制平台，找管理员开通。', 'No account? This is invite-only — ask an admin.'],
  'login.bad': ['邮箱或密码不对', 'Wrong email or password'],
  'logout': ['退出', 'Sign out'],
  // 模式
  'mode.build': ['开发', 'Build'], 'mode.learn': ['学习', 'Learn'],
  'mode.build.desc': ['说你要做什么，AI 写代码、跑、烧；项目、零件、采购都在这里管。', 'Say what you want to build. AI writes, runs and flashes; manage projects, parts and shopping here.'],
  'mode.learn.desc': ['任务卡、实验台、知识库、日志。一步一步，自己动手。', 'Missions, lab bench, knowledge base, journal. Step by step, hands on.'],
  'mode.pick': ['你想怎么开始？', 'How do you want to start?'],
  // 导航
  'nav.make': ['直接做', 'Build'], 'nav.projects': ['我的项目', 'Projects'], 'nav.hardware': ['我的硬件', 'Hardware'], 'nav.kb': ['知识库', 'Knowledge'],
  'nav.path': ['学习路径', 'Path'], 'nav.lab': ['实验台', 'Lab'], 'nav.journal': ['学习日志', 'Journal'], 'nav.prompts': ['提示词库', 'Prompts'], 'nav.about': ['关于平台', 'About'],
  'progress': ['进度', 'Progress'],
  // 状态条
  'st.board.on': ['板子已连接', 'Board connected'], 'st.board.off': ['板子未连接', 'No board'], 'st.pio.off': ['PlatformIO 未安装', 'PlatformIO missing'],
  'st.static': ['网页体验模式 · 虚拟板子', 'Web mode · virtual board'], 'st.nobackend': ['纯静态 · 无后端', 'Static · no backend'],
  'st.ai.none': ['AI 未配置', 'AI not configured'], 'st.ai.key': ['AI 需自填密钥', 'AI needs your key'],
  // 直接做
  'ws.title': ['直接做', 'Build'],
  'ws.sub': ['说你要什么，我来写代码、跑、烧。我够不着的（插线、按键、跑命令）会弹卡片请你搭把手。', 'Tell me what you want. I write the code, run it, flash it. When I need hands (wiring, buttons, commands) I show a card and wait for you.'],
  'ws.mock': ['现在是演示剧本（还没配 AI 密钥），只会演"要有光"。', 'Demo script only (no AI key yet) — it can only play "Let there be light".'],
  'ws.static': ['网页版：出方案、写代码、虚拟板子上跑都可以；真烧录到板子要用本地版。', 'Web version: plans, code and the virtual board all work here; flashing a real board needs the local version.'],
  'ws.direct': ['没有后端：在右侧设置里填自己的密钥，直接从浏览器用。', 'No backend: add your own API key in Settings to call the model from the browser.'],
  'ws.new': ['＋ 新对话', '+ New chat'], 'ws.new.confirm': ['再点一次清空（项目文件不会删）', 'Click again to clear (projects are kept)'],
  'ws.eg': ['比如说：', 'For example:'], 'ws.placeholder': ['要做什么？', 'What do you want to build?'], 'ws.busy': ['我在做……', 'Working…'], 'ws.send': ['发送', 'Send'],
  'ws.board': ['虚拟板子', 'Virtual board'], 'ws.assembly': ['组装', 'Assembly'], 'ws.code': ['代码', 'Code'], 'ws.serial': ['串口', 'Serial'], 'ws.project': ['项目', 'Project'],
  'ws.serial.idle': ['（AI 跑 sim_run 时这里会动）', '(comes alive when the AI runs sim_run)'],
  'ws.assembly.idle': ['AI 需要你接线时，零件图和接线图会出现在这里，像宜家说明书。', 'When the AI needs you to wire something, part pictures and the wiring diagram show up here, IKEA style.'],
  'ws.code.idle': ['AI 写的固件会显示在这里。', 'Firmware the AI writes shows up here.'],
  'ws.projects': ['我的项目', 'Projects'], 'ws.projects.none': ['还没有。说一个需求就会有。', 'None yet. Describe something and one appears.'],
  'ws.projects.cloud': ['云端保存', 'Saved to cloud'], 'ws.projects.local': ['存在你的浏览器里', 'Stored in this browser'],
  'ws.tools': ['我有的工具', 'What I can do'],
  'ws.tools.query': ['项目食谱 · 元件库 · 代码片段 · 排障库 · 术语表 · 板子档案', 'recipes · parts · snippets · troubleshooting · glossary · boards'],
  'ws.tools.do': ['写固件 · 编译 · 烧录 · 读串口 · 虚拟板子', 'write firmware · build · flash · serial · virtual board'],
  'ws.tools.log': ['日志 · 我犯过的错', 'journal · my mistakes'], 'ws.tools.ask': ['接线 · 按键 · 粘贴运行 · 观察', 'wire · press · paste & run · observe'],
  'ws.q': ['查', 'look up'], 'ws.d': ['做', 'do'], 'ws.l': ['记', 'log'], 'ws.a': ['请你', 'ask you'],
  'ws.settings': ['设置', 'Settings'], 'ws.mode': ['模式', 'Mode'], 'ws.save': ['保存', 'Save'], 'ws.clear': ['清除', 'Clear'], 'ws.expand': ['展开', 'Expand'], 'ws.collapse': ['收起', 'Collapse'],
  'ws.key.direct': ['这里没有后端。填你自己的 OpenAI 密钥，浏览器直接调模型。密钥只存在这台浏览器的本地存储里，不会发给任何人。', 'No backend here. Enter your own OpenAI key; the browser calls the model directly. The key stays in this browser only.'],
  'ws.key.optional': ['服务端已配好模型。想用自己的密钥直连也可以填在这里（优先级更高）。', 'The server has a model configured. You can still use your own key here (takes priority).'],
  'intro.title': ['欢迎来到 Vibedding', 'Welcome to Vibedding'],
  'intro.body': ['说你要什么，AI 来写代码、跑、烧。它够不着的（插线、按键、跑命令）会弹卡片请你搭把手。右边是工作区：虚拟板子、组装图、代码、串口、项目。', 'Tell the AI what you want. It writes the code, runs it, flashes it. When it needs hands (wiring, buttons, commands) it shows a card and waits for you. On the right is your workspace: virtual board, assembly, code, serial, project.'],
  'intro.ok': ['开始', 'Let\'s go'],
  'ws.err.unavail': ['AI 服务暂时不可用，稍后再试。', 'The AI service is unavailable right now. Try again in a bit.'],
  'ws.thinking': ['让我看看……', 'Thinking…'],
  'ws.err.nobackend': ['这里没有后端。在右侧"设置"里填你自己的 OpenAI 密钥就能直接用（密钥只存在你的浏览器里）。', 'No backend here. Add your own OpenAI key in Settings on the right (it stays in your browser).'],
  'ws.err.nocred': ['服务端还没配 AI 密钥（OPENAI_API_KEY）。', 'The server has no AI key (OPENAI_API_KEY) yet.'],
  'ws.err.auth': ['登录已过期，刷新页面重新登录。', 'Session expired — refresh and sign in again.'],
  'ws.err.refusal': ['模型拒绝了这个请求。', 'The model declined this request.'],
  'ws.err.conn': ['连不上本地服务：', 'Cannot reach the local server: '],
  'ws.suggest.1': ['要有光', 'Let there be light'], 'ws.suggest.2': ['让板载的灯眨起来', 'Make the onboard LED blink'], 'ws.suggest.3': ['我想做一个自动浇花的东西', 'I want to build an auto plant waterer'], 'ws.suggest.4': ['做一个桌面温湿度小站', 'Build a desk temperature & humidity station'], 'ws.suggest.5': ['继续上次的项目', 'Continue my last project'],
  // 卡片
  'card.need': ['需要你', 'Your turn'], 'card.wire': ['接线', 'Wire'], 'card.press': ['按键', 'Press'], 'card.paste': ['粘贴运行', 'Paste & run'], 'card.observe': ['观察', 'Observe'],
  'card.expect': ['做完应该看到：', 'You should see: '], 'card.done': ['我做好了', 'Done'], 'card.ran': ['跑完了', 'Ran it'], 'card.stuck': ['卡住了', "I'm stuck"],
  'card.note': ['补充一句（可选），比如"没找到 220Ω 的电阻"', 'Optional note, e.g. "no 220Ω resistor here"'], 'card.paste.note': ['把输出贴在这里（可选）', 'Paste the output here (optional)'],
  'card.reply': ['你的回复：', 'Your reply: '], 'card.copy': ['⎘ 复制', '⎘ Copy'], 'card.copied': ['✔ 已复制', '✔ Copied'], 'card.stuck.msg': ['我卡住了，做不了这一步', "I'm stuck, can't do this step"], 'card.done.msg': ['做完了', 'Done'],
  'card.safety': ['安全', 'Safety'],
  'bom.title': ['采购清单', 'Shopping list'], 'bom.have': ['已有', 'Have'], 'bom.skip': ['不要', 'Skip'], 'bom.opt': ['可选', 'optional'], 'bom.check': ['需核对', 'verify'],
  'bom.tobuy': ['要买', 'To buy'], 'bom.items': ['件', 'items'], 'bom.budget': ['预算约', 'est.'], 'bom.mid': ['（按区间中值估）', '(midpoint estimate)'],
  'bom.copy': ['⎘ 复制购物清单', '⎘ Copy shopping list'], 'bom.confirm': ['就这样，记下来', 'Looks good, save it'], 'bom.search': ['搜', 'search'], 'bom.find': ['上淘宝找', 'Find it on Amazon'],
  // 学习
  'path.title': ['学习路径', 'Learning path'],
  'path.mission': ['把门槛拆掉，让人专注宝贵的部分：实现自己的一个思路，对一件事大胆尝试，在一个原本无法掌握的领域做出点价值。', 'Tear down the barriers so people can focus on what matters: realizing an idea, trying something boldly, creating value in a field they could never master before.'],
  'path.sub': ['每个任务都以"做出一个看得见的东西"结束。顺序是建议，不是规定。卡住了就写日志，然后问 AI。', 'Every mission ends with something you can see. The order is a suggestion, not a rule. Stuck? Write it down, then ask the AI.'],
  'path.cta.play': ['▶ 没有板子也能玩：说一句"要有光"', '▶ No board? Say "Let there be light"'], 'path.cta.kb': ['翻翻知识库', 'Browse the knowledge base'], 'path.cta.start': ['我有板子，从头开始', 'I have a board — start here'],
  'path.done': ['完成', 'done'], 'path.labs': ['个实验', 'labs'], 'path.hasLab': ['▣ 有实验', '▣ has a lab'],
  'lab.title': ['实验台', 'Lab bench'], 'lab.sub': ['板子没到也能动手。这里的每个实验都可以嵌进任何一张任务卡。', 'Hands-on before the board arrives. Every experiment here can be embedded in any mission card.'],
  'journal.title': ['学习日志', 'Journal'], 'journal.sub': ['按天记。记"我以为 / 实际发生 / 学到了什么"，比记代码更有用。', 'Daily notes: what I expected, what happened, what I learned. More useful than saving code.'],
  'prompts.title': ['提示词库', 'Prompt library'], 'prompts.sub': ['怎么向 AI 问硬件问题，才能少踩坑。', 'How to ask an AI about hardware without getting burned.'],
  'hw.title': ['我的硬件', 'My hardware'], 'hw.sub': ['板子、模块、线怎么接。只记录亲手验证过的东西。', 'Boards, modules, wiring. Only what has been verified by hand.'],
  'kb.title': ['知识库', 'Knowledge base'], 'kb.sub': ['AI 用的就是这几份资料。一次编好，很多年不用改。你也可以直接翻。', 'This is exactly what the AI reads. Written once, good for years. Browse it yourself.'],
  'kb.projects': ['项目食谱', 'Recipes'], 'kb.glossary': ['术语表', 'Glossary'], 'kb.trouble': ['排障', 'Troubleshooting'], 'kb.snippets': ['代码片段', 'Snippets'], 'kb.boards': ['板子', 'Boards'],
  'kb.search': ['搜索', 'Search '], 'kb.ai': ['✦ 让 AI 带我做这个', '✦ Have the AI build this with me'], 'kb.ask': ['✦ 问 AI', '✦ Ask AI'], 'kb.empty': ['还没生成。', 'Not generated yet.'],
  'doc.back': ['← 返回', '← Back'], 'doc.ai': ['✦ 让 AI 来做：', '✦ Let the AI do it: '],
  'doc.done': ['做完了？把这张卡的 status 改成 done，然后写一篇日志。或者直接跟 AI 说"这个任务完成了"。', 'Finished? Set this card\'s status to done and write a journal entry, or just tell the AI "this mission is done".'],
  'ws.start.title': ['想做点什么？', 'What do you want to make?'], 'ws.start.sub': ['点一张卡直接开始，或者用你自己的话说。', 'Pick a card to start, or say it in your own words.'],
  'ws.start.tag.1': ['最简单的开始，1 分钟看到灯亮', 'The simplest start — a light in one minute'], 'ws.start.tag.2': ['学会不用 delay 的节奏', 'Rhythm without delay()'], 'ws.start.tag.3': ['一个真的会用的东西', 'Something you will actually use'], 'ws.start.tag.4': ['传感器 + 屏幕', 'Sensor + display'], 'ws.start.tag.5': ['从上次停下的地方接着来', 'Pick up where you left off'],
  'flash.kind': ['烧录', 'Flash'], 'flash.title': ['把固件烧进板子', 'Flash the board'], 'flash.built': ['已编译：', 'Built:'],
  'flash.nosupport': ['这个浏览器不支持 Web Serial。用 Chrome 或 Edge 打开这个页面。', 'This browser has no Web Serial. Open this page in Chrome or Edge.'],
  'flash.stm.1': ['USB 转 TTL 模块：它的 TX 接板子 PA10，RX 接 PA9，GND 接 GND（跳线拨 3.3V）', 'USB-TTL adapter: its TX → board PA10, RX → PA9, GND → GND (jumper on 3.3V)'],
  'flash.stm.2': ['把板子上的 BOOT0 跳线帽拨到 1（靠近 3.3V 那一侧），按一下 RESET', 'Move the BOOT0 jumper to 1 (the side next to 3.3V), press RESET'],
  'flash.stm.3': ['点下面的按钮，在弹窗里选那个串口（名字里有 CH340 / USB Serial）', 'Click the button below and pick the port (CH340 / USB Serial) in the popup'],
  'flash.stm.4': ['烧完把 BOOT0 拨回 0，再按 RESET，程序就跑起来了', 'When done, move BOOT0 back to 0 and press RESET — your program runs'],
  'flash.esp.1': ['用数据线把 ESP32 插到电脑上（有的板子要按住 BOOT 键再点连接）', 'Plug the ESP32 in with a data cable (some boards need BOOT held while connecting)'],
  'flash.esp.2': ['点下面的按钮，在弹窗里选串口', 'Click the button below and pick the port'],
  'flash.go': ['连接并烧录', 'Connect & flash'], 'flash.busy': ['烧录中…', 'Flashing…'], 'flash.skip': ['先不烧', 'Not now'],
  'ws.attach': ['发照片', 'Attach a photo'], 'ws.placeholder.img': ['对这张图想问什么？', 'What about this photo?'],
  'ws.clearchat': ['清空对话', 'Clear chat'],
  'ws.newproject': ['新项目', 'New project'], 'proj.new': ['新项目', 'New'], 'proj.today': ['今天', 'today'], 'proj.daysago': ['天前', 'days ago'], 'proj.steps': ['步', 'steps'], 'proj.delete': ['删除这个项目的对话', 'Delete this project chat'],
  'proj.empty': ['还没有项目。说一句你想做什么，就是第一个。', 'No projects yet. Say what you want to build — that is your first one.'],
  'profile.days': ['天', 'days'], 'profile.missions': ['任务', 'missions'], 'profile.projects': ['项目', 'projects'], 'profile.activity': ['最近 12 周的活动', 'Activity, last 12 weeks'],
  'profile.nobio': ['点这里写一句自我介绍', 'Click to add a short bio'], 'profile.edit': ['我的名片', 'My profile'], 'profile.name': ['名字', 'Name'], 'profile.bio': ['一句话介绍自己', 'One line about you'],
  'nav.admin': ['管理', 'Admin'],
  'admin.title': ['管理后台', 'Admin'], 'admin.sub': ['用户和用量。只有管理员能看到这一页。', 'Users and usage. Admins only.'],
  'admin.usage': ['用量', 'Usage'], 'admin.users': ['用户', 'Users'], 'admin.days': ['天', 'days'], 'admin.today': ['今天', 'Today'], 'admin.week': ['近 7 天', 'Last 7 days'],
  'admin.calls': ['调用次数', 'Calls'], 'admin.tokens': ['Token', 'Tokens'], 'admin.cost': ['成本', 'Cost'], 'admin.byday': ['按天', 'By day'], 'admin.byuser': ['按用户', 'By user'], 'admin.bymodel': ['按模型', 'By model'], 'admin.recent': ['最近调用', 'Recent calls'],
  'admin.user': ['用户', 'User'], 'admin.model': ['模型', 'Model'], 'admin.time': ['时间', 'Time'], 'admin.role': ['角色', 'Role'], 'admin.created': ['创建', 'Created'], 'admin.lastseen': ['最近登录', 'Last sign-in'], 'admin.status': ['状态', 'Status'],
  'admin.add': ['建账号', 'Create user'], 'admin.disabled': ['已禁用', 'Disabled'], 'admin.active': ['正常', 'Active'], 'admin.enable': ['启用', 'Enable'], 'admin.disable': ['禁用', 'Disable'], 'admin.promote': ['设为管理员', 'Make admin'], 'admin.demote': ['取消管理员', 'Remove admin'],
  'about.title': ['关于平台', 'About'],
  'empty.404': ['404 · 页面不存在', '404 · not found'],
  // 元件抽屉
  'part.close': ['关闭', 'Close'], 'part.missing': ['元件库里还没有这一条', 'Not in the parts library yet'],
  'part.buy': ['在 Amazon 上找', 'Find it on Amazon'],
  'part.iface': ['接口', 'Interface'], 'part.volt': ['电压', 'Voltage'], 'part.pins': ['引脚', 'Pins'],
  'part.wiring': ['怎么接', 'Wiring'], 'part.lib': ['库 / 板子', 'Library / board'],
  'part.pitfalls': ['常见坑', 'Common pitfalls'], 'part.snippet': ['最小代码', 'Minimal code'],
  'part.usedin': ['用在这些项目里', 'Used in these projects'], 'part.related': ['一起用的零件', 'Often used with'],
  'part.disclaimer': ['配图是示意图，买到的实物可能不一样。接线前以板子上的丝印为准。', 'The picture is an illustration — your actual part may look different. Always check the silkscreen on your board before wiring.'],
  // 管理员的元件库
  'admin.parts': ['元件库', 'Parts'],
  'admin.parts.sub': ['正文里提到这些名字会自动变成可点的 tag。', 'Mentions of these names in any text become clickable tags.'],
  'admin.parts.search': ['搜元件名、型号、分类…', 'Search name, part number, category…'],
  'admin.parts.count': ['条', 'parts'], 'admin.parts.withimg': ['有配图', 'with images'],
}
export function t(key: string, lang: Lang = getLang()): string {
  const e = D[key]; if (!e) return key
  return lang === 'zh' ? e[0] : e[1]
}

// 主题：auto / light / dark
export type Theme = 'auto' | 'light' | 'dark'
export function getTheme(): Theme { try { const v = localStorage.getItem('vb:theme'); return v === 'light' || v === 'dark' ? v : 'auto' } catch { return 'auto' } }
export function applyTheme(th: Theme = getTheme()) {
  const light = th === 'light' || (th === 'auto' && window.matchMedia('(prefers-color-scheme: light)').matches)
  document.documentElement.dataset.theme = light ? 'light' : 'dark'
}
export function setTheme(th: Theme) { try { localStorage.setItem('vb:theme', th) } catch { /* */ } applyTheme(th); window.dispatchEvent(new Event('vb:theme')) }
export function useTheme(): Theme {
  const [th, setTh] = useState<Theme>(getTheme)
  useEffect(() => { const f = () => setTh(getTheme()); window.addEventListener('vb:theme', f); const mq = window.matchMedia('(prefers-color-scheme: light)'); const g = () => applyTheme(); mq.addEventListener('change', g); return () => { window.removeEventListener('vb:theme', f); mq.removeEventListener('change', g) } }, [])
  return th
}
