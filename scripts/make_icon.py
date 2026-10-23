#!/usr/bin/env python3
"""Generate icon Klip Downloader: rounded dark tile + green gradient download arrow + play accent."""
from PIL import Image, ImageDraw
import os

S = 1024
img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
d = ImageDraw.Draw(img)

# --- rounded background with vertical gradient ---
r = int(S * 0.22)
grad = Image.new('RGBA', (S, S), (0, 0, 0, 0))
gd = ImageDraw.Draw(grad)
top = (18, 28, 58)
bot = (8, 12, 30)
for y in range(S):
    t = y / S
    c = tuple(int(top[i] + (bot[i] - top[i]) * t) for i in range(3)) + (255,)
    gd.line([(0, y), (S, y)], fill=c)

mask = Image.new('L', (S, S), 0)
md = ImageDraw.Draw(mask)
md.rounded_rectangle([8, 8, S - 8, S - 8], radius=r, fill=255)
img.paste(grad, (0, 0), mask)

# --- subtle border ring ---
d.rounded_rectangle([8, 8, S - 8, S - 8], radius=r, outline=(56, 189, 248, 90), width=10)

# --- green circle (download button look) ---
cx, cy = S / 2, S * 0.46
R = S * 0.30
circle_grad = Image.new('RGBA', (S, S), (0, 0, 0, 0))
cd = ImageDraw.Draw(circle_grad)
for y in range(int(cy - R), int(cy + R) + 1):
    t = (y - (cy - R)) / (2 * R)
    c = (int(34 + (22 - 34) * t), int(197 + (163 - 197) * t), int(94 + (74 - 94) * t), 255)
    cd.line([(0, y), (S, y)], fill=c)
cmask = Image.new('L', (S, S), 0)
cmd = ImageDraw.Draw(cmask)
cmd.ellipse([cx - R, cy - R, cx + R, cy + R], fill=255)
img.paste(circle_grad, (0, 0), cmask)

# --- white down arrow ---
aw = S * 0.085          # arrow shaft half-width
ay_top = cy - S * 0.155
ay_bot = cy + S * 0.085
head_w = S * 0.17
head_h = S * 0.115
white = (255, 255, 255, 255)
d.rounded_rectangle([cx - aw, ay_top, cx + aw, ay_bot], radius=int(S * 0.02), fill=white)
d.polygon([(cx - head_w, ay_bot), (cx + head_w, ay_bot), (cx, ay_bot + head_h)], fill=white)

# --- tray (folder line) below arrow ---
ty = cy + S * 0.215
d.rounded_rectangle([cx - S * 0.155, ty, cx + S * 0.155, ty + S * 0.045], radius=int(S * 0.022), fill=white)

# --- small play triangle accent (top-right) ---
px, py = S * 0.775, S * 0.185
pr = S * 0.055
d.ellipse([px - pr * 1.25, py - pr * 1.25, px + pr * 1.25, py + pr * 1.25], fill=(56, 189, 248, 255))
d.polygon([(px - pr * 0.45, py - pr * 0.62), (px - pr * 0.45, py + pr * 0.62), (px + pr * 0.7, py)], fill=(8, 12, 30, 255))

out = '/home/z/my-project/klip-downloader/build'
os.makedirs(out, exist_ok=True)
# PNG for window icon
img.resize((512, 512), Image.LANCZOS).save(os.path.join(out, 'icon.png'))

# ICO with multiple sizes
sizes = [(256, 256), (128, 128), (96, 96), (64, 64), (48, 48), (32, 32), (16, 16)]
img.save(os.path.join(out, 'icon.ico'), format='ICO', sizes=sizes)
print('icon OK:', os.listdir(out))
