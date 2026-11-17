"""WORKBENCH 바탕화면용 도트 풍경을 PNG로 만든다.

사용법: python scripts/make_wallpaper.py [출력 폴더]
기본 출력 폴더: themes/workbench/static/img/
- wallpaper.png    하늘·언덕(구름 없음)
- clouds-far.png   뒤쪽 구름(투명 배경, 가로로 이어 붙여도 끊기지 않음)
- clouds-near.png  앞쪽 구름(같은 조건)
추가 설치 없이 표준 라이브러리만 쓰고, 같은 시드라 매번 같은 그림이 나온다.
"""
import math
import random
import struct
import sys
import zlib
from pathlib import Path

W, H = 320, 180
SEED = 413

# 차분한(저채도) 팔레트
SKY = ["#7d93a8", "#8799ad", "#91a2b3", "#9cabb9", "#a7b4bf", "#b2bdc5", "#bcc5cb"]
CLOUD, CLOUD_SHADE = "#dde1e2", "#c4cbcf"
FAR_CLOUD, FAR_CLOUD_SHADE = "#cdd4d8", "#bcc5ca"
CLEAR = (0, 0, 0, 0)
FAR = "#93a39a"                       # 먼 능선
BACK = ["#8a9d78", "#829670"]         # 뒤 언덕(위→아래)
FRONT = ["#7a8f66", "#71865d", "#677c55", "#5e724d"]  # 앞 언덕(위→아래)
SPECK = "#879b72"


def rgb(h):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) + (255,)


def sky(img):
    band = H * 0.62 / len(SKY)
    for y in range(H):
        f = y / band
        i = min(int(f), len(SKY) - 1)
        nxt = min(i + 1, len(SKY) - 1)
        frac = f - int(f)
        for x in range(W):
            # 띠 경계 아래쪽 1/4은 체크 디더링으로 섞는다
            use = nxt if frac > 0.75 and (x + y) % 2 == 0 else i
            img[y][x] = rgb(SKY[use])


def blob(img, cx, cy, r, color):
    # 가로는 W로 감싸서(wrap) 그려, 이어 붙였을 때 경계에서 구름이 잘리지 않게 한다
    for y in range(max(0, int(cy - r)), min(H, int(cy + r) + 1)):
        for x in range(int(cx - r * 1.6), int(cx + r * 1.6) + 1):
            if ((x - cx) / 1.6) ** 2 + (y - cy) ** 2 <= r * r:
                img[y][x % W] = rgb(color)


def clouds(img, rnd, spots, color, shade):
    for cx, cy, size in spots:
        parts = [(cx + rnd.randint(-size * 2, size * 2), cy + rnd.randint(-2, 2), size * rnd.uniform(0.7, 1.1))
                 for _ in range(4)]
        for px, py, r in parts:
            blob(img, px, py + 2, r, shade)
        for px, py, r in parts:
            blob(img, px, py, r - 1, color)


def ridge(img, base, waves, colors, speck=False, rnd=None):
    for x in range(W):
        top = base + sum(a * math.sin(x / p + ph) for a, p, ph in waves)
        top = int(round(top / 2) * 2)  # 2px 계단으로 도트 느낌
        depth = H - top
        for y in range(max(0, top), H):
            band = min(int((y - top) / max(depth, 1) * len(colors)), len(colors) - 1)
            img[y][x] = rgb(colors[band])
            if speck and rnd.random() < 0.02 and y > top + 3:
                img[y][x] = rgb(SPECK)


def png(img, path):
    raw = b"".join(b"\x00" + bytes(c for px in row for c in px) for row in img)  # RGBA

    def chunk(tag, data):
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    data = (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", W, H, 8, 6, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b""))
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)


def blank():
    return [[CLEAR] * W for _ in range(H)]


def main(outdir):
    rnd = random.Random(SEED)
    land = blank()
    sky(land)
    ridge(land, 104, [(3, 23, 0.5), (2, 9, 1.7)], [FAR])
    ridge(land, 122, [(9, 61, 2.2), (3, 19, 0.3)], BACK)
    ridge(land, 140, [(-12, 74, 0.9), (4, 27, 2.6)], FRONT, speck=True, rnd=rnd)

    far = blank()
    clouds(far, rnd, [(30, 14, 4), (128, 10, 3), (205, 18, 4), (290, 9, 3)], FAR_CLOUD, FAR_CLOUD_SHADE)
    near = blank()
    clouds(near, rnd, [(48, 30, 7), (176, 24, 6), (262, 38, 8)], CLOUD, CLOUD_SHADE)

    for name, img in [("wallpaper.png", land), ("clouds-far.png", far), ("clouds-near.png", near)]:
        out = outdir / name
        png(img, out)
        print(f"{out} ({out.stat().st_size} B, {W}x{H})")


if __name__ == "__main__":
    main(Path(sys.argv[1] if len(sys.argv) > 1 else "themes/workbench/static/img"))
