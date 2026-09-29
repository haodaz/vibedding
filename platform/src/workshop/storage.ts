// 用户数据的存储层：get/set。登录了（封闭模式）就存 Supabase 的 visitor_kv（每人只能读写自己的行），否则存 localStorage。
import { supabase, getUserId } from '../auth'

export interface Store { get<T>(key: string): Promise<T | null>; set(key: string, value: unknown): Promise<void>; backend(): Promise<'supabase' | 'local'> }
const PREFIX = 'vb:'
const local: Store = {
  async get<T>(key: string) { try { const v = localStorage.getItem(PREFIX + key); return v ? (JSON.parse(v) as T) : null } catch { return null } },
  async set(key, value) { try { localStorage.setItem(PREFIX + key, JSON.stringify(value)) } catch { /* ignore */ } },
  async backend() { return 'local' },
}
const cache = new Map<string, unknown>()
const cloud: Store = {
  async get<T>(key: string) {
    const id = await getUserId(); if (!id || !supabase) return local.get<T>(key)
    if (cache.has(key)) return cache.get(key) as T
    const { data, error } = await supabase.from('visitor_kv').select('value').eq('visitor_id', id).eq('key', key).maybeSingle()
    if (error) { console.warn('[storage] 读失败，退回本地：', error.message); return local.get<T>(key) }
    const v = (data?.value as T) ?? null; cache.set(key, v); return v
  },
  async set(key, value) {
    const id = await getUserId(); if (!id || !supabase) return local.set(key, value)
    cache.set(key, value)
    const { error } = await supabase.from('visitor_kv').upsert({ visitor_id: id, key, value, updated_at: new Date().toISOString() })
    if (error) { console.warn('[storage] 写失败，同时写本地：', error.message); await local.set(key, value) }
  },
  async backend() { return (await getUserId()) ? 'supabase' : 'local' },
}
export const store: Store = supabase ? cloud : local
