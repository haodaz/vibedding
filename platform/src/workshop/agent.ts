// 浏览器驱动的 agent 循环。服务端只负责调一次模型 + 跑服务端工具。
import { runSim, type SimLive } from './sim'
import type { BomAsk } from './BomCard'
import { KNOWLEDGE_TOOLS } from './knowledge'
import { LOCAL_TOOLS } from './local-tools'
import { detectMode, getDirectKey, getDirectModel, type ModeInfo } from './mode'
import { systemFor, toolDefsFor, openaiStep } from '../../shared/spec.mjs'
import { getToken } from '../auth'
import { getLang, t } from '../i18n'

export type Block =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
export interface HumanAsk { kind: 'wire' | 'press' | 'paste' | 'observe'; title: string; why?: string; steps: string[]; parts?: string[]; wires?: string; paste?: string; expect?: string; safety?: string; options?: string[] }

export type Item =
  | { kind: 'user'; text: string }
  | { kind: 'assistant'; text: string }
  | { kind: 'tool'; id: string; name: string; input: Record<string, unknown>; result?: string; error?: boolean; running: boolean }
  | { kind: 'human'; id: string; ask: HumanAsk; answer?: string }
  | { kind: 'bom'; id: string; ask: BomAsk; answer?: string }
  | { kind: 'system'; text: string }

type ApiMsg = { role: 'user' | 'assistant'; content: unknown }

export class Agent {
  messages: ApiMsg[] = []
  items: Item[] = []
  busy = false
  mock = false
  model = ''
  modeInfo: ModeInfo | null = null
  private pending: { id: string; resolve: (s: string) => void } | null = null
  constructor(private onChange: () => void, private onLive: (l: SimLive) => void) {
    try {
      const saved = JSON.parse(localStorage.getItem('ws:session') ?? 'null')
      if (saved) { this.messages = saved.messages ?? []; this.items = (saved.items ?? []).map((i: Item) => (i.kind === 'tool' ? { ...i, running: false } : i)) }
      // 上次没回答的卡片：这轮不能继续了，标记一下
      for (const i of this.items) if ((i.kind === 'human' || i.kind === 'bom') && i.answer === undefined) i.answer = '（上次没回答，会话已重置到这里）'
    } catch { /* ignore */ }
  }

  reset() { this.messages = []; this.items = []; try { localStorage.removeItem('ws:session') } catch { /* */ } this.emit() }

  private emit() {
    try { localStorage.setItem('ws:session', JSON.stringify({ messages: this.messages, items: this.items })) } catch { /* ignore */ }
    this.onChange()
  }

  async send(text: string) {
    if (this.busy) return
    this.items.push({ kind: 'user', text })
    this.messages.push({ role: 'user', content: text })
    await this.loop()
  }

  answerHuman(id: string, answer: string) {
    const it = this.items.find((i) => (i.kind === 'human' || i.kind === 'bom') && i.id === id) as Extract<Item, { kind: 'human' | 'bom' }> | undefined
    if (it) it.answer = answer
    if (this.pending?.id === id) { const r = this.pending.resolve; this.pending = null; r(answer) }
    this.emit()
  }

  private async loop() {
    this.busy = true; this.emit()
    try {
      for (let guard = 0; guard < 40; guard++) {
        this.modeInfo ??= await detectMode()
        let j: Record<string, unknown>
        if (this.modeInfo.mode === 'direct') {
          const key = getDirectKey()
          if (!key) { this.items.push({ kind: 'system', text: t('ws.err.unavail') }); break }
          try { j = { ...(await openaiStep({ apiKey: key, model: getDirectModel(), system: systemFor('static', '', getLang()), tools: toolDefsFor('static'), messages: this.messages })), mock: false, agentModel: getDirectModel() } }
          catch (e) { j = { error: (e as Error).message } }
        } else {
          const token = await getToken()
          const res = await fetch('/api/agent/step', { method: 'POST', headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) }, body: JSON.stringify({ messages: this.messages, lang: getLang() }) })
          j = await res.json()
        }
        if (j.error === 'unauthorized') { this.items.push({ kind: 'system', text: t('ws.err.auth') }); break }
        if (j.error === 'no-credentials') { this.items.push({ kind: 'system', text: t('ws.err.unavail') }); break }
        if (j.error) { this.items.push({ kind: 'system', text: '出错了：' + String(j.error) }); break }
        this.mock = !!j.mock; this.model = String(j.agentModel ?? '')
        const content = j.content as Block[]
        this.messages.push({ role: 'assistant', content })
        for (const b of content) if (b.type === 'text' && b.text.trim()) this.items.push({ kind: 'assistant', text: b.text })
        const uses = content.filter((b): b is Extract<Block, { type: 'tool_use' }> => b.type === 'tool_use')
        this.emit()
        if (j.stop_reason === 'refusal') { this.items.push({ kind: 'system', text: t('ws.err.refusal') }); break }
        if (!uses.length) break
        const results: unknown[] = []
        for (const u of uses) {
          const r = await this.runTool(u)
          results.push({ type: 'tool_result', tool_use_id: u.id, content: r.text, ...(r.error ? { is_error: true } : {}) })
        }
        this.messages.push({ role: 'user', content: results })
      }
    } catch (e) {
      this.items.push({ kind: 'system', text: t('ws.err.conn') + (e as Error).message })
    }
    this.busy = false; this.emit()
  }

  private async runTool(u: Extract<Block, { type: 'tool_use' }>): Promise<{ text: string; error?: boolean }> {
    if (u.name === 'propose_bom') {
      const ask = u.input as unknown as BomAsk
      this.items.push({ kind: 'bom', id: u.id, ask }); this.emit()
      const answer = await new Promise<string>((resolve) => { this.pending = { id: u.id, resolve } })
      return { text: `用户确认了采购清单。${answer}` }
    }
    if (u.name === 'ask_human') {
      const ask = u.input as unknown as HumanAsk
      this.items.push({ kind: 'human', id: u.id, ask }); this.emit()
      const answer = await new Promise<string>((resolve) => { this.pending = { id: u.id, resolve } })
      return { text: `用户回复：${answer}` }
    }
    const item: Extract<Item, { kind: 'tool' }> = { kind: 'tool', id: u.id, name: u.name, input: u.input, running: true }
    this.items.push(item); this.emit()
    let out: { text: string; error?: boolean }
    if (KNOWLEDGE_TOOLS[u.name]) {
      try { out = { text: KNOWLEDGE_TOOLS[u.name](u.input) } } catch (e) { out = { text: '检索失败：' + (e as Error).message, error: true } }
    } else if (u.name === 'sim_run') {
      const { code, seconds } = u.input as { code: string; seconds?: number }
      const r = await runSim(code, Math.min(Math.max(seconds ?? 3, 1), 15), this.onLive)
      out = { text: r.summary, error: !r.ok && r.summary.startsWith('模拟器不能跑') }
    } else if (this.modeInfo?.mode !== 'local' && LOCAL_TOOLS[u.name]) {
      try { out = { text: await LOCAL_TOOLS[u.name](u.input) } } catch (e) { out = { text: '执行失败：' + (e as Error).message, error: true } }
    } else if (this.modeInfo?.mode !== 'local') {
      out = { text: `体验模式没有 ${u.name} 这个工具（需要本地模式）。`, error: true }
    } else {
      const res = await fetch('/api/tool', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: u.name, input: u.input }) })
      const j = await res.json()
      out = { text: j.result, error: !!j.is_error }
    }
    item.running = false; item.result = out.text; item.error = out.error; this.emit()
    return out
  }
}
