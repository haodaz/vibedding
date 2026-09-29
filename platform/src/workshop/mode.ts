// 运行模式：local（本地 npm run dev，有真编译烧录）/ static（Vercel 体验模式，AI 在服务端）/ direct（没有任何后端，浏览器用访客自己的密钥直连模型）
export type Mode = 'local' | 'static' | 'direct'
export interface ModeInfo { mode: Mode; ai: string | null; reason: string }

let cached: ModeInfo | null = null
export async function detectMode(): Promise<ModeInfo> {
  if (cached) return cached
  if (getDirectKey()) { cached = { mode: 'direct', ai: getDirectModel(), reason: '用你自己的密钥直连' }; return cached }
  try {
    // 不用 AbortSignal.timeout（有的内嵌浏览器没有这个 API，会直接抛错被当成"没有后端"）
    const ctl = new AbortController(); const timer = setTimeout(() => ctl.abort(), 12000)
    const r = await fetch('/api/status', { signal: ctl.signal }).finally(() => clearTimeout(timer))
    if (r.ok && (r.headers.get('content-type') ?? '').includes('json')) {
      const j = await r.json()
      cached = { mode: j.mode === 'local' ? 'local' : 'static', ai: j.ai ?? null, reason: j.mode === 'local' ? '本地动手模式' : '网页体验模式' }
      return cached
    }
  } catch { /* no backend */ }
  // 失败不缓存：本地服务可能只是刚重启，下次再探
  cached = null
  return { mode: 'direct', ai: getDirectKey() ? getDirectModel() : null, reason: '没有后端，用你自己的密钥直连' }
}
export const resetMode = () => { cached = null }

// 访客自己的密钥（只存在浏览器里）
export const getDirectKey = () => { try { return localStorage.getItem('ws:key') ?? '' } catch { return '' } }
export const setDirectKey = (k: string) => { try { k ? localStorage.setItem('ws:key', k) : localStorage.removeItem('ws:key') } catch { /* */ } resetMode() }
export const getDirectModel = () => { try { return localStorage.getItem('ws:model') || 'gpt-5.6-luna' } catch { return 'gpt-5.6-luna' } }
export const setDirectModel = (m: string) => { try { localStorage.setItem('ws:model', m) } catch { /* */ } }
