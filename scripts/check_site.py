"""빌드 결과(public 등)를 점검한다.

사용법: python scripts/check_site.py <빌드 폴더> [content 폴더] [--ignore 폴더1,폴더2]
  --ignore  Hugo가 만들지 않은 폴더(예: manito,address)는 링크 점검에서 뺀다
- 내부 링크(href/src)가 모두 실제 파일을 가리키는지
- 원본 글마다 결과 페이지가 있는지
- hugo.toml의 cascade로 숨긴(render = "never") 글은 결과에 없는지
- 검색 인덱스(index.json)가 올바르고 글 수가 맞는지
- 주요 화면(홈, 2페이지, 글 목록, 분류, 404)이 있는지
문제가 하나라도 있으면 종료 코드 1을 돌려준다.
"""
import argparse
import fnmatch
import json
import sys
import tomllib
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit


class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.urls = []

    def handle_starttag(self, tag, attrs):
        for k, v in attrs:
            if k in ("href", "src") and v:
                self.urls.append(v)


def target(root: Path, page: Path, url: str):
    parts = urlsplit(url)
    if parts.scheme or parts.netloc or url.startswith(("#", "mailto:", "data:")):
        return None
    path = unquote(parts.path)
    if not path:
        return None
    base = root if path.startswith("/") else page.parent
    t = (base / path.lstrip("/")).resolve()
    return t / "index.html" if path.endswith("/") or t.is_dir() else t


def hidden_patterns(config: Path):
    """hugo.toml에서 render = "never"로 숨긴 cascade 대상 경로(glob)를 돌려준다."""
    if not config.exists():
        return []
    cfg = tomllib.loads(config.read_text(encoding="utf-8"))
    cascades = cfg.get("cascade", [])
    if isinstance(cascades, dict):
        cascades = [cascades]
    return [c["target"]["path"].lstrip("/") for c in cascades
            if c.get("build", {}).get("render") == "never" and "path" in c.get("target", {})]


def main(out: Path, content: Path, ignore=()):
    errors = []
    pages = [p for p in out.rglob("*.html") if p.relative_to(out).parts[0] not in ignore]
    for page in pages:
        p = Links()
        p.feed(page.read_text(encoding="utf-8"))
        for url in p.urls:
            t = target(out, page, url)
            if t is not None and not t.exists():
                errors.append(f"깨진 링크: {page.relative_to(out)} -> {url}")

    hidden = hidden_patterns(content.parent / "hugo.toml")
    posts = []
    for md in sorted((content / "post").rglob("*.md")):
        rel = md.relative_to(content).with_suffix("")
        page = out / rel / "index.html"
        if any(fnmatch.fnmatch(rel.as_posix(), pat) for pat in hidden):
            if page.exists():
                errors.append(f"숨긴 글이 결과에 남아 있음: {rel}")
            continue
        posts.append(md)
        if not page.exists():
            errors.append(f"글 페이지 없음: {rel}")

    idx = out / "index.json"
    try:
        items = json.loads(idx.read_text(encoding="utf-8"))
        if len(items) != len(posts):
            errors.append(f"검색 인덱스 글 수 불일치: {len(items)} != {len(posts)}")
        for it in items:
            if not {"t", "u", "d", "c", "g", "s"} <= it.keys():
                errors.append(f"검색 인덱스 항목 필드 누락: {it.get('u')}")
    except (OSError, ValueError) as e:
        errors.append(f"검색 인덱스 오류: {e}")

    for need in ["index.html", "page/2/index.html", "post/index.html", "categories/index.html",
                 "tags/index.html", "series/index.html", "404.html", "index.xml", "sitemap.xml"]:
        if not (out / need).exists():
            errors.append(f"필수 페이지 없음: {need}")

    print(f"HTML {len(pages)}개, 공개 글 {len(posts)}개 점검 (숨김 규칙: {', '.join(hidden) or '없음'}"
          f"{', 제외 폴더: ' + ', '.join(ignore) if ignore else ''})")
    for e in errors:
        print(" -", e)
    print("통과" if not errors else f"실패 {len(errors)}건")
    return 1 if errors else 0


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("out")
    ap.add_argument("content", nargs="?", default="content")
    ap.add_argument("--ignore", default="")
    a = ap.parse_args()
    sys.exit(main(Path(a.out).resolve(), Path(a.content).resolve(), tuple(x for x in a.ignore.split(",") if x)))
