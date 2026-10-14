#!/usr/bin/env python3
"""把旁白摆到时间轴上，自动按字符数比例切字幕，混音，烧进画面。
字幕样式沿用 mamaagent 那套调好的，别重调。
用法：python3 docs/video/assemble.py
"""
import io, json, os, re, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
FF = '/Users/aisandbox/Documents/companydata/node_modules/ffmpeg-static/ffmpeg'
WORK = os.path.join(HERE, 'work')
SILENT = os.path.join(WORK, 'cut', 'silent.mp4')
OUT = os.path.join(HERE, 'vibedding-demo.mp4')
GAP = 0.25
MAX_CHARS = 78          # 一条字幕最多这么长，长了切成两条

def run(args):
    r = subprocess.run([FF, '-y', '-loglevel', 'error'] + args, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if r.returncode:
        print('FFMPEG FAIL'); print(' '.join(args)[:400]); print(r.stderr.decode()[-1500:]); sys.exit(1)

segs = json.load(io.open(os.path.join(HERE, 'narration.json'), encoding='utf-8'))
durs = {d['id']: d['dur'] for d in json.load(io.open(os.path.join(HERE, 'tts/durations.json'), encoding='utf-8'))}

def ts(t):
    h = int(t // 3600); m = int(t % 3600 // 60); s = t % 60
    return '%02d:%02d:%06.3f' % (h, m, s)

def split_text(text, n):
    """按句子切成 n 份，尽量在句号处断。"""
    sents = [x.strip() for x in re.split(r'(?<=[.!?])\s+', text) if x.strip()]
    if len(sents) <= n:
        return sents
    out, per = [], (len(sents) + n - 1) // n
    for i in range(0, len(sents), per):
        out.append(' '.join(sents[i:i + per]))
    return out

# —— 字幕：每段按字符数比例分配时间 ——
srt, idx, t = [], 1, 0.0
for s in segs:
    d = durs[s['id']]
    chunks = split_text(s['text'], max(1, int(len(s['text']) / MAX_CHARS) + 1))
    total = sum(len(c) for c in chunks) or 1
    ct = t
    for c in chunks:
        cd = d * len(c) / total
        srt.append('%d\n%s --> %s\n%s\n' % (idx, ts(ct).replace('.', ','), ts(ct + cd).replace('.', ','), c))
        idx += 1; ct += cd
    t += d + GAP

srt_path = os.path.join(WORK, 'sub.srt')
io.open(srt_path, 'w', encoding='utf-8').write('\n'.join(srt))
print('subtitles:', idx - 1, 'cues, timeline', '%.1fs' % t)

# —— 旁白：每段按同样的时间点摆上去 ——
inputs, filt, t = ['-i', SILENT], [], 0.0
for i, s in enumerate(segs):
    inputs += ['-i', os.path.join(HERE, 'tts', s['id'] + '.wav')]
    filt.append('[%d:a]adelay=%d|%d[a%d]' % (i + 1, int(t * 1000), int(t * 1000), i))
    t += durs[s['id']] + GAP
mix = ''.join('[a%d]' % i for i in range(len(segs)))
filt.append('%samix=inputs=%d:normalize=0,alimiter=limit=0.95[aout]' % (mix, len(segs)))

style = ("FontName=Helvetica,FontSize=15,PrimaryColour=&H00FFFFFF,"
         "OutlineColour=&H66000000,BackColour=&H66000000,"
         "BorderStyle=4,Outline=0,Shadow=0,MarginV=22,Alignment=2")
filt.append("[0:v]subtitles='%s':force_style='%s'[vout]" % (srt_path, style))

run(inputs + ['-filter_complex', ';'.join(filt), '-map', '[vout]', '-map', '[aout]',
              '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p',
              '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-shortest', OUT])
print('done ->', OUT)
