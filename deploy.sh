#!/usr/bin/env bash
# 블로그 배포: 클린 빌드 → 점검 → public 저장소 커밋·push → 원본 저장소 커밋·push → Pages 배포 확인
# 사용법: ./deploy.sh [--dry-run] [-y] ["커밋 메시지"]
#   --dry-run  빌드와 점검만 하고 커밋·push는 하지 않음
#   -y         커밋·push 전에 확인을 묻지 않음
#   메시지를 빼면 "블로그 업데이트 YYYY-MM-DD HH:MM"
set -euo pipefail

KEEP=(manito address)   # public에 Hugo 밖에서 따로 올린 폴더. 빌드할 때 지우지 않고 보존
SOURCE_PATHS=(content assets themes hugo.toml scripts archetypes public deploy.sh .gitattributes .gitignore README.md)
SITE_URL="https://philips413.github.io"
PAGES_REPO="philips413/philips413.github.io"

DRY=0; YES=0; MSG=""
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY=1 ;;
    -y|--yes) YES=1 ;;
    -h|--help) sed -n '2,6p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    -*) echo "알 수 없는 옵션: $arg (도움말: ./deploy.sh --help)" >&2; exit 2 ;;
    *) MSG="$arg" ;;
  esac
done
[ -n "$MSG" ] || MSG="블로그 업데이트 $(date '+%Y-%m-%d %H:%M')"

cd "$(dirname "$0")"
step() { printf '\n== %s\n' "$*"; }
die() { printf '\n중단: %s\n' "$*" >&2; exit 1; }

# ---------------------------------------------------------------- 1. 사전 확인
step "사전 확인"
command -v hugo >/dev/null || die "hugo가 설치돼 있지 않습니다."
PY=$(command -v python3 || command -v python) || die "python이 설치돼 있지 않습니다."
[ -e public/.git ] || die "public 서브모듈이 없습니다. 'git submodule update --init'을 먼저 실행하세요."
for repo in . public; do
  git -C "$repo" symbolic-ref -q HEAD >/dev/null \
    || die "$repo 저장소가 브랜치에 있지 않습니다(detached HEAD). 'git -C $repo checkout master' 후 다시 실행하세요."
  git -C "$repo" fetch -q || die "$repo 저장소에서 fetch에 실패했습니다. 네트워크를 확인하세요."
  behind=$(git -C "$repo" rev-list --count 'HEAD..@{u}')
  [ "$behind" = 0 ] || die "$repo 저장소의 원격에 새 커밋이 ${behind}개 있습니다. 'git -C $repo pull' 후 다시 실행하세요."
done
echo "확인 완료"

# ---------------------------------------------------------------- 2. 클린 빌드
step "클린 빌드 (hugo -D)"
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
for d in "${KEEP[@]}"; do
  if [ -e "public/$d" ]; then cp -r "public/$d" "$tmp/"; fi
done
find public -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
built=0
hugo -D --destination public && built=1
for d in "${KEEP[@]}"; do
  if [ -e "$tmp/$d" ]; then cp -r "$tmp/$d" public/; fi
done
[ "$built" = 1 ] || die "hugo 빌드에 실패했습니다. 위 오류를 고친 뒤 다시 실행하세요."

# ---------------------------------------------------------------- 3. 점검
step "점검"
ignore=$(IFS=,; echo "${KEEP[*]}")
"$PY" -X utf8 scripts/check_site.py public content --ignore "$ignore" \
  || die "점검에서 문제가 나왔습니다. 위 목록을 고친 뒤 다시 실행하세요."

# ---------------------------------------------------------------- 4. 변경 내용
step "변경 내용"
existing=()
for p in "${SOURCE_PATHS[@]}"; do
  if [ -e "$p" ]; then existing+=("$p"); fi
done
# 실제 내용 기준으로 바뀐 파일만 센다(줄바꿈 변환 때문에 내용은 같은데 'M'으로 보이는 파일은 제외)
changed() {
  local repo=$1; shift
  git -C "$repo" -c core.quotepath=false diff HEAD --name-only --ignore-submodules=dirty -- "$@" 2>/dev/null
  git -C "$repo" -c core.quotepath=false ls-files --others --exclude-standard -- "$@"
}
pub_changes=$(changed public .)
src_changes=$(changed . "${existing[@]}")
if [ -z "$pub_changes" ] && [ -z "$src_changes" ]; then
  echo "올릴 변경이 없습니다."
  exit 0
fi
count() { if [ -n "$1" ]; then printf '%s\n' "$1" | wc -l | tr -d ' '; else echo 0; fi; }
echo "[사이트 public] 바뀐 파일 $(count "$pub_changes")개"
if [ -n "$pub_changes" ]; then printf '%s\n' "$pub_changes" | head -15 | sed 's/^/  /'; fi
echo "[원본 블로그] 바뀐 파일 $(count "$src_changes")개"
if [ -n "$src_changes" ]; then printf '%s\n' "$src_changes" | sed 's/^/  /'; fi
echo "커밋 메시지: $MSG"

if [ "$DRY" = 1 ]; then
  echo
  echo "dry-run: 빌드와 점검만 했고 커밋·push는 하지 않았습니다. (public 폴더에는 새 빌드 결과가 남아 있습니다)"
  exit 0
fi

if [ "$YES" != 1 ]; then
  ans=""
  read -r -p "커밋하고 push할까요? (y/N) " ans || true
  case "$ans" in
    y|Y|yes) ;;
    *) echo "취소했습니다. 커밋·push하지 않았습니다."; exit 0 ;;
  esac
fi

# ---------------------------------------------------------------- 5. 커밋·push
pushed_public=0
if [ -n "$pub_changes" ]; then
  step "사이트(public) 커밋·push"
  git -C public add -A
  if git -C public diff --cached --quiet; then
    echo "사이트는 바뀐 것이 없습니다."
  else
    git -C public commit -q -m "$MSG"
    git -C public push -q
    pushed_public=1
    git -C public log --oneline -1
  fi
fi

step "원본 블로그 커밋·push"
git add -- "${existing[@]}"
if git diff --cached --quiet -- "${existing[@]}"; then
  echo "원본 블로그는 바뀐 것이 없습니다."
else
  git commit -q -m "$MSG" -- "${existing[@]}"
  git push -q
  git log --oneline -1
fi

# ---------------------------------------------------------------- 6. 배포 확인
if [ "$pushed_public" = 1 ] && command -v gh >/dev/null && gh auth status >/dev/null 2>&1; then
  step "GitHub Pages 배포 확인"
  sha=$(git -C public rev-parse HEAD)
  run_id=""
  for _ in $(seq 1 30); do
    run_id=$(gh run list -R "$PAGES_REPO" -L 5 --json databaseId,headSha \
      --jq ".[] | select(.headSha==\"$sha\") | .databaseId" | head -1)
    [ -n "$run_id" ] && break
    sleep 2
  done
  if [ -z "$run_id" ]; then
    echo "배포 작업을 찾지 못했습니다. 잠시 뒤 $SITE_URL 을 확인하세요."
  elif gh run watch "$run_id" -R "$PAGES_REPO" --exit-status >/dev/null; then
    echo "배포 완료: $SITE_URL"
  else
    echo "배포 실패: 'gh run view $run_id -R $PAGES_REPO --log-failed'로 원인을 확인하세요."
    exit 1
  fi
elif [ "$pushed_public" = 1 ]; then
  echo
  echo "push 완료. 1~2분 뒤 $SITE_URL 에서 확인하세요. (gh가 있으면 배포 완료까지 기다려 줍니다)"
fi
