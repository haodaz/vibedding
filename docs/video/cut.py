#!/usr/bin/env python3
"""终剪：按旁白时长排时间线，输出 1920x1080 无声片。
和 build.py 的区别：这里的素材全是**真·录屏和实拍**，没有静帧推镜。
一条素材不够长就放慢，太长就按倍速压，保证每段严丝合缝对上旁白。

CUTS 里每条： (旁白id, 素材文件, 起点秒, 结尾留白秒)
   起点秒 = 从素材的哪一刻开始取
   结尾留白 = 这段末尾留多少静止时间（给观众喘口气）
用法：python3 docs/video/cut.py
"""
import io, json, os, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
FF = '/Users/aisandbox/Documents/companydata/node_modules/ffmpeg-static/ffmpeg'
WORK = os.path.join(HERE, 'work', 'cut')
os.makedirs(WORK, exist_ok=True)
W, H, FPS, BG = 1920, 1080, 30, '#eef1f6'
GAP = 0.25

NARR = os.path.join(HERE, 'narration.json')
DUR = {d['id']: d['dur'] for d in json.load(io.open(os.path.join(HERE, 'tts/durations.json'), encoding='utf-8'))}

def run(args):
    r = subprocess.run([FF, '-y', '-loglevel', 'error'] + args, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if r.returncode:
        print('FFMPEG FAIL:', ' '.join(args)[:300]); print(r.stderr.decode()[-1200:]); sys.exit(1)

def probe(path):
    r = subprocess.run([FF, '-i', path], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    out = r.stderr.decode()
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
    p = os.path.expanduser('~/Desktop/' + name)
    return p if os.path.exists(p) else None

def clip(seg, src, start=0.0, tail=0.0):
    """切一段，时长刚好等于这段旁白。素材不够就放慢，富余就加速。"""
    need = DUR[seg] + GAP
    path = find(src)
    if not path:
        print('  ✘ 缺素材:', src); sys.exit(1)
    total = probe(path)
    avail = max(0.3, total - start - tail)
    # 素材比需要的长：只取需要的那一段（最多 1.6 倍速带过等待），不要为了填满而硬拉成 3 倍速鬼畜。
    # 素材比需要的短：末尾定格补满（tpad 干的），不要慢放成 0.5 倍的卡顿感。
    speed = 1.0
    if avail > need * 1.6:
        speed = min(avail / need, 1.6)       # 长出很多就适度加速，把模型思考的死时间压掉
    elif avail < need * 0.95:
        speed = max(avail / need, 0.85)      # 稍短就轻微放慢，差太多交给定格
    out = os.path.join(WORK, seg + '.mp4')
    vf = (f'setpts=(PTS-STARTPTS)/{speed:.4f},'
          f'scale={W}:{H}:force_original_aspect_ratio=decrease,'
          f'pad={W}:{H}:(ow-iw)/2:(oh-ih)/2:color={BG},setsar=1,'
          f'tpad=stop_mode=clone:stop_duration={need},fps={FPS},trim=duration={need}')
    run(['-ss', str(start), '-i', path, '-an', '-vf', vf,
         '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p', out])
    print(f'  {seg:10s} {need:5.1f}s  x{speed:.2f}  {src}')
    return out

# 时间线。素材名在 clips/ 或 assets/ 下找。
CUTS = json.load(io.open(os.path.join(HERE, 'cuts.json'), encoding='utf-8'))

parts = [clip(c['seg'], c['src'], c.get('start', 0), c.get('tail', 0)) for c in CUTS]
lst = os.path.join(WORK, 'concat.txt')
with open(lst, 'w') as f:
    for p in parts:
        f.write("file '%s'\n" % p)
silent = os.path.join(WORK, 'silent.mp4')
run(['-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy', silent])
print('silent ->', silent)
