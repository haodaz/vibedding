// 登录：Supabase 邮箱密码。封闭模式（VITE_CLOSED=1）下没登录只看到登录页。
import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'

export const CLOSED = import.meta.env.VITE_CLOSED === '1'
const URL_ = import.meta.env.VITE_SUPABASE_URL as string | undefined
const KEY_ = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
export const supabase: SupabaseClient | null = URL_ && KEY_ ? createClient(URL_, KEY_) : null

export async function signIn(email: string, password: string) {
  if (!supabase) throw new Error('没有配置 Supabase')
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(error.message === 'Invalid login credentials' ? '邮箱或密码不对' : error.message)
}
export async function signOut() { await supabase?.auth.signOut() }
export async function getToken(): Promise<string | null> { const { data } = (await supabase?.auth.getSession()) ?? { data: { session: null } }; return data.session?.access_token ?? null }
export async function getUserId(): Promise<string | null> { const { data } = (await supabase?.auth.getSession()) ?? { data: { session: null } }; return data.session?.user.id ?? null }

export function useSession(): { session: Session | null; ready: boolean } {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(!supabase)
  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true) })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])
  return { session, ready }
}
