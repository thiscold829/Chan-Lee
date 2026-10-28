(function () {
  var root = document.documentElement;
  function all(sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)); }
  function lang() { return root.getAttribute('data-lang') === 'ko' ? 'ko' : 'en'; }
  function label(el, en, ko) {
    el.setAttribute('data-en', en);
    el.setAttribute('data-ko', ko);
    el.textContent = lang() === 'ko' ? ko : en;
  }
  var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 대표 작업 거르기
  var filters = all('[data-filter]');
  var tiles = all('.tile');
  function filter(key) {
    filters.forEach(function (b) { b.classList.toggle('is-on', b.getAttribute('data-filter') === key); });
    tiles.forEach(function (t) {
      var cats = ' ' + (t.getAttribute('data-cat') || '') + ' ';
      t.hidden = key !== 'all' && cats.indexOf(' ' + key + ' ') < 0;
    });
    // 묶음 제목은 그 묶음에 보이는 칸이 있을 때만
    all('.tiles__g').forEach(function (g) {
      var el = g.nextElementSibling, any = false;
      while (el && !el.classList.contains('tiles__g')) { if (!el.hidden) any = true; el = el.nextElementSibling; }
      g.hidden = !any;
    });
  }
  filters.forEach(function (btn) {
    btn.addEventListener('click', function () { filter(btn.getAttribute('data-filter')); });
  });

  // 전체 작업 목록 거르기
  var ifilters = all('[data-ifilter]');
  ifilters.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var key = btn.getAttribute('data-ifilter');
      ifilters.forEach(function (b) { b.classList.toggle('is-on', b === btn); });
      all('.idx tbody tr').forEach(function (tr) { tr.hidden = key !== 'all' && tr.getAttribute('data-type') !== key; });
    });
  });

  // 첫 화면 낱말을 누르면 그 분야의 작업만 보여 준다
  var goto = { scientist: 'research', planner: 'planning', builder: 'making' };
  all('.role').forEach(function (el) {
    function go() {
      var key = goto[el.getAttribute('data-key')];
      var work = document.getElementById('work');
      if (!work) return;
      filter(key);
      work.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'start' });
    }
    el.addEventListener('click', go);
    el.addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); });
  });

  // 소메뉴·주소의 ?cat=: 첫 화면의 작업 격자를 그 분야로 거른다. 같은 쪽 안에서 누르면 다시 읽지 않고 거른 뒤 내려간다
  var cat = null;
  try { cat = new URLSearchParams(location.search).get('cat'); } catch (err) {}
  if (cat && filters.length && ['research', 'planning', 'making', 'all'].indexOf(cat) >= 0) filter(cat);
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest && e.target.closest('a[href*="?cat="]');
    var work = document.getElementById('work');
    if (!a || !work || !filters.length) return;
    var m = a.getAttribute('href').match(/cat=(\w+)/);
    if (!m) return;
    e.preventDefault();
    filter(m[1]);
    work.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'start' });
    try { history.replaceState(null, '', '?cat=' + m[1] + '#work'); } catch (err) {}
  });

  // 위험지수: 지표 다섯 개의 가중합
  all('[data-risk]').forEach(function (box) {
    var inputs = all('input[type=range]', box);
    var score = box.querySelector('[data-score]');
    var fill = box.querySelector('[data-fill]');
    var presets = all('[data-v]', box);
    function calc() {
      var sum = 0;
      inputs.forEach(function (inp) {
        var v = parseFloat(inp.value);
        sum += v * parseFloat(inp.getAttribute('data-w'));
        var out = inp.parentNode.querySelector('output');
        if (out) out.textContent = v.toFixed(1);
      });
      score.textContent = sum.toFixed(2);
      fill.style.width = Math.max(0, Math.min(100, sum)) + '%';
    }
    inputs.forEach(function (inp) {
      inp.addEventListener('input', function () {
        presets.forEach(function (p) { p.classList.remove('is-on'); });
        calc();
      });
    });
    presets.forEach(function (p) {
      p.addEventListener('click', function () {
        var vals = p.getAttribute('data-v').split(',');
        inputs.forEach(function (inp, i) { inp.value = vals[i]; });
        presets.forEach(function (q) { q.classList.toggle('is-on', q === p); });
        calc();
      });
    });
    calc();
  });

  // 그림 크게 보기: 같은 묶음(띠·격자)의 그림을 앞뒤로 넘겨 본다. 화살표 단추, 키보드 좌우, 손가락 밀기, 바깥을 누르면 닫힘
  var lb = null, lbImgs = [], lbAt = 0, lbPop = false;
  var lbTouch = window.matchMedia && window.matchMedia('(hover:none)').matches;  // 휴대폰·태블릿: 손가락 동작은 아래 lbTouchInit이 맡는다
  var LB_FIG = '<figure class="lb__f"><img alt=""><figcaption class="lb__cap"><span class="lb__n"></span><span class="lb__alt"></span></figcaption></figure>';
  function arrow(dir) {
    return '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="' + (dir < 0 ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7') + '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }
  // AVIF 지원 여부(한 번만): 지원하면 아직 로드 안 된 그림도 picture의 AVIF 원본을 쓴다(무게 절반)
  var avifOK = null;
  (function () {
    var p = new Image();
    p.onload = function () { avifOK = p.width === 1; };
    p.onerror = function () { avifOK = false; };
    p.src = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgANogQEAwgMg8f8D///8WfhwB8+ErK42A=';
  })();
  function bestSrc(el) {
    if (el.currentSrc) return el.currentSrc;
    var pic = el.closest && el.closest('picture');
    var s = pic && pic.querySelector('source[type="image/avif"]');
    return (avifOK && s && s.getAttribute('srcset')) || el.src;
  }
  function lbShow(i) {
    if (!lbImgs.length) return;
    lbAt = (i + lbImgs.length) % lbImgs.length;
    var src = lbImgs[lbAt];
    var im = lb.querySelector('img');
    im.src = bestSrc(src);
    im.alt = src.alt || '';
    lb.querySelector('.lb__n').textContent = lbImgs.length > 1 ? (lbAt + 1) + ' / ' + lbImgs.length : '';
    lb.querySelector('.lb__alt').textContent = src.alt || '';
    lb.querySelector('.lb__prev').hidden = lb.querySelector('.lb__next').hidden = lbImgs.length < 2;
    [lbAt + 1, lbAt - 1].forEach(function (k) { var s = lbImgs[(k + lbImgs.length) % lbImgs.length]; if (s) { var p = new Image(); p.src = bestSrc(s); } });
    if (src.scrollIntoView) src.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    if (lbTouch) { zReset(); lbFill(); }
  }
  function lbGo(d) { if (lbTouch) lbSlide(d); else lbShow(lbAt + d); }
  function lbClose() {  // 열 때 넣은 기록이 있으면 그걸 되돌려 닫는다(popstate가 닫음), 없으면 바로 닫음
    if (history.state && history.state.lb) { try { history.back(); return; } catch (err) {} }
    lb.close();
  }
  // 휴대폰 크게 보기: 넘기면 그림이 손가락을 따라오고 옆 그림이 같이 들어온다(손을 떼면 미끄러져 자리 잡고, 짧게 밀면 제자리로).
  // 단추·그림 누르기로 넘길 때도 같은 움직임. 두 손가락으로 확대·끌기. 두 번 탭 확대는 두지 않는다(빠르게 누를 때 잘못 커지던 것)
  var zs = 1, zx = 0, zy = 0, lbMoved = false, lbFin = null, lbPend = null;
  var EASE = 'cubic-bezier(.22,.61,.36,1)';
  function lbFig() { return lb.firstElementChild; }
  function lbIm() { return lbFig().querySelector('img'); }
  function lbGh() { return lb.querySelectorAll('.lb__g'); }
  function lbOff() { return window.innerWidth + 16; }
  function setX(el, x, ms) {
    el.style.transition = ms ? 'transform ' + ms + 'ms ' + EASE : '';
    el.style.transform = x || ms ? 'translate3d(' + x + 'px,0,0)' : '';
  }
  function zApply(ms) {
    var im = lbIm();
    im.style.transition = ms ? 'transform ' + ms + 'ms ' + EASE : '';
    im.style.transform = zs === 1 ? '' : 'translate(' + zx + 'px,' + zy + 'px) scale(' + zs + ')';
  }
  function zReset(ms) { zs = 1; zx = zy = 0; zApply(ms); }
  function zBox() { var im = lbIm(), b = lb.getBoundingClientRect(); return [b.left + im.offsetLeft, b.top + im.offsetTop, im.offsetWidth, im.offsetHeight]; }
  function zClamp() {  // 화면보다 작으면 가운데, 크면 가장자리가 화면 안쪽으로 들어오지 않게
    var q = zBox(), w = q[2] * zs, h = q[3] * zs, VW = window.innerWidth, VH = window.innerHeight;
    zx = w <= VW ? q[2] * (1 - zs) / 2 : Math.min(-q[0], Math.max(VW - w - q[0], zx));
    zy = h <= VH ? q[3] * (1 - zs) / 2 : Math.min(-q[1], Math.max(VH - h - q[1], zy));
  }
  function lbFill() {  // 옆 그림 두 장(앞·뒤)을 미리 채워 둔다
    var n = lbImgs.length, gs = lbGh();
    [lbAt - 1, lbAt + 1].forEach(function (k, j) {
      var g = gs[j];
      if (!g || g._hold || n < 2) return;
      k = (k + n) % n;
      var s = lbImgs[k], im = g.querySelector('img'), u = bestSrc(s);
      if (im.getAttribute('src') !== u) im.src = u;
      g.querySelector('.lb__n').textContent = (k + 1) + ' / ' + n;
      g.querySelector('.lb__alt').textContent = s.alt || '';
    });
  }
  function lbSettle() { if (lbFin) lbFin(); if (lbPend) lbPend(); }  // 움직이는 중이면 바로 끝 자리로
  function lbHide() {
    var gs = lbGh();
    for (var i = 0; i < gs.length; i++) { gs[i].classList.remove('is-on'); setX(gs[i], 0); }
  }
  function lbBack() {  // 제자리로
    var fig = lbFig(), gs = lbGh(), off = lbOff(), ms = still ? 0 : 220;
    var tm = setTimeout(end, ms + 40);
    function end() { clearTimeout(tm); if (lbFin === end) lbFin = null; setX(fig, 0); lbHide(); }
    lbFin = end;
    if (!ms) return end();
    setX(fig, 0, ms);
    if (gs.length) { setX(gs[0], -off, ms); setX(gs[1], off, ms); }
  }
  function lbSlide(dir, dx) {
    lbSettle();
    var n = lbImgs.length;
    if (n < 2) return;
    dx = dx || 0;
    var fig = lbFig(), gs = lbGh(), g = gs[dir > 0 ? 1 : 0], o = gs[dir > 0 ? 0 : 1], off = lbOff(), k = (lbAt + dir + n) % n;
    var ms = still ? 0 : Math.max(150, Math.round(300 * (1 - Math.abs(dx) / off)));
    zReset();
    o.classList.remove('is-on'); setX(o, 0);
    setX(fig, dx); setX(g, dx + dir * off); g.classList.add('is-on');
    var tm = setTimeout(end, ms + 40);
    function end() {
      clearTimeout(tm);
      if (lbFin === end) lbFin = null;
      g._hold = true;  // 본 그림이 새 그림을 다 그릴 때까지 옆 그림이 그 자리를 덮고 있는다(깜빡임 방지)
      setX(g, 0); setX(fig, 0); fig.style.visibility = 'hidden';
      lbShow(k);
      var mine = function () { if (lbPend === mine) lbPend = null; fig.style.visibility = ''; g._hold = false; g.classList.remove('is-on'); lbFill(); };
      lbPend = mine;
      var im = lbIm(), p = im.decode && im.decode();
      if (p && p.then) p.then(function () { if (lbPend === mine) mine(); }, function () { if (lbPend === mine) mine(); });
      setTimeout(function () { if (lbPend === mine) mine(); }, 500);
    }
    lbFin = end;
    if (!ms) return end();
    void fig.offsetWidth;  // 출발 자리를 먼저 그리고 움직인다
    setX(fig, -dir * off, ms); setX(g, 0, ms);
  }
  function lbTouchInit() {
    var pts = {}, g = null;
    function ids() { return Object.keys(pts); }
    function two() { var k = ids(), a = pts[k[0]], b = pts[k[1]]; return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, Math.hypot(a[0] - b[0], a[1] - b[1]) || 1]; }
    function one(p, t) { g = { m: 'wait', x: p[0], y: p[1], zx: zx, zy: zy, h: [[p[0], t]] }; }
    function pinch() { var m = two(), q = zBox(); g = { m: 'pinch', d: m[2], s: zs, u: (m[0] - q[0] - zx) / zs, v: (m[1] - q[1] - zy) / zs, L: q[0], T: q[1] }; }
    lb.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' || (e.target.closest && e.target.closest('.lb__btn'))) return;
      if (!ids().length) { lbSettle(); lbMoved = false; }
      pts[e.pointerId] = [e.clientX, e.clientY];
      if (ids().length === 1) one(pts[e.pointerId], e.timeStamp);
      else if (ids().length === 2) {
        if (g && g.m === 'swipe') { setX(lbFig(), 0); lbHide(); }
        lbMoved = true; pinch();
      }
    });
    lb.addEventListener('pointermove', function (e) {
      if (!(e.pointerId in pts) || !g) return;
      pts[e.pointerId] = [e.clientX, e.clientY];
      if (g.m === 'pinch') {  // 두 손가락 사이 지점이 손가락을 따라가게 확대
        if (ids().length < 2) return;
        var m = two();
        zs = Math.min(4, Math.max(0.8, g.s * m[2] / g.d));
        zx = m[0] - g.L - zs * g.u; zy = m[1] - g.T - zs * g.v;
        zClamp(); zApply(); return;
      }
      var dx = e.clientX - g.x, dy = e.clientY - g.y;
      if (g.m === 'wait') {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        lbMoved = true;
        g.m = zs > 1 ? 'pan' : Math.abs(dx) >= Math.abs(dy) ? 'swipe' : 'none';
        if (g.m === 'swipe' && lbImgs.length > 1) { var gs = lbGh(); gs[0].classList.add('is-on'); gs[1].classList.add('is-on'); }
      }
      if (g.m === 'pan') { zx = g.zx + dx; zy = g.zy + dy; zClamp(); zApply(); }
      else if (g.m === 'swipe') {
        var off = lbOff(), x = lbImgs.length > 1 ? dx : dx * 0.3, gs2 = lbGh();
        setX(lbFig(), x);
        if (gs2.length) { setX(gs2[0], x - off); setX(gs2[1], x + off); }
        g.h.push([e.clientX, e.timeStamp]); if (g.h.length > 8) g.h.shift();
      }
    });
    function up(e) {
      if (!(e.pointerId in pts)) return;
      var last = pts[e.pointerId];
      delete pts[e.pointerId];
      var k = ids();
      if (g && g.m === 'pinch') {
        if (k.length === 1) { one(pts[k[0]], e.timeStamp); g.m = zs > 1 ? 'pan' : 'none'; }
      } else if (g && !k.length && g.m === 'swipe') {  // 화면 너비의 20% 넘게 밀었거나 빠르게 튕겼으면 넘기고, 아니면 제자리
        var dx = last[0] - g.x, h = g.h, a = h[0];
        for (var i = h.length - 1; i >= 0; i--) if (e.timeStamp - h[i][1] >= 60) { a = h[i]; break; }
        var v = (last[0] - a[0]) / Math.max(16, e.timeStamp - a[1]);
        if (e.type !== 'pointercancel' && lbImgs.length > 1 && (Math.abs(dx) > window.innerWidth * 0.2 || (Math.abs(v) > 0.35 && Math.abs(dx) > 20 && v * dx > 0))) lbSlide(dx < 0 ? 1 : -1, dx);
        else lbBack();
      }
      if (!k.length) { g = null; if (zs < 1.02 && zs !== 1) zReset(still ? 0 : 200); }
    }
    lb.addEventListener('pointerup', up);
    lb.addEventListener('pointercancel', up);
    // 브라우저 자체의 화면 확대·두 번 탭 확대가 끼어들지 않게(사파리 포함)
    lb.addEventListener('touchmove', function (e) { e.preventDefault(); }, { passive: false });
    lb.addEventListener('gesturestart', function (e) { e.preventDefault(); });
  }
  function openImage(target) {
    if (!lb) {
      lb = document.createElement('dialog');
      lb.className = 'lb';
      lb.innerHTML = LB_FIG
        + '<button type="button" class="lb__btn lb__prev" aria-label="Previous">' + arrow(-1) + '</button>'
        + '<button type="button" class="lb__btn lb__next" aria-label="Next">' + arrow(1) + '</button>'
        + '<button type="button" class="lb__btn lb__x" aria-label="Close">&times;</button>'
        + (lbTouch ? '<div class="lb__g" aria-hidden="true">' + LB_FIG + '</div><div class="lb__g" aria-hidden="true">' + LB_FIG + '</div>' : '');
      document.body.appendChild(lb);
      lb.querySelector('.lb__prev').addEventListener('click', function (e) { e.stopPropagation(); lbGo(-1); });
      lb.querySelector('.lb__next').addEventListener('click', function (e) { e.stopPropagation(); lbGo(1); });
      lb.querySelector('.lb__x').addEventListener('click', function (e) { e.stopPropagation(); lbClose(); });
      lb.querySelector('img').addEventListener('click', function (e) {
        e.stopPropagation();
        if (lbTouch && (zs > 1 || lbMoved)) return;  // 확대 중이거나 방금 끌었으면 누르기로 치지 않음
        if (lbImgs.length > 1) lbGo(1); else lbClose();
      });
      lb.addEventListener('click', function (e) { if (e.target === lb && !(lbTouch && lbMoved)) lbClose(); });
      // 열 때 브라우저 기록을 하나 넣어 두어, 휴대폰 뒤로가기(제스처)가 쪽을 떠나지 않고 크게 보기를 닫는다
      lb.addEventListener('close', function () {
        if (lbTouch) { lbSettle(); setX(lbFig(), 0); lbHide(); zReset(); }
        if (lbPop) { lbPop = false; return; }
        if (history.state && history.state.lb) { try { history.back(); } catch (err) {} }
      });
      window.addEventListener('popstate', function () { if (lb && lb.open) { lbPop = true; lb.close(); } });
      lb.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight') { e.preventDefault(); lbShow(lbAt + 1); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); lbShow(lbAt - 1); }
      });
      if (lbTouch) lbTouchInit();
      else {  // 터치 화면 노트북 등: 손을 뗄 때 40px 넘게 밀었으면 넘김
        var tx = null;
        lb.addEventListener('touchstart', function (e) { tx = e.touches[0].clientX; }, { passive: true });
        lb.addEventListener('touchend', function (e) {
          if (tx === null) return;
          var dx = e.changedTouches[0].clientX - tx; tx = null;
          if (Math.abs(dx) > 40) lbShow(lbAt + (dx < 0 ? 1 : -1));
        }, { passive: true });
      }
    }
    var group = target.closest('.strip, .pgrid, .covers, .wk__b, .wk__sec') || document;
    lbImgs = all('img.zoom', group);
    if (lbImgs.indexOf(target) < 0) lbImgs = [target];
    lbShow(lbImgs.indexOf(target));
    if (lb.showModal && !lb.open) {
      lb.showModal();
      if (!(history.state && history.state.lb)) { try { history.pushState({ lb: 1 }, ''); } catch (err) {} }
    }
  }
  try { if (history.state && history.state.lb) history.replaceState(null, ''); } catch (err) {}  // 크게 보기 중 새로 고침한 뒤 남은 기록 표시 지움
  if (window.HTMLDialogElement) {
    document.addEventListener('click', function (e) {
      var t = e.target;
      if (t && t.classList && t.classList.contains('zoom') && !t.closest('.is-drag')) openImage(t);
    });
  }

  // 옆으로 미는 띠: PC에서는 양 끝에 화살표 단추, 마우스로 끌어서도 넘긴다(끌면 그 뒤의 누르기는 무시)
  all('.strip').forEach(function (st) {
    var w = document.createElement('div');
    w.className = 'strip__w';
    st.parentNode.insertBefore(w, st);
    w.appendChild(st);
    var prev = document.createElement('button'), next = document.createElement('button');
    prev.type = next.type = 'button';
    prev.className = 'strip__btn strip__btn--prev'; next.className = 'strip__btn strip__btn--next';
    prev.setAttribute('aria-label', 'Scroll left'); next.setAttribute('aria-label', 'Scroll right');
    prev.innerHTML = arrow(-1); next.innerHTML = arrow(1);
    w.appendChild(prev); w.appendChild(next);
    function sync() {
      var can = st.scrollWidth > st.clientWidth + 4;
      prev.hidden = !can || st.scrollLeft <= 2;
      next.hidden = !can || st.scrollLeft + st.clientWidth >= st.scrollWidth - 2;
    }
    function go(dir) { st.scrollBy({ left: dir * Math.max(120, st.clientWidth - 48), behavior: still ? 'auto' : 'smooth' }); }
    prev.addEventListener('click', function () { go(-1); });
    next.addEventListener('click', function () { go(1); });
    st.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    if (window.ResizeObserver) new ResizeObserver(sync).observe(st);
    all('img', st).forEach(function (im) { if (!im.complete) im.addEventListener('load', sync); });
    sync();
    var x0 = 0, s0 = 0, dragging = false, moved = false;
    st.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      dragging = true; moved = false; x0 = e.clientX; s0 = st.scrollLeft;
    });
    st.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var dx = e.clientX - x0;
      if (!moved && Math.abs(dx) > 6) { moved = true; st.classList.add('is-drag'); try { st.setPointerCapture(e.pointerId); } catch (err) {} }
      if (moved) { st.scrollLeft = s0 - dx; e.preventDefault(); }
    });
    function end(e) {
      if (!dragging) return;
      dragging = false;
      if (moved) { setTimeout(function () { st.classList.remove('is-drag'); }, 0); try { st.releasePointerCapture(e.pointerId); } catch (err) {} }
    }
    st.addEventListener('pointerup', end);
    st.addEventListener('pointercancel', end);
    st.addEventListener('dragstart', function (e) { e.preventDefault(); });
  });

  // 영상: 화면에 들어오면 소리 없이 재생, 벗어나면 멈춤
  all('[data-clip]').forEach(function (box) {
    var v = box.querySelector('video');
    var play = box.querySelector('[data-play]');
    var sound = box.querySelector('[data-sound]');
    var wanted = !still;
    v.removeAttribute('controls');
    function sync() {
      if (play) label(play.firstChild, v.paused ? 'Play' : 'Pause', v.paused ? '재생' : '멈춤');
      if (sound) label(sound.firstChild, v.muted ? 'Sound on' : 'Sound off', v.muted ? '소리 켜기' : '소리 끄기');
    }
    function go() { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
    if (play) {
      play.hidden = false;
      play.addEventListener('click', function () { wanted = v.paused; if (v.paused) go(); else v.pause(); });
    }
    if (sound) {
      sound.hidden = false;
      sound.addEventListener('click', function () { v.muted = !v.muted; if (!v.muted && v.paused) { wanted = true; go(); } sync(); });
    }
    v.addEventListener('click', function () { wanted = v.paused; if (v.paused) go(); else v.pause(); });
    v.addEventListener('play', sync);
    v.addEventListener('pause', sync);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (en) {
          if (en.isIntersecting && wanted) go();
          else if (!en.isIntersecting) { v.pause(); v.muted = true; sync(); }
        });
      }, { threshold: 0.45 }).observe(v);
    }
    sync();
  });

  // 스크롤하면 나타남
  if ('IntersectionObserver' in window && !still) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    all('.sec__head,.tile,.more li,.cap,.versus,.about__lead,.cv__g,.contact__mail,.contact__d,.facts,.wk__hero,.wk__sec,.wk__nav').forEach(function (el) {
      el.classList.add('rv');
      io.observe(el);
    });
  }
})();

// 19판: 맨 위 메뉴가 읽고 있는 구간을 표시(첫 화면), 이력서 인쇄
(function () {
  var links = [], secs = [];
  var as = document.querySelectorAll('.bar__nav > a[href*="#"], .bar__nav > .bar__item > a[href*="#"]');
  for (var i = 0; i < as.length; i++) {
    var id = as[i].getAttribute('href').split('#')[1];
    var s = id && document.getElementById(id);
    if (s && document.body.classList.contains('is-home')) { links.push(as[i]); secs.push(s); }
  }
  if (links.length) {
    var spy = function () {
      var line = window.innerHeight * 0.4, cur = -1;
      for (var j = 0; j < secs.length; j++) if (secs[j].getBoundingClientRect().top <= line) cur = j;
      if (cur >= 0 && secs[cur].getBoundingClientRect().bottom <= line) cur = -1;  // 그 구간을 다 지나면 표시하지 않음
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) cur = secs.length - 1;  // 맨 아래면 마지막 구간
      for (var k = 0; k < links.length; k++) links[k].classList.toggle('is-on', k === cur);
    };
    var tick = null;
    window.addEventListener('scroll', function () { if (!tick) tick = window.requestAnimationFrame(function () { tick = null; spy(); }); }, { passive: true });
    window.addEventListener('resize', spy);
    spy();
  }
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (t && t.closest && t.closest('[data-print]')) window.print();
  });
})();

// v3: 경로 띠의 '←'는 사이트 안에서 들어왔으면 보던 자리로(브라우저 뒤로), 아니면 부모 쪽으로. 문서 쪽 종류 칩은 스크롤을 따라 켜짐
(function () {
  // 문서 종류 칩: 브라우저 기록을 남기지 않고 그 구간으로 스크롤만(뒤로가기가 칩 사이를 되감지 않게)
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest && e.target.closest('.crumb__kinds a[data-spy]');
    if (!a) return;
    var s = document.getElementById(a.getAttribute('data-spy'));
    if (!s) return;
    e.preventDefault();
    s.scrollIntoView({ block: 'start' });
    try { history.replaceState(history.state, '', a.getAttribute('href')); } catch (err) {}
  });
  var links = document.querySelectorAll('.crumb__kinds a[data-spy]');
  if (!links.length) return;
  var secs = [];
  for (var i = 0; i < links.length; i++) {
    var s = document.getElementById(links[i].getAttribute('data-spy'));
    if (s) secs.push([s, links[i]]);
  }
  var spy = function () {
    var line = window.innerHeight * 0.35, cur = null;
    for (var j = 0; j < secs.length; j++) if (secs[j][0].getBoundingClientRect().top <= line) cur = secs[j][1];
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) cur = secs[secs.length - 1][1];
    for (var k = 0; k < secs.length; k++) secs[k][1].classList.toggle('is-on', secs[k][1] === cur);
    if (cur) {  // 칩 띠 안에서만 보이게 밀기(창 스크롤은 건드리지 않음)
      var k = cur.parentNode, l = cur.offsetLeft, r = l + cur.offsetWidth;
      if (l < k.scrollLeft) k.scrollLeft = l; else if (r > k.scrollLeft + k.clientWidth) k.scrollLeft = r - k.clientWidth;
    }
  };
  var tick = null;
  window.addEventListener('scroll', function () { if (!tick) tick = window.requestAnimationFrame(function () { tick = null; spy(); }); }, { passive: true });
  window.addEventListener('resize', spy);
  spy();
})();

// 29판 (2) 타일 영상 미리보기: 마우스를 올리면 처음부터 무음 반복, 떼면 멈춤
(function () {
  var tiles = document.querySelectorAll('.tile');
  for (var i = 0; i < tiles.length; i++) (function (t) {
    var v = t.querySelector('.tile__v');
    if (!v) return;
    t.addEventListener('mouseenter', function () {
      try { v.currentTime = 0; var p = v.play(); if (p && p.catch) p.catch(function () {}); } catch (e) {}
      v.classList.add('is-on');
    });
    t.addEventListener('mouseleave', function () { v.classList.remove('is-on'); try { v.pause(); } catch (e) {} });
  })(tiles[i]);
})();
// (5) 읽기 진행선
(function () {
  var p = document.querySelector('.prog');
  if (!p) return;
  function tick() {
    var h = document.documentElement.scrollHeight - window.innerHeight;
    p.style.width = (h > 0 ? Math.min(100, Math.max(0, 100 * window.scrollY / h)) : 0) + '%';
  }
  window.addEventListener('scroll', tick, { passive: true });
  window.addEventListener('resize', tick);
  tick();
})();
// (10) 문서 검색: 제목·과제명(영·한 둘 다)으로 거르고 빈 종류는 숨김, 건수 표시
(function () {
  var q = document.querySelector('.dq__in');
  if (!q) return;
  var n = document.querySelector('.dq__n');
  var docs = Array.prototype.slice.call(document.querySelectorAll('.doc'));
  var secs = Array.prototype.slice.call(document.querySelectorAll('.wk__sec'));
  function text(el) {
    var out = [];
    el.querySelectorAll('[data-en]').forEach(function (x) { out.push(x.getAttribute('data-en'), x.getAttribute('data-ko')); });
    return out.join(' ').toLowerCase();
  }
  var idx = docs.map(function (d) { return text(d.querySelector('.doc__h') || d); });
  function lang() { return document.documentElement.getAttribute('data-lang') || 'en'; }
  function setPh() { q.placeholder = q.getAttribute('data-ph-' + lang()); }
  setPh();
  new MutationObserver(setPh).observe(document.documentElement, { attributes: true, attributeFilter: ['data-lang'] });
  function run() {
    var w = q.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    var shown = 0;
    docs.forEach(function (d, i) {
      var ok = w.every(function (x) { return idx[i].indexOf(x) >= 0; });
      d.classList.toggle('is-hide', !ok);
      if (ok) shown++;
    });
    secs.forEach(function (s) { s.classList.toggle('is-hide', !s.querySelector('.doc:not(.is-hide)')); });
    n.textContent = w.length ? (lang() === 'ko' ? shown + ' / ' + docs.length + '건' : shown + ' of ' + docs.length) : '';
  }
  q.addEventListener('input', run);
  q.addEventListener('search', run);
  document.documentElement.addEventListener('lang-change', run);
})();

// ===== 휴대폰 개선 시안 =====
(function () {
  var narrow = window.matchMedia && window.matchMedia('(max-width:600px)').matches;
  var touch = window.matchMedia && window.matchMedia('(hover:none)').matches;
  // A1 명함형 첫 화면: 사진 틀과 단추를 낱말 위로 옮긴다(600px 이하에서만, 한 번)
  var hero = document.querySelector('.hero');
  if (hero && narrow) {
    var grid = hero.querySelector('.hero__grid'), plate = hero.querySelector('.plate'), cta = hero.querySelector('.hero__foot .cta');
    if (grid && plate) {
      var card = document.createElement('div');
      card.className = 'mcard';
      grid.parentNode.insertBefore(card, grid);
      card.appendChild(plate);
      if (cta) card.appendChild(cta);
    }
  }
  // A1 낱말을 누르면 사진 전환(터치 기기: 마우스 올림 대신). 사진을 누르면 인물로
  if (hero && touch) {
    var plateEl = hero.querySelector('.plate');
    function showPane(key) {
      if (!plateEl) return;
      plateEl.setAttribute('data-show', key);
      var els = plateEl.querySelectorAll('[data-for]');
      for (var z = 0; z < els.length; z++) els[z].classList.toggle('is-on', els[z].getAttribute('data-for') === key);
      var rs = hero.querySelectorAll('.role');
      for (var y = 0; y < rs.length; y++) rs[y].classList.toggle('is-on', rs[y].getAttribute('data-key') === key);
    }
    hero.addEventListener('click', function (e) {
      var r = e.target.closest && e.target.closest('.role');
      if (r) { showPane(r.getAttribute('data-key')); return; }
      if (e.target.closest && e.target.closest('.plate__frame')) showPane('portrait');
    });
  }
  // A4 메뉴 시트: 메뉴의 소메뉴(프로젝트·문서 종류)를 그대로 가져와 전체 화면으로
  var bar = document.querySelector('.bar');
  var tools = document.querySelector('.bar__tools');
  var subs = document.querySelectorAll('.bar__item.has-sub');
  if (bar && tools && subs.length) {
    var ko = (document.documentElement.getAttribute('data-lang') || 'en') === 'ko';
    function t(en, k) { return '<span data-en="' + en + '" data-ko="' + k + '">' + (ko ? k : en) + '</span>'; }
    var btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'bar__menu'; btn.setAttribute('aria-label', 'Menu'); btn.innerHTML = '<i></i>';
    tools.appendChild(btn);
    var msheet = document.createElement('div');
    msheet.className = 'msheet'; msheet.setAttribute('role', 'dialog'); msheet.setAttribute('aria-modal', 'true');
    var html = '<div class="msheet__top"><b>' + t('Menu', '메뉴') + '</b><button type="button" class="msheet__x" aria-label="Close">&times;</button></div>';
    for (var i = 0; i < subs.length; i++) {
      var top = subs[i].querySelector('a');
      var links = subs[i].querySelectorAll('.sub__a');
      var two = links.length > 8;
      html += '<p class="msheet__l">' + top.innerHTML.replace(/<[^>]+>/g, '') + '</p><div class="msheet__g' + (two ? '' : ' msheet__g--2') + '">';
      for (var k = 0; k < links.length; k++) {
        var a = links[k];
        html += '<a class="msheet__a' + (a.classList.contains('is-here') ? ' is-here' : '') + '" href="' + a.getAttribute('href') + '">' + a.innerHTML + '<i>›</i></a>';
      }
      html += '</div>';
    }
    var others = document.querySelectorAll('.bar__nav > .bar__item:not(.has-sub) > a, .bar__nav > a');
    html += '<p class="msheet__l">' + t('More', '그 밖에') + '</p><div class="msheet__g">';
    for (var m = 0; m < others.length; m++) html += '<a class="msheet__a" href="' + others[m].getAttribute('href') + '">' + others[m].innerHTML + '<i>›</i></a>';
    var mail = document.querySelector('.bar__tools a[href^="mailto:"]');
    if (mail) html += '<a class="msheet__a" href="' + mail.getAttribute('href') + '" data-card>' + mail.innerHTML + '<i>›</i></a>';
    html += '</div>';
    msheet.innerHTML = html;
    document.body.appendChild(msheet);
    function open() { msheet.classList.add('is-open'); document.body.classList.add('msheet-open'); }
    function close() { msheet.classList.remove('is-open'); document.body.classList.remove('msheet-open'); }
    btn.addEventListener('click', open);
    msheet.querySelector('.msheet__x').addEventListener('click', close);
    msheet.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('a')) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  }
  // B6 휴대폰: 타일 영상은 화면에 60% 이상 들어오면 재생, 벗어나면 멈춤
  if (touch && window.IntersectionObserver) {
    var vids = document.querySelectorAll('.tile__v');
    if (vids.length) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (en) {
          var v = en.target;
          if (en.isIntersecting && en.intersectionRatio >= 0.6) { try { var p = v.play(); if (p && p.catch) p.catch(function () {}); } catch (e) {} v.classList.add('is-on'); }
          else { v.classList.remove('is-on'); try { v.pause(); } catch (e) {} }
        });
      }, { threshold: [0, 0.6, 1] });
      for (var q = 0; q < vids.length; q++) io.observe(vids[q]);
    }
  }
})();

// 35판: 앱 상세 창(AI와 일하기 쪽). 칸을 누르면 열고, X·닫기 단추·바깥 누르기·Esc·뒤로 가기로 닫는다.
// 열 때 기록을 하나 넣어(주소 #app-이름) 휴대폰 뒤로 가기가 쪽을 떠나지 않고 창을 닫는다. 창 안 사진을 크게 볼 때는 크게 보기가 위에 뜨고, 뒤로 가기는 그것부터 닫는다
(function () {
  if (!window.HTMLDialogElement) return;
  var dlgs = [].slice.call(document.querySelectorAll('dialog.apd'));
  if (!dlgs.length) return;
  var cur = null, popClose = false;
  // mode: 없음 = 기록 넣고 열기, 'hash' = 주소로 바로 열림(기록 없음), 'back' = 앞으로 가기로 돌아옴(기록은 이미 있음)
  function open(d, mode) {
    if (cur && cur.open && cur !== d) cur.close();
    cur = d;
    d._noPush = (mode === 'hash');
    if (!d.open) d.showModal();
    document.documentElement.classList.add('apd-open');
    var body = d.querySelector('.apd__body'); if (body) body.scrollTop = 0;
    if (!mode) { try { history.pushState({ apd: d.id }, '', '#' + d.id); } catch (e) {} }
  }
  function close() {
    if (!cur) return;
    if (cur._noPush) {  // 주소로 바로 열린 창: 기록을 되돌리면 쪽을 떠나므로 주소만 지우고 닫음
      cur._noPush = false;
      try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
      cur.close(); return;
    }
    if (history.state && history.state.apd === cur.id) { try { history.back(); return; } catch (e) {} }
    cur.close();
  }
  dlgs.forEach(function (d) {
    d.addEventListener('click', function (e) {
      if (e.target === d) { close(); return; }  // 창 바깥(어두운 곳)
      if (e.target.closest('.apd__x, .apd__close')) { e.preventDefault(); close(); }
    });
    d.addEventListener('cancel', function (e) { e.preventDefault(); close(); });  // Esc
    d.addEventListener('close', function () {
      document.documentElement.classList.remove('apd-open');
      if (popClose) { popClose = false; return; }
      if (history.state && history.state.apd === d.id) { try { history.back(); } catch (e) {} }
    });
  });
  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('[data-apd]');
    if (!t) return;
    var d = document.getElementById(t.getAttribute('data-apd'));
    if (!d) return;
    e.preventDefault();
    open(d);
  });
  window.addEventListener('popstate', function () {
    if (!(cur && cur.open)) {  // 앞으로 가기로 창 기록에 돌아온 경우
      var st = history.state, d = st && st.apd && document.getElementById(st.apd);
      if (d && d.classList.contains('apd')) open(d, 'back');
      return;
    }
    if (history.state && history.state.apd === cur.id) return;  // 크게 보기를 닫고 창 기록으로 돌아온 것
    popClose = true; cur.close();
  });
  var h = location.hash.slice(1), hd = h && document.getElementById(h);
  if (hd && hd.classList.contains('apd')) open(hd, 'hash');
})();
