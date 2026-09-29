import { useState } from 'react'
import { signIn } from '../auth'
import { Scene } from './Scene'
import { t } from '../i18n'

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
        <p className="tagline">{t('tagline')}</p>
        <p className="muted">{t('login.sub')}</p>
        <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('login.email')} required autoFocus />
        <input type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder={t('login.password')} required />
        {err && <div className="login-err">{err}</div>}
        <button className="chip primary" disabled={busy}>{busy ? t('login.busy') : t('login.go')}</button>
        <p className="muted small">{t('login.invite')}</p>
      </form>
    </div>
  )
}
