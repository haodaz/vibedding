// 形象生成：OpenAI 图像接口，原生透明背景；先生成 idle，再以它为参考图生成其他姿态（保证是同一个人）。
// 用法：node tools/gen-mascot.mjs            全部五个姿态
//       node tools/gen-mascot.mjs cheer stuck  只生成这几个
// 需要 platform/.env 的 OPENAI_API_KEY。模型可用 MASCOT_MODEL 覆盖（默认 gpt-image-1）。
import fs from 'node:fs/promises'
import path from 'node:path'
import dns from 'node:dns'
import { fileURLToPath } from 'node:url'
dns.setDefaultResultOrder('ipv4first')
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(ROOT, 'platform', 'public', 'art')
const env = Object.fromEntries((await fs.readFile(path.join(ROOT, 'platform', '.env'), 'utf8')).split('\n').map((l) => l.match(/^([A-Z_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].trim()]))
const KEY = env.OPENAI_API_KEY; if (!KEY) { console.error('缺 OPENAI_API_KEY'); process.exit(1) }
const MODEL = process.env.MASCOT_MODEL || 'gpt-image-1'
const BASE = (env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '')

const CHARACTER = `Pixar/Disney style 3D cartoon character render, high quality, soft studio lighting, subsurface skin. A charming cute young woman, about 18-19, shoulder-length wavy blonde hair, big bright blue eyes, a pair of vintage brass-rimmed clear science goggles pushed up on her forehead, wearing a navy blue work jacket over a white t-shirt with a small screwdriver in the chest pocket. Half-body portrait, character fully in frame, transparent background, no text, no logo.`
const POSES = {
  idle: 'Relaxed standing pose, hands at her sides, head slightly tilted, warm confident smile, facing slightly to the side.',
  working: 'Focused, looking down, goggles pulled over her eyes, holding a small blue circuit board in one hand and tweezers in the other, wiring it, concentrated expression.',
  thinking: 'One hand on her chin, eyes looking up and to the side, thoughtful, lips slightly pursed, goggles on forehead.',
  cheer: 'Both fists raised in celebration, sparkling eyes, big happy smile, leaning slightly forward, goggles on forehead.',
  stuck: 'Scratching the back of her head awkwardly, brows slightly furrowed, sheepish smile, holding a broken jumper wire in the other hand, goggles on forehead.',
}
const only = process.argv.slice(2)
const want = Object.keys(POSES).filter((k) => !only.length || only.includes(k))

async function generate(prompt) {
  const r = await fetch(`${BASE}/images/generations`, { method: 'POST', headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: MODEL, prompt, size: '1024x1536', quality: 'high', background: 'transparent', output_format: 'png', n: 1 }) })
  const j = await r.json(); if (!r.ok) throw new Error(JSON.stringify(j).slice(0, 300))
  return Buffer.from(j.data[0].b64_json, 'base64')
}
async function edit(refPng, prompt) {
  const fd = new FormData()
  fd.append('model', MODEL); fd.append('prompt', prompt); fd.append('size', '1024x1536'); fd.append('quality', 'high'); fd.append('background', 'transparent'); fd.append('output_format', 'png')
  fd.append('image', new Blob([refPng], { type: 'image/png' }), 'ref.png')
  const r = await fetch(`${BASE}/images/edits`, { method: 'POST', headers: { Authorization: `Bearer ${KEY}` }, body: fd })
  const j = await r.json(); if (!r.ok) throw new Error(JSON.stringify(j).slice(0, 300))
  return Buffer.from(j.data[0].b64_json, 'base64')
}

await fs.mkdir(OUT, { recursive: true })
const idlePath = path.join(OUT, 'mentor_idle.png')
let ref = null
if (want.includes('idle') || !(await fs.stat(idlePath).catch(() => null))) {
  console.log('生成 idle …')
  ref = await generate(`${CHARACTER} ${POSES.idle}`)
  await fs.writeFile(idlePath, ref); console.log('✔ mentor_idle')
} else ref = await fs.readFile(idlePath)
for (const k of want.filter((k) => k !== 'idle')) {
  try {
    console.log('生成', k, '…')
    const png = await edit(ref, `Same character, same outfit, same Pixar 3D style as the reference image, transparent background, half-body, no text. New pose: ${POSES[k]}`)
    await fs.writeFile(path.join(OUT, `mentor_${k}.png`), png); console.log('✔ mentor_' + k)
  } catch (e) { console.error('✘', k, e.message) }
}
console.log('完成')
