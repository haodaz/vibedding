#!/usr/bin/env python3
"""X 用的短片（约 50 秒）。和 cut.py 同一套素材、同一批旁白 wav，只取其中五段。

为什么要单独一条流水线：
  1. X 免费号原生视频上限 2:20，正片 2:53 传不上去；
  2. 信息流里第一帧就是缩略图，所以开场必须直接是封面那个构图
     （左狗右板、底部标题条），不能先黑场再进。
封面是"活的"：狗那半倒放（从狗脸拉回空碗 —— 问题本身），板子那半在闪。
标题条两秒后淡出，把底部让给字幕。
用法：python3 docs/video/short.py
"""
import io, json, os, re, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
FF = '/Users/aisandbox/Documents/companydata/node_modules/ffmpeg-static/ffmpeg'
WORK = os.path.join(HERE, 'work', 'short')
OUT = os.path.join(HERE, 'vibedding-short.mp4')
os.makedirs(WORK, exist_ok=True)
W, H, FPS, BG = 1920, 1080, 30, '#eef1f6'
GAP = 0.25
LEAD = 2.5          # 开场静场：先让人看清封面，再开口说话
MAX_CHARS = 78
FONT = '/System/Library/Fonts/Supplemental/Arial Bold.ttf'

# 正片十六段里挑的五段：钩子 → 认零件 → 烧录 → 灯亮 → 落点。
# 中间的排障、元件库、技术栈都留给正片，短片只负责让人想点开正片。
CUTS = [
    ('01_open',  'cover_live.mp4', 0.0),
    ('07_photo', 'parts.mp4',      1.0),
    ('11_flash', 'flash.mp4',     30.0),
    ('13_light', 'led8.mp4',       1.5),   # 竖拍，靠 fill_blur 填满画幅
    ('16_close', 'cover_end.mp4',  0.0),   # 收口回开场那个构图，停在狗抬头
]

DUR = {d['id']: d['dur'] for d in json.load(io.open(os.path.join(HERE, 'tts/durations.json'), encoding='utf-8'))}
NARR = {s['id']: s['text'] for s in json.load(io.open(os.path.join(HERE, 'narration.json'), encoding='utf-8'))}

def run(args):
    r = subprocess.run([FF, '-y', '-loglevel', 'error'] + args, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if r.returncode:
        print('FFMPEG FAIL:', ' '.join(args)[:300]); print(r.stderr.decode()[-1500:]); sys.exit(1)

def probe(path):
    out = subprocess.run([FF, '-i', path], stdout=subprocess.PIPE, stderr=subprocess.PIPE).stderr.decode()
    for line in out.split('\n'):
        if 'Duration' in line:
            hh, mm, ss = line.split('Duration:')[1].split(',')[0].strip().split(':')
            return int(hh) * 3600 + int(mm) * 60 + float(ss)
    return 0.0

def find(name):
    for d in ('clips', 'assets'):
        p = os.path.join(HERE, d, name)
        if os.path.exists(p):
            return p
    return None

# —— 1. 把封面做成活的 ——
# 左 840 右 1080，和 cover.jpg 的分割比例一致。
# 狗那条只有 3.1 秒，且镜头是从空碗摇到狗脸；倒放之后首帧就是狗脸（= 封面），
# 再慢慢拉回空碗，顺序反而更对：先看见它看着你，再看见碗是空的。
def build_cover(dur, name='cover_live.mp4', bar=True):
    dog, led = find('IMG_7570.MOV'), find('led8.mp4')
    bar_h, bar_y = 243, 837
    hold = LEAD + 0.3          # 标题条撑过静场再淡出，把底部让给字幕
    txt = ("drawtext=fontfile='{f}':text='VIBE BUILDING':fontcolor=white:fontsize=108:x=68:y={y1}:"
           "alpha='if(lt(t,{h}),1,max(0,1-(t-{h})/0.7))',"
           "drawtext=fontfile='{f}':text='IN THE REAL WORLD':fontcolor=0x2EE08A:fontsize=74:x=70:y={y2}:"
           "alpha='if(lt(t,{h}),1,max(0,1-(t-{h})/0.7))'").format(f=FONT, h=hold, y1=bar_y + 28, y2=bar_y + 150)
    # 开场：倒放，首帧就是狗脸（= 封面），再下摇到空碗——问题本身。
    # 收尾：脸→碗→脸走一个来回，最后定格在它抬头看你。
    dogf = ("[0:v]reverse,setpts=PTS/0.545" if bar else
            "[0:v]reverse[r];[0:v]copy[f];[r][f]concat=n=2:v=1:a=0,setpts=PTS/0.545")
    fc = (
        f"{dogf},scale=840:1120,crop=840:1080:0:0,"
        f"tpad=stop_mode=clone:stop_duration={dur},setsar=1[L];"
        f"[1:v]crop=720:720:0:344,scale=1080:1080,setsar=1[R];"
        f"[L][R]hstack=inputs=2[v];"
        f"[v]drawbox=x=0:y={bar_y}:w={W}:h={bar_h}:color=0x151B28@0.88:t=fill:"
        f"enable='lt(t,{hold+0.7})',{txt},fps={FPS},trim=duration={dur}[out]"
    ) if bar else (
        f"{dogf},scale=840:1120,crop=840:1080:0:0,"
        f"tpad=stop_mode=clone:stop_duration={dur},setsar=1[L];"
        f"[1:v]crop=720:720:0:344,scale=1080:1080,setsar=1[R];"
        f"[L][R]hstack=inputs=2,fps={FPS},trim=duration={dur}[out]"
    )
    out = os.path.join(HERE, 'clips', name)
    run(['-i', dog, '-stream_loop', '-1', '-ss', '0.6', '-t', str(dur), '-i', led,
         '-filter_complex', fc, '-map', '[out]', '-an', '-c:v', 'libx264', '-preset', 'medium',
         '-crf', '18', '-pix_fmt', 'yuv420p', out])
    print('  %s %.1fs -> %s' % (name, dur, out))

build_cover(DUR['01_open'] + GAP + LEAD)
build_cover(DUR['16_close'] + GAP, 'cover_end.mp4', bar=False)

# —— 2. 每段切到和旁白等长（逻辑同 cut.py）——
print('cutting:')
parts = []
for seg, src, start in CUTS:
    need = DUR[seg] + GAP + (LEAD if seg == CUTS[0][0] else 0)
    path = find(src)
    if not path:
        print('  ✘ 缺素材:', src); sys.exit(1)
    avail = max(0.3, probe(path) - start)
    speed = 1.0
    if avail > need * 1.6:
        speed = min(avail / need, 1.6)
    elif avail < need * 0.95:
        speed = max(avail / need, 0.6)   # 短片结尾要 13.5 秒的灯，慢放比定格好看
    out = os.path.join(WORK, seg + '.mp4')
    fit = (f'split[bg][fg];'
           f'[bg]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},gblur=sigma=42,eq=brightness=0.06[b];'
           f'[fg]scale={W}:{H}:force_original_aspect_ratio=decrease[f];[b][f]overlay=(W-w)/2:(H-h)/2')
    run(['-ss', str(start), '-i', path, '-an', '-vf',
         f'setpts=(PTS-STARTPTS)/{speed:.4f},{fit},setsar=1,'
         f'tpad=stop_mode=clone:stop_duration={need},fps={FPS},trim=duration={need}',
         '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p', out])
    print(f'  {seg:10s} {need:5.1f}s  x{speed:.2f}  {src}')
    parts.append(out)

lst = os.path.join(WORK, 'concat.txt')
with open(lst, 'w') as f:
    for p in parts:
        f.write("file '%s'\n" % p)
silent = os.path.join(WORK, 'silent.mp4')
run(['-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy', silent])

# —— 3. 字幕 + 旁白（同 assemble.py，样式别改）——
def ts(t):
    return '%02d:%02d:%06.3f' % (int(t // 3600), int(t % 3600 // 60), t % 60)

def split_text(text, n):
    sents = [x.strip() for x in re.split(r'(?<=[.!?])\s+', text) if x.strip()]
    if len(sents) <= n:
        return sents
    out, per = [], (len(sents) + n - 1) // n
    for i in range(0, len(sents), per):
        out.append(' '.join(sents[i:i + per]))
    return out

srt, idx, t = [], 1, LEAD
for seg, _, _ in CUTS:
    text, d = NARR[seg], DUR[seg]
    chunks = split_text(text, max(1, int(len(text) / MAX_CHARS) + 1))
    total = sum(len(c) for c in chunks) or 1
    ct = t
    for c in chunks:
        cd = d * len(c) / total
        srt.append('%d\n%s --> %s\n%s\n' % (idx, ts(ct).replace('.', ','), ts(ct + cd).replace('.', ','), c))
        idx += 1; ct += cd
    t += d + GAP
srt_path = os.path.join(WORK, 'sub.srt')
io.open(srt_path, 'w', encoding='utf-8').write('\n'.join(srt))

inputs, filt, t = ['-i', silent], [], LEAD
for i, (seg, _, _) in enumerate(CUTS):
    inputs += ['-i', os.path.join(HERE, 'tts', seg + '.wav')]
    filt.append('[%d:a]adelay=%d|%d[a%d]' % (i + 1, int(t * 1000), int(t * 1000), i))
    t += DUR[seg] + GAP
filt.append('%samix=inputs=%d:normalize=0,alimiter=limit=0.95[aout]'
            % (''.join('[a%d]' % i for i in range(len(CUTS))), len(CUTS)))
style = ("FontName=Helvetica,FontSize=15,PrimaryColour=&H00FFFFFF,"
         "OutlineColour=&H66000000,BackColour=&H66000000,"
         "BorderStyle=4,Outline=0,Shadow=0,MarginV=22,Alignment=2")
filt.append("[0:v]subtitles='%s':force_style='%s'[vout]" % (srt_path, style))
run(inputs + ['-filter_complex', ';'.join(filt), '-map', '[vout]', '-map', '[aout]',
              '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p',
              '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-shortest', OUT])
print('done -> %s  (%.1fs)' % (OUT, t))
