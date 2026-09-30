// 用户给元件拍的实物照片（UGC），和 AI 生成的示意图（PGC）并存。
// 示意图告诉你"这东西长什么样"，实物照告诉你"你手里这个到底是哪个版本"——
// 正是 LCD1602 那条坑（I2C 版还是并口版）需要的。
// 存在 storage.ts 里：登录了走 Supabase 的 visitor_kv，否则 localStorage。

import { store } from './storage'

export interface PartPhoto {
  src: string           // 压缩后的 data URL
  at: string            // 拍的时间
  verdict: 'yes' | 'no' | 'unsure' | 'skipped'   // AI 怎么看
  says?: string         // AI 的说明
  looksLike?: string    // AI 觉得更像什么
  keptAnyway?: boolean  // AI 说不是，用户仍然坚持
}

const KEY = 'part-photos'
type Bag = Record<string, PartPhoto>

export async function allPhotos(): Promise<Bag> { return (await store.get<Bag>(KEY)) ?? {} }
export async function getPhoto(partId: string): Promise<PartPhoto | null> { return (await allPhotos())[partId] ?? null }
export async function savePhoto(partId: string, photo: PartPhoto): Promise<void> {
  const bag = await allPhotos(); bag[partId] = photo; await store.set(KEY, bag)
}
export async function removePhoto(partId: string): Promise<void> {
  const bag = await allPhotos(); delete bag[partId]; await store.set(KEY, bag)
}

// 压到 640px 宽的 jpeg：localStorage 和 jsonb 都塞得下，模型也够看清丝印
export function shrink(file: File, max = 640, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, max / Math.max(img.width, img.height))
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale)
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
      resolve(c.toDataURL('image/jpeg', quality))
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('读不了这张图')) }
    img.src = url
  })
}

export interface Verdict { match: boolean | null; says: string; looks_like?: string; error?: string }

// 让 AI 核对照片里的真是这个零件吗。没有后端就跳过核验，照片照样能存。
export async function verify(input: { name: string; expect?: string; pins?: string; image: string; lang: string }): Promise<Verdict | null> {
  try {
    const r = await fetch('/api/identify', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input),
    })
    if (!r.ok) return null
    const j = (await r.json()) as Verdict
    return j.error ? null : j
  } catch { return null }
}
