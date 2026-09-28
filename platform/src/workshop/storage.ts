// 访客数据的存储层。现在是 localStorage；接 Supabase 时只改这个文件：
// get/set 换成对 supabase 表的读写（按匿名用户 id 分区），其余代码不动。
export interface Store { get<T>(key: string): Promise<T | null>; set(key: string, value: unknown): Promise<void> }
const PREFIX = 'vb:'
export const store: Store = {
  async get<T>(key: string) { try { const v = localStorage.getItem(PREFIX + key); return v ? (JSON.parse(v) as T) : null } catch { return null } },
  async set(key, value) { try { localStorage.setItem(PREFIX + key, JSON.stringify(value)) } catch { /* ignore */ } },
}
