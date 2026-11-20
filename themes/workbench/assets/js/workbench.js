(function () {
  "use strict";
  var me = document.currentScript;
  var indexUrl = (me && me.dataset.index) || "/index.json";
  var root = document.documentElement;

  // 다크 모드 버튼: 선택은 이 브라우저에만 기억한다(저장이 막혀 있어도 전환은 된다)
  var themeBtn = document.getElementById("theme");
  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      var dark = root.dataset.theme
        ? root.dataset.theme === "dark"
        : window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches;
      var next = dark ? "light" : "dark";
      root.dataset.theme = next;
      try { localStorage.setItem("theme", next); } catch (e) { /* 저장 불가: 이번 방문에만 적용 */ }
    });
  }

  // 카드 대표 이미지(주로 외부 주소)를 못 불러오면 사진 영역을 뺀다
  function dropImage(img) {
    var card = img.closest(".card");
    if (card) card.classList.remove("has-img");
    img.remove();
  }
  document.addEventListener("error", function (e) {
    if (e.target && e.target.matches && e.target.matches("img.card-img")) dropImage(e.target);
  }, true);
  Array.prototype.forEach.call(document.querySelectorAll("img.card-img"), function (img) {
    if (img.complete && img.naturalWidth === 0 && img.currentSrc) dropImage(img);
  });

  // 검색
  var input = document.getElementById("q");
  var box = document.getElementById("results");
  if (!input || !box) return;
  var data = null, loading = null;

  function load() {
    if (data) return Promise.resolve(data);
    if (!loading) {
      loading = fetch(indexUrl).then(function (r) {
        if (!r.ok) throw new Error(r.status);
        return r.json();
      }).then(function (j) { data = j; return j; })
        .catch(function () { loading = null; return null; });
    }
    return loading;
  }

  function esc(s) {
    return s.replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; });
  }
  function mark(text, q) {
    var i = text.toLowerCase().indexOf(q);
    if (i < 0) return esc(text);
    return esc(text.slice(0, i)) + "<mark>" + esc(text.slice(i, i + q.length)) + "</mark>" + esc(text.slice(i + q.length));
  }
  function snippet(s, q) {
    var i = s.toLowerCase().indexOf(q);
    if (i < 0) return s.slice(0, 70);
    var from = Math.max(0, i - 25);
    return (from > 0 ? "…" : "") + s.slice(from, from + 80) + "…";
  }

  function render(q) {
    if (!q) { box.hidden = true; box.innerHTML = ""; return; }
    load().then(function (items) {
      if (input.value.trim().toLowerCase() !== q) return;
      if (!items) {
        box.innerHTML = '<p class="none">검색 목록을 불러오지 못했습니다. 잠시 뒤 다시 시도해 주세요.</p>';
        box.hidden = false;
        return;
      }
      var hits = items.filter(function (p) {
        return (p.t + " " + p.c + " " + p.g.join(" ") + " " + p.s).toLowerCase().indexOf(q) >= 0;
      }).slice(0, 8);
      box.innerHTML = hits.length
        ? hits.map(function (p) {
            return '<a href="' + esc(p.u) + '"><b>' + mark(p.t, q) + "</b><small>" + esc(p.d) + " · " + esc(p.c) + "</small><small>" + mark(snippet(p.s, q), q) + "</small></a>";
          }).join("")
        : '<p class="none">“' + esc(q) + '”에 맞는 글이 없습니다.</p>';
      box.hidden = false;
    });
  }

  var timer;
  input.addEventListener("focus", load, { once: true });
  input.addEventListener("input", function () {
    clearTimeout(timer);
    timer = setTimeout(function () { render(input.value.trim().toLowerCase()); }, 120);
  });
  input.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { input.value = ""; render(""); input.blur(); }
    if (e.key === "Enter") { var first = box.querySelector("a"); if (first) location.href = first.href; }
  });
  document.addEventListener("click", function (e) {
    if (!e.target.closest(".search")) box.hidden = true;
  });
  // "/" 키로 검색창으로 이동(다른 입력칸에 쓰는 중이면 무시)
  document.addEventListener("keydown", function (e) {
    if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey) return;
    var t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    e.preventDefault();
    input.focus();
  });
})();
