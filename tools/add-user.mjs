// 给封闭平台建账号（公开注册是关闭的）。密码从剪贴板取，不在屏幕上显示。
// 用法：先把密码复制到剪贴板，然后  node tools/add-user.mjs someone@example.com
import path from 'node:path'
import fs from 'node:fs/promises'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
const here = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(here, '..')
const { createClient } = createRequire(path.join(ROOT, 'platform', 'package.json'))('@supabase/supabase-js')
const email = process.argv[2]
if (!email) { console.error('用法：node tools/add-user.mjs 邮箱   （密码先复制到剪贴板）'); process.exit(1) }
const password = execSync('pbpaste', { encoding: 'utf8' }).trim()
if (password.length < 6) { console.error('剪贴板里的密码太短（<6），先复制密码'); process.exit(1) }
const env = Object.fromEntries((await fs.readFile(path.join(ROOT, 'platform', '.env'), 'utf8')).split('\n').map((l) => l.match(/^([A-Z_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].trim()]))
const sb = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const { data, error } = await sb.auth.admin.createUser({ email, password, email_confirm: true })
if (error) { console.error('建账号失败：', error.message); process.exit(1) }
console.log('已建账号：', data.user.email, '（密码长度', password.length, '）')
