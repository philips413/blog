"""블로그 파비콘·아이콘(디스켓 얼굴)을 만든다.

사용법: python scripts/make_icons.py [출력 폴더]
기본 출력 폴더: themes/workbench/static/
- favicon.svg           선명한 벡터 도트(브라우저 탭, 메뉴바)
- favicon.ico           16·32·48 크기를 담은 ICO
- apple-touch-icon.png  180×180, 휴대폰 홈 화면용(불투명 배경)
16×16 도트 한 장에서 모두 만들며, 표준 라이브러리만 써서 매번 같은 결과가 나온다.
"""
import struct
import sys
import zlib
from pathlib import Path

# 바탕화면 걷는 캐릭터와 같은 팔레트
P = {"o": "#1c1c1f", "b": "#3a3b40", "m": "#a3a19a", "l": "#e8e6df", "a": "#c9a86a"}
FACE = [
    ".oooooooooooooo.",
    ".obbbmmmmmmbbbo.",
    ".obbbmmoommbbbo.",
    ".obbbmmoommbbbo.",
    ".obbbmmmmmmbbbo.",
    ".obbbbbbbbbbbbo.",
    ".obllllllllllbo.",
    ".obllllllllllbo.",
    ".obllollllollbo.",
    ".obllollllollbo.",
    ".obllllllllllbo.",
    ".obllllaallllbo.",
    ".obllllllllllbo.",
    ".obbbbbbbbbbbbo.",
    ".oooooooooooooo.",
    "................",
]
TOUCH_BG = "#d3d1ca"


def rgba(h):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) + (255,)


def pixels(scale, size=None, bg=None):
    """FACE를 scale배 확대해 size×size 캔버스 가운데에 놓은 RGBA 행 목록."""
    size = size or 16 * scale
    fill = rgba(bg) if bg else (0, 0, 0, 0)
    off = (size - 16 * scale) // 2
    img = [[fill] * size for _ in range(size)]
    for y, row in enumerate(FACE):
        for x, ch in enumerate(row):
            if ch in P:
                for dy in range(scale):
                    for dx in range(scale):
                        img[off + y * scale + dy][off + x * scale + dx] = rgba(P[ch])
    return img


def png(img):
    h, w = len(img), len(img[0])
    raw = b"".join(b"\x00" + bytes(c for px in row for c in px) for row in img)

    def chunk(tag, data):
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b""))


def ico(images):
    """PNG를 그대로 담는 ICO(Windows Vista 이후·모든 최신 브라우저 지원)."""
    head = struct.pack("<HHH", 0, 1, len(images))
    offset = 6 + 16 * len(images)
    entries, blobs = b"", b""
    for size, data in images:
        entries += struct.pack("<BBBBHHII", size % 256, size % 256, 0, 0, 1, 32, len(data), offset)
        blobs += data
        offset += len(data)
    return head + entries + blobs


def svg():
    rects = []
    for y, row in enumerate(FACE):
        x = 0
        while x < 16:
            ch, w = row[x], 1
            while x + w < 16 and row[x + w] == ch:
                w += 1
            if ch in P:
                rects.append(f'<rect x="{x}" y="{y}" width="{w}" height="1" fill="{P[ch]}"/>')
            x += w
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" '
            'shape-rendering="crispEdges">' + "".join(rects) + "</svg>")


def main(outdir):
    outdir.mkdir(parents=True, exist_ok=True)
    files = {
        "favicon.svg": svg().encode("utf-8"),
        "favicon.ico": ico([(s, png(pixels(s // 16))) for s in (16, 32, 48)]),
        "apple-touch-icon.png": png(pixels(10, 180, TOUCH_BG)),
    }
    for name, data in files.items():
        (outdir / name).write_bytes(data)
        print(f"{outdir / name} ({len(data)} B)")


if __name__ == "__main__":
    main(Path(sys.argv[1] if len(sys.argv) > 1 else "themes/workbench/static"))
