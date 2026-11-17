# 슬기로운 .dev생활

Hugo로 만든 개인 블로그입니다. 16bit 데스크톱 스타일의 자체 테마(`workbench`)를 쓰고, GitHub Pages로 배포합니다.

- 사이트: https://philips413.github.io
- 원본 저장소: `philips413/blog` (이 저장소)
- 배포 저장소: `philips413/philips413.github.io` (`public/` 서브모듈)

## 폴더 구조

| 경로 | 내용 |
|---|---|
| `content/post/<분류>/` | 글(마크다운). 예: `content/post/essay/essay_2024040701.md` |
| `content/about.md` | 소개 페이지 |
| `assets/images/` | 글에 넣는 이미지 |
| `themes/workbench/` | 블로그 테마(레이아웃·CSS·JS·글꼴·아이콘) |
| `hugo.toml` | 사이트 설정(제목, 메뉴, 숨김 규칙 등) |
| `public/` | 빌드 결과. 배포 저장소(서브모듈)라 직접 고치지 않음 |
| `scripts/` | 점검·이미지 생성 스크립트 |
| `deploy.sh` | 배포 스크립트 |

## 준비물

- [Hugo](https://gohugo.io/) (extended 아님, 0.147 이상)
- Python 3.11 이상 (점검 스크립트)
- Git Bash (Windows) 또는 일반 터미널(Mac·Linux)
- (선택) [GitHub CLI `gh`](https://cli.github.com/): 배포 완료까지 기다려 확인할 때

처음 받았을 때는 서브모듈도 받아야 합니다.

```bash
git clone --recurse-submodules https://github.com/philips413/blog.git
cd blog
git -C public checkout master
```

## 로컬에서 보기

```bash
hugo server -D --renderToMemory
```

http://localhost:1313 에서 확인합니다. 글·테마를 고치면 자동으로 새로고침됩니다.

> `--renderToMemory`를 꼭 붙이세요. 빼면 개발용 결과물이 `public/`(배포 폴더)을 덮어씁니다.

## 글 쓰기

새 글은 `content/post/<분류>/` 아래에 만듭니다.

```bash
hugo new content post/essay/essay_20261117.md
```

머리말 예시:

```yaml
---
title: "[에세이] 제목"
date: 2026-11-17
categories: ["에세이"]
tags: ["에세이"]
series: []
---
```

> 이 블로그는 초안까지 포함해서(`hugo -D`) 빌드합니다. 그래서 `draft: true`인 글도 배포하면 **공개됩니다**. 공개하지 않을 글은 아래 "글 숨기기"를 쓰세요.

### 이미지 넣기

1. 이미지를 `assets/images/` 아래에 둡니다. 예: `assets/images/2026/retro-01.jpg`
2. 글에서 경로만 적습니다. 앞에 `/`를 붙여도 됩니다.

```markdown
![회고 사진](images/2026/retro-01.jpg)
![회고 사진](/images/2026/retro-01.jpg "마우스를 올리면 보이는 제목")
```

- 빌드할 때 `/images/...` 주소로 함께 올라가고, 가로·세로 크기와 지연 로딩이 자동으로 붙습니다.
- 외부 이미지 주소(`https://...`)는 그대로 쓸 수 있습니다.
- 경로를 잘못 적으면 빌드 때 `WARN 이미지를 찾을 수 없음` 경고가 뜨고, 배포 점검에서도 멈춥니다.
- 마크다운 `![]()` 문법에만 적용됩니다. HTML `<img>` 태그는 그대로 출력됩니다.

### 대표 이미지(목록 미리보기)

글 목록(홈, 모든 글보기, 카테고리·태그·시리즈)에서 이미지가 있는 글은 제목 앞에 작은 미리보기가 나옵니다.

1. 머리말에 `image:`를 적으면 그 이미지를 씁니다.
2. 없으면 본문의 첫 번째 이미지(마크다운·HTML 모두)를 자동으로 씁니다.
3. 이미지가 없는 글은 문서 아이콘이 나옵니다.

```yaml
image: images/2026/retro-01.jpg   # assets/images 기준. 외부 주소(https://...)도 가능
```

`assets/` 안의 이미지는 빌드할 때 미리보기 크기로 잘라 작은 파일을 따로 만들고, 외부 주소는 원본을 줄여 보여줍니다. `image:` 경로를 잘못 적으면 빌드 때 `WARN 대표 이미지를 찾을 수 없음` 경고가 뜹니다.

### 글 숨기기

`hugo.toml`의 `[[cascade]]` 규칙으로 특정 폴더의 글을 사이트에서 뺍니다. 원본 파일은 저장소에 남습니다. 지금은 교회 회의록(`content/post/church/`)이 숨겨져 있습니다.

```toml
[[cascade]]
[cascade.build]
list = "never"
render = "never"
[cascade.target]
path = "/post/church/**"
```

## 배포

`deploy.sh` 하나로 빌드부터 배포 확인까지 합니다. Git Bash에서 블로그 폴더로 이동해 실행하세요.

```bash
./deploy.sh "커밋 메시지"
```

| 사용 예 | 동작 |
|---|---|
| `./deploy.sh "글 수정"` | 빌드 → 점검 → 바뀐 파일 목록 보여주고 확인(y/N) → 커밋·push |
| `./deploy.sh` | 커밋 메시지를 `블로그 업데이트 YYYY-MM-DD HH:MM`으로 자동 지정 |
| `./deploy.sh --dry-run` | 빌드와 점검만 하고 커밋·push는 하지 않음 |
| `./deploy.sh -y "글 수정"` | 확인 질문 없이 바로 커밋·push |
| `./deploy.sh --help` | 도움말 |

스크립트가 하는 일:

1. **사전 확인**: hugo·python 설치, `public/`이 브랜치에 있는지, 원격에 받지 않은 커밋이 없는지 확인합니다.
2. **클린 빌드**: `public/`을 비우고 `hugo -D`로 다시 만듭니다. Hugo 밖에서 따로 올린 `manito/`, `address/`는 보존합니다.
3. **점검**: `scripts/check_site.py`로 깨진 링크, 빠진 글, 숨긴 글 노출, 검색 인덱스를 확인합니다. 문제가 있으면 멈춥니다.
4. **확인**: 바뀐 파일 목록을 보여주고 묻습니다. 바뀐 것이 없으면 "올릴 변경이 없습니다"로 끝납니다.
5. **커밋·push**: `public/`(사이트)을 먼저, 그다음 원본 블로그를 올립니다. 원본은 `content`, `assets`, `themes`, `hugo.toml`, `scripts`, `archetypes`, `public`, `deploy.sh`, `.gitattributes`, `.gitignore`, `README.md`만 커밋합니다.
6. **배포 확인**: `gh`가 로그인돼 있으면 GitHub Pages 배포가 끝날 때까지 기다렸다가 결과를 알려줍니다.

멈췄을 때는 `중단:` 뒤에 이유와 해결 방법이 나옵니다. 자주 나오는 경우:

| 메시지 | 해결 |
|---|---|
| 원격에 새 커밋이 N개 있습니다 | 안내된 `git -C <저장소> pull` 실행 후 다시 배포 |
| 브랜치에 있지 않습니다(detached HEAD) | `git -C public checkout master` |
| 점검에서 문제가 나왔습니다 | 위에 나온 깨진 링크·이미지 경로를 고친 뒤 다시 배포 |

> Mac·Linux에서 처음 쓸 때 실행 권한이 없다고 나오면 `chmod +x deploy.sh`를 실행하세요.

## 스크립트

| 스크립트 | 용도 |
|---|---|
| `scripts/check_site.py <빌드 폴더> [content] [--ignore 폴더,...]` | 빌드 결과 점검. 배포 스크립트가 자동으로 실행 |
| `scripts/make_wallpaper.py` | 바탕화면 도트 풍경(`wallpaper.png`)과 구름 두 장(`clouds-far.png`, `clouds-near.png`) 생성 |
| `scripts/make_icons.py` | 파비콘(`favicon.ico`, `favicon.svg`)과 휴대폰 홈 화면 아이콘(`apple-touch-icon.png`) 생성 |

그림 스크립트는 결과를 `themes/workbench/static/` 아래에 저장합니다. 색이나 모양을 바꾸려면 스크립트 안의 팔레트·도트 배열을 고친 뒤 다시 실행하세요. 표준 라이브러리만 쓰고, 매번 같은 결과가 나옵니다.

## 테마(workbench) 참고

- 글꼴: 메뉴·제목·터미널에는 픽셀 글꼴 [갈무리(Galmuri)](https://github.com/quiple/galmuri)(SIL OFL 1.1, `themes/workbench/static/fonts/OFL.md`)를 씁니다. 본문에는 시스템 한글 글꼴을 씁니다.
- 애니메이션(걷는 캐릭터, 터미널 타이핑, 구름)은 운영체제의 "애니메이션 줄이기" 설정을 켜면 멈춥니다.
- 블로그 이름·메뉴는 `hugo.toml`의 `title`, `params.brand`, `[[menu.main]]`에서 바꿉니다.
