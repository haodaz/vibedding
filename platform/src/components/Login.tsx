import { useState } from 'react'
import { signIn } from '../auth'
import { Scene } from './Scene'

export function Login() {
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(''); setBusy(true)
    try { await signIn(email.trim(), pw) } catch (x) { setErr((x as Error).message) } finally { setBusy(false) }
  }
  return (
    <div className="login">
      <Scene name="hero_home" className="login-bg" />
      <form className="login-card" onSubmit={submit}>
        <div className="brand-name" style={{ fontSize: 26 }}>vibedding<em>_</em></div>
        <p className="tagline">Embedding your world with AI</p>
        <p className="muted">门外汉 × AI · 动手做嵌入式。登录后进入。</p>
        <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="邮箱" required autoFocus />
        <input type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="密码" required />
        {err && <div className="login-err">{err}</div>}
        <button className="chip primary" disabled={busy}>{busy ? '登录中…' : '登录'}</button>
        <p className="muted small">还没有账号？这是邀请制平台，找管理员开通。</p>
      </form>
    </div>
  )
}
