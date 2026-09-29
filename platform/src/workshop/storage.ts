// 访客数据的存储层：get/set 两个方法。
// 配了 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 就存 Supabase（匿名登录，每个访客一个 id，跨设备不共享但换浏览器不丢，云端可看）；
// 没配、或匿名登录失败（Supabase 里没开 Anonymous sign-ins），退回 localStorage。
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export interface Store { get<T>(key: string): Promise<T | null>; set(key: string, value: unknown): Promise<void>; backend(): Promise<'supabase' | 'local'> }
const PREFIX = 'vb:'
const local: Store = {
  async get<T>(key: string) { try { const v = localStorage.getItem(PREFIX + key); return v ? (JSON.parse(v) as T) : null } catch { return null } },
  async set(key, value) { try { localStorage.setItem(PREFIX + key, JSON.stringify(value)) } catch { /* ignore */ } },
  async backend() { return 'local' },
}

const URL_ = import.meta.env.VITE_SUPABASE_URL as string | undefined
const KEY_ = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

let client: SupabaseClient | null = null
let uidPromise: Promise<string | null> | null = null
const cache = new Map<string, unknown>()

async function uid(): Promise<string | null> {
  if (!URL_ || !KEY_) return null
  uidPromise ??= (async () => {
    try {
      client ??= createClient(URL_, KEY_)
      const { data } = await client.auth.getSession()
      if (data.session?.user) return data.session.user.id
      const r = await client.auth.signInAnonymously()
      if (r.error) { console.warn('[storage] Supabase 匿名登录失败，退回本地：', r.error.message); return null }
      return r.data.user?.id ?? null
    } catch (e) { console.warn('[storage] Supabase 不可用，退回本地：', (e as Error).message); return null }
  })()
  return uidPromise
}

const supa: Store = {
  async get<T>(key: string) {
    const id = await uid(); if (!id) return local.get<T>(key)
    if (cache.has(key)) return cache.get(key) as T
    const { data, error } = await client!.from('visitor_kv').select('value').eq('visitor_id', id).eq('key', key).maybeSingle()
    if (error) { console.warn('[storage] 读失败，退回本地：', error.message); return local.get<T>(key) }
    const v = (data?.value as T) ?? null
    cache.set(key, v); return v
  },
  async set(key, value) {
    const id = await uid(); if (!id) return local.set(key, value)
    cache.set(key, value)
    const { error } = await client!.from('visitor_kv').upsert({ visitor_id: id, key, value, updated_at: new Date().toISOString() })
    if (error) { console.warn('[storage] 写失败，同时写本地：', error.message); await local.set(key, value) }
  },
  async backend() { return (await uid()) ? 'supabase' : 'local' },
}

export const store: Store = URL_ && KEY_ ? supa : local
