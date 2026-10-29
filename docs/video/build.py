#!/usr/bin/env python3
"""把素材按旁白时长排成时间轴，输出 1920x1080 的无声视频。
素材尺寸各不相同（竖拍手机、方形录屏、2x 截图），统一放到 1080p 画布上居中，
背景用产品浅色主题的底色，看起来像是刻意的版面而不是被 YouTube 加了黑边。
用法：python3 docs/video/build.py
"""
import json, os, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
FF = '/Users/aisandbox/Documents/companydata/node_modules/ffmpeg-static/ffmpeg'
A = os.path.join(HERE, 'assets')
S = os.path.join(HERE, 'shots')
WORK = os.path.join(HERE, 'work')
os.makedirs(WORK, exist_ok=True)

W, H, FPS = 1920, 1080, 30
BG = '#eef1f6'          # 产品浅色主题的面板色

DUR = {d['id']: d['dur'] for d in json.load(open(os.path.join(HERE, 'tts/durations.json')))}
GAP = 0.35              # 每段旁白之间留的呼吸

# (旁白 id, 素材, 类型, 参数)
#   video: (起点秒, 倍速)   —— 从原片这个位置开始，按倍速放，不够长就停在最后一帧
#   still: (推镜起始缩放, 结束缩放)
CUTS = [
    ('01_intro', 'IMG_7570.MOV',   'video', (0.3, 0.75)),   # 空碗，狗鼻子进画面
    ('02_ask',   'rec_plan.mov',   'video', (2, 1.0)),      # 提需求
    ('03_dog',   'rec_dog.mov',    'video', (1.5, 1.0)),    # 狗的照片在聊天里
    ('04_plan',  'rec_dog.mov',    'video', (18, 1.3)),     # 工具调用 + 采购清单
    ('05_wrong', 'IMG_7569.MOV',   'video', (0.3, 0.8)),    # 狗闻零件：这些是什么
    ('06_admit', '07_lies_table.png', 'still', (1.0, 1.10)),
    ('07_vcc',   '04_pitfalls.png',   'still', (1.14, 1.0)),
    ('08_entity','05_parts_grid.png', 'still', (1.0, 1.12)),
    ('09_wire',  '03_drawer_lcd.png', 'still', (1.10, 1.0)),
    ('10_build', 'rec_plan.mov',   'video', (150, 1.4)),
    ('11_light', 'led8.mp4',       'video', (0.5, 1.0)),
    ('12_tech',  '01_gallery.png',    'still', (1.0, 1.12)),
    ('13_rule',  '08_path.png',       'still', (1.08, 1.0)),
    ('14_close', 'led8.mp4',       'video', (3.0, 0.7)),
]

def run(args):
    r = subprocess.run([FF, '-y', '-loglevel', 'error'] + args, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if r.returncode:
        print('FFMPEG FAIL:', ' '.join(args)[:300]); print(r.stderr.decode()[-1500:]); sys.exit(1)

def fit(scale_expr=''):
    """缩到画布内（不裁切、不变形），居中，补背景。"""
    return (f'scale={W}:{H}:force_original_aspect_ratio=decrease{scale_expr},'
            f'pad={W}:{H}:(ow-iw)/2:(oh-ih)/2:color={BG},setsar=1')

parts = []
for i, (seg, src, kind, p) in enumerate(CUTS):
    dur = DUR[seg] + GAP
    out = os.path.join(WORK, f'{i:02d}_{seg}.mp4')
    if kind == 'video':
        start, speed = p
        path = os.path.join(A, src)
        if not os.path.exists(path):          # 有些素材在桌面
            path = os.path.expanduser('~/Desktop/' + src)
        # setpts 调速；tpad 把不够长的片尾定格补满，避免黑屏
        vf = (f'setpts=(PTS-STARTPTS)/{speed},{fit()},'
              f'tpad=stop_mode=clone:stop_duration={dur},fps={FPS},trim=duration={dur}')
        run(['-ss', str(start), '-i', path, '-an', '-vf', vf, '-c:v', 'libx264',
             '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p', out])
    else:
        z0, z1 = p                             # 缓慢推镜，静帧才不会显得是张图
        n = int(dur * FPS)
        zoom = f"zoompan=z='{z0}+({z1}-{z0})*on/{n}':d={n}:s={W}x{H}:fps={FPS}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'"
        run(['-loop', '1', '-i', os.path.join(S, src), '-t', str(dur),
             '-vf', f'{fit()},{zoom}', '-c:v', 'libx264', '-preset', 'medium',
             '-crf', '19', '-pix_fmt', 'yuv420p', out])
    parts.append(out)
    print(f'  {seg:10s} {dur:5.1f}s  {src}')

lst = os.path.join(WORK, 'concat.txt')
with open(lst, 'w') as f:
    for p in parts:
        f.write(f"file '{p}'\n")
silent = os.path.join(WORK, 'silent.mp4')
run(['-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy', silent])
print('\n无声片段:', silent)
