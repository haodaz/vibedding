// 体验模式下"服务端工具"的浏览器实现：用打包进来的 JSON + localStorage。
// 和本地服务的同名工具行为一致，只是数据存在访客自己的浏览器里（将来可换成 Supabase，见 storage.ts）。
import { getJson, raw } from '../content'
import { store } from './storage'
type PinRow = { name: string; funcs: string[]; note?: string }
const pinsOf = () => getJson<{ board: string; note: string; left: PinRow[]; right: PinRow[]; bottom: PinRow[] }>('hardware/bluepill-pins.json')
const manifestOf = () => getJson<{ parts: AnyRec[] }>('art/manifest.json')
const catalogOf = () => getJson<{ parts: AnyRec[] }>('hardware/parts-catalog.json')

type AnyRec = Record<string, unknown>
const day = () => new Date().toISOString().slice(0, 10)


// —— 访客自己的板子 ——
// 体验模式下不能直接吐仓库里的 board.md：那是作者的板子，对访客是假话
// （评委一进来就被告知"你有一块 ESP32-WROVER，串口 /dev/cu.usbserial-210"）。
// 板子从访客自己的库存里认：聊到"我有 XX"时 AI 会 update_inventory，这里再读回来。
const PROFILE_OF: Record<string, string> = {
  bluepill: 'bluepill', esp32_devkit: 'esp32_devkit', esp32_wrover: 'esp32_wrover',
  arduino_uno: 'arduino_uno', nucleo_f103: 'nucleo_f103rb', blackpill_f411: 'nucleo_f411re',
}
async function visitorBoard(): Promise<{ id: string; name: string; profileId?: string } | null> {
  const inv = (await store.get<AnyRec[]>('inventory')) ?? []
  const cat = catalogOf()?.parts ?? []
  for (const it of inv) {
    const p = cat.find((x) => x.id === it.id) ?? cat.find((x) => String(x.name) === String(it.name))
    if (p && /主控|controller/i.test(String(p.cat))) {
      return { id: String(p.id), name: String(p.name), profileId: PROFILE_OF[String(p.id)] }
    }
  }
  return null
}
/** 给界面用：访客聊出来的主控 id（没有就空串），决定虚拟板子画哪一块 */
export async function visitorBoardId(): Promise<string> { return (await visitorBoard())?.id ?? '' }

async function describeVisitorBoard(): Promise<string> {
  const b = await visitorBoard()
  if (!b) {
    return [
      '访客还没有登记自己的板子（体验模式下，板子是聊出来的，不是预设的）。',
      '**不要假设他有任何板子，也不要引用平台自带的示例档案。** 接下来按这个顺序走：',
      '1. 先问他手里有什么板子；不确定就让他拍一张照片，你来认。',
      '2. 他说了型号，就 update_inventory 记下来，再 read_board_profile 取引脚。',
      '3. 他说没有板子 / 还没到货，就**只写代码、用 sim_run 在右边的虚拟板子上跑**，',
      '   并明确告诉他：虚拟板子能验证逻辑，真正烧录要等硬件接上（体验模式也烧不了，要本地模式）。',
      '平台认识这些板子：' + Object.keys(PROFILE_OF).join(' / ') + '（list_boards 看全部）。',
    ].join('\n')
  }
  const prof = b.profileId ? getJson<AnyRec>('hardware/boards/' + b.profileId + '.json') : null
  if (!prof) return `访客登记的主控是：${b.name}（id ${b.id}）。平台没有这块板的详细档案，引脚务必让他核对丝印。`
  return `访客登记的主控是：${b.name}\n` + JSON.stringify(prof, null, 1).slice(0, 2500)
    + `\n\n引脚按这份档案来，不要凭记忆。体验模式下只能 sim_run 验证逻辑，真烧录要本地模式 + 板子接上。`
}

export const LOCAL_TOOLS: Record<string, (input: AnyRec) => Promise<string> | string> = {
  // 引脚表默认是蓝药丸的。访客用别的板子时，蓝药丸的脚一个都对不上——
  // 必须明说，否则 AI 会拿着 PC13、PA1 去指挥一块 ESP32。
  async read_pinout({ filter }) {
    const b = await visitorBoard()
    if (b && b.profileId && b.profileId !== 'bluepill') {
      return `你的板子是 ${b.name}，不是蓝药丸——这张引脚表不适用。\n`
        + `请改用 read_board_profile({ board: "${b.profileId}" }) 取这块板的引脚，不要套用 PC13/PA1 这类蓝药丸脚名。`
    }
    const pins = pinsOf(); if (!pins) return '引脚表没加载'
    const all = [...pins.left, ...pins.right, ...pins.bottom]
    const rows = all.filter((p) => !filter || p.funcs.some((f) => f.toUpperCase().includes(String(filter).toUpperCase())))
    return `${pins.board}（${pins.note}）\n` + rows.map((p) => `${p.name}: ${p.funcs.join(', ')}${p.note ? ' — ' + p.note : ''}`).join('\n')
  },
  async read_board() { return describeVisitorBoard() },
  list_parts() { return (manifestOf()?.parts ?? []).map((p) => `${String(p.name).replace(/^part_/, '')}: ${p.label} — ${p.what}`).join('\n') },
  check_env() { return '网页体验模式：没有连接用户的电脑，不能编译/烧录/读串口。虚拟板子（sim_run）是唯一的运行方式。到货后在本地模式烧录。' },
  async write_firmware({ path, content }) {
    const p = String(path)
    if (!p.startsWith('firmware/')) return '只能写 firmware/ 下'
    const files = (await store.get<Record<string, string>>('firmware')) ?? {}
    files[p] = String(content)
    await store.set('firmware', files)
    return `已保存到浏览器：${p}（${String(content).length} 字符）。用户可以在"我的项目"里看到；到货后在本地模式里把它放进 firmware/ 就能烧。`
  },
  async append_journal({ title, body }) {
    const j = (await store.get<AnyRec[]>('journal')) ?? []
    j.push({ date: day(), title, body })
    await store.set('journal', j)
    return `已记入浏览器里的日志（${day()}）`
  },
  async record_ai_mistake({ mistake, prevention }) {
    const j = (await store.get<AnyRec[]>('ai_mistakes')) ?? []
    j.push({ mistake, prevention, date: day() }); await store.set('ai_mistakes', j); return '已记录'
  },
  search_parts({ query = '' }) {
    const q = String(query).trim().toLowerCase()
    const parts = catalogOf()?.parts ?? []
    const hit = parts.filter((p) => !q || [p.id, p.name, p.cat, p.iface, p.note, p.buy, p.lib].join(' ').toLowerCase().includes(q))
    if (!hit.length) return `知识库里没有和"${query}"相关的条目（共 ${parts.length} 条）。可以照常推荐，但标 catalog=false 并提醒核对。`
    return hit.slice(0, 25).map((p) => `[${p.id}] ${p.name} · ${p.cat} · 接口 ${p.iface} · ${p.volt} · ¥${p.price} · 搜"${p.buy}" · 库: ${p.lib}${p.note ? ' · ' + p.note : ''}`).join('\n')
  },
  async add_part(p) { const j = (await store.get<AnyRec[]>('parts_added')) ?? []; j.push(p); await store.set('parts_added', j); return `已收录到浏览器里的私有元件库：${p.name}` },
  async read_inventory() { const h = (await store.get<AnyRec[]>('inventory')) ?? []; return h.length ? h.map((x) => `${x.id ?? ''} ${x.name} x${x.qty ?? 1}${x.note ? ' — ' + x.note : ''}`.trim()).join('\n') : '库存是空的（还没聊出来用户有什么）' },
  async update_inventory({ action, id, name, qty = 1, note = '' }) {
    let h = (await store.get<AnyRec[]>('inventory')) ?? []
    if (action === 'remove') h = h.filter((x) => x.id !== id && x.name !== name)
    else { const cur = h.find((x) => (id && x.id === id) || x.name === name); if (cur) { cur.qty = qty; cur.note = note || cur.note } else h.push({ id: id || undefined, name, qty, note }) }
    await store.set('inventory', h); return `库存已更新：${action} ${name} x${qty}`
  },
  async save_project({ slug, title, brief, bom, plan }) {
    const ps = (await store.get<Record<string, AnyRec>>('projects')) ?? {}
    const cur = ps[String(slug)] ?? {}
    ps[String(slug)] = { ...cur, title, updated: day(), ...(brief !== undefined ? { brief } : {}), ...(bom !== undefined ? { bom } : {}), ...(plan !== undefined ? { plan } : {}) }
    await store.set('projects', ps); return `项目已保存到浏览器：${slug}`
  },
  async list_projects() {
    const ps = (await store.get<Record<string, AnyRec>>('projects')) ?? {}
    const rows = Object.entries(ps).map(([k, p]) => { const plan = String(p.plan ?? ''); const done = (plan.match(/- \[x\]/gi) ?? []).length, total = (plan.match(/- \[[ x]\]/gi) ?? []).length; return `${k}: ${p.title}${total ? ` · ${done}/${total} 步` : ''}` })
    return rows.length ? rows.join('\n') : '还没有项目'
  },
  async read_project({ slug }) {
    const ps = (await store.get<Record<string, AnyRec>>('projects')) ?? {}
    const p = ps[String(slug)]; if (!p) return `没有项目 ${slug}`
    return ['brief', 'bom', 'plan'].filter((k) => p[k]).map((k) => `## ${k}\n${p[k]}`).join('\n\n')
  },
  async add_troubleshooting(e) { const j = (await store.get<AnyRec[]>('troubleshooting_added')) ?? []; j.push(e); await store.set('troubleshooting_added', j); return '已记入浏览器里的私有排障库' },
}
