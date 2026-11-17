(function () {
  "use strict";
  var me = document.currentScript;
  var indexUrl = (me && me.dataset.index) || "/index.json";

  // 메뉴바 시계: 빌드 날짜 대신 방문 시점의 날짜·시간을 보여준다
  var clock = document.getElementById("clock");
  function pad(n) { return String(n).padStart(2, "0"); }
  function tick() {
    var d = new Date();
    clock.textContent = d.getFullYear() + "." + pad(d.getMonth() + 1) + "." + pad(d.getDate()) + " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
  }
  if (clock) { tick(); setInterval(tick, 30000); }

  // 404: 요청한 주소를 터미널에 표시
  var nf = document.getElementById("nf-path");
  if (nf) nf.textContent = decodeURIComponent(location.pathname);

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
    if (e.key === "Escape") { input.value = ""; render(""); }
    if (e.key === "Enter") { var first = box.querySelector("a"); if (first) location.href = first.href; }
  });
  document.addEventListener("click", function (e) {
    if (!e.target.closest(".search")) box.hidden = true;
  });
})();
