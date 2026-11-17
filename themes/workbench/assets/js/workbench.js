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

  // 목록 대표 이미지(주로 외부 주소)를 못 불러오면 문서 아이콘으로 바꾼다
  function thumbFallback(img) {
    var name = img.closest(".item") && img.closest(".item").querySelector(".name");
    if (name && !name.querySelector(".doc")) {
      var doc = document.createElement("span");
      doc.className = "doc";
      doc.setAttribute("aria-hidden", "true");
      name.insertBefore(doc, name.firstChild);
    }
    img.remove();
  }
  document.addEventListener("error", function (e) {
    if (e.target && e.target.matches && e.target.matches("img.thumb")) thumbFallback(e.target);
  }, true);
  Array.prototype.forEach.call(document.querySelectorAll("img.thumb"), function (img) {
    if (img.complete && img.naturalWidth === 0 && img.currentSrc) thumbFallback(img);
  });

  // 도트 애니메이션은 "애니메이션 줄이기" 설정이면 모두 끈다
  var calm = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  function rand(a, b) { return a + Math.random() * (b - a); }

  // 오른쪽 창 위를 천천히 걷다가 쉬는 캐릭터. 탭이 안 보이거나 영역이 숨겨지면 멈춘다
  var lane = document.querySelector(".buddy-lane");
  var buddy = lane && lane.querySelector(".buddy");
  if (buddy) {
    var SIZE = 48, SPEED = 18; // px/s
    var x = 0, dir = 1, walking = false, until = 0, last = 0, raf = 0;
    var place = function () { buddy.style.transform = "translateX(" + x + "px) scaleX(" + dir + ")"; };
    var setWalk = function (on, now) {
      walking = on;
      buddy.classList.toggle("walking", on);
      until = now + (on ? rand(7000, 14000) : rand(2500, 6000));
    };
    var step = function (now) {
      var max = lane.clientWidth - SIZE;
      if (!lane.offsetParent || max <= 0) { raf = 0; buddy.classList.remove("walking"); return; }
      var dt = last ? Math.min(now - last, 100) / 1000 : 0;
      last = now;
      if (walking) {
        x += dir * SPEED * dt;
        if (x <= 0) { x = 0; dir = 1; }
        if (x >= max) { x = max; dir = -1; }
        if (now > until) setWalk(false, now);
      } else if (now > until) {
        if (Math.random() < 0.4) dir = -dir;
        setWalk(true, now);
      }
      place();
      raf = requestAnimationFrame(step);
    };
    var start = function () {
      if (calm || raf || document.hidden || !lane.offsetParent) return;
      last = 0;
      raf = requestAnimationFrame(function (t) { if (!until) setWalk(true, t); step(t); });
    };
    var stop = function () { if (raf) cancelAnimationFrame(raf); raf = 0; buddy.classList.remove("walking"); };
    x = Math.round(rand(0, Math.max(0, lane.clientWidth - SIZE)));
    place();
    start();
    document.addEventListener("visibilitychange", function () { document.hidden ? stop() : start(); });
    window.addEventListener("resize", function () { stop(); start(); });
  }

  // 홈 터미널: 명령어를 한 번만 타이핑하고 결과를 차례로 보여준다(JS가 없으면 처음부터 전부 보임)
  var term = document.querySelector(".term[data-typing]");
  if (term && !calm) {
    var cmds = Array.prototype.slice.call(term.querySelectorAll(".cmd"));
    var outs = Array.prototype.slice.call(term.querySelectorAll(".out"));
    var cursor = term.querySelector(".c");
    var texts = cmds.map(function (c) { return c.textContent; });
    cmds.forEach(function (c) { c.textContent = ""; });
    outs.forEach(function (o) { o.style.visibility = "hidden"; });
    var i = 0;
    var typeNext = function () {
      if (i >= cmds.length) { if (cursor) term.appendChild(cursor); return; }
      var c = cmds[i], t = texts[i], n = 0;
      if (cursor) c.after(cursor);
      var timer = setInterval(function () {
        c.textContent = t.slice(0, ++n);
        if (n >= t.length) {
          clearInterval(timer);
          setTimeout(function () {
            if (outs[i]) outs[i].style.visibility = "";
            i++;
            setTimeout(typeNext, 350);
          }, 250);
        }
      }, 55);
    };
    setTimeout(typeNext, 400);
  }

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
