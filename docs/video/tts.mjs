import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const KEY = fs.readFileSync('/Users/aisandbox/Documents/zhiji-yida/.env.local','utf8').split('\n').find(l=>l.startsWith('DASHSCOPE_API_KEY=')).split('=')[1].trim();
const F = '/Users/aisandbox/Documents/companydata/node_modules/ffmpeg-static/ffmpeg';
const segs = JSON.parse(fs.readFileSync('narration.json','utf8'));
fs.mkdirSync('tts', { recursive: true });
const out = [];
for (const s of segs) {
  if (fs.existsSync(`tts/${s.id}.wav`)) { let dur=0; try { execFileSync(F, ['-i', `tts/${s.id}.wav`], { stdio: 'pipe' }); } catch (e) { const m = /Duration: (\d+):(\d+):([\d.]+)/.exec(e.stderr.toString()); dur = m ? (+m[1])*3600 + (+m[2])*60 + (+m[3]) : 0; } out.push({ id: s.id, dur }); continue; }
  const r = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation', { method: 'POST', headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'qwen-tts', input: { text: s.text, voice: process.env.VOICE || 'Cherry' } }) });
  const j = await r.json();
  const url = j.output?.audio?.url; if (!url) { console.log('fail', s.id, JSON.stringify(j).slice(0,200)); continue; }
  const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
  fs.writeFileSync(`tts/${s.id}.wav`, buf);
  let dur = 0; try { execFileSync(F, ['-i', `tts/${s.id}.wav`], { stdio: 'pipe' }); } catch (e) { const m = /Duration: (\d+):(\d+):([\d.]+)/.exec(e.stderr.toString()); dur = m ? (+m[1])*3600 + (+m[2])*60 + (+m[3]) : 0; }
  out.push({ id: s.id, dur });
  console.log(s.id, dur.toFixed(2) + 's');
}
fs.writeFileSync('tts/durations.json', JSON.stringify(out));
