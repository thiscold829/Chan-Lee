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
  function arrow(dir) {
    return '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="' + (dir < 0 ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7') + '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }
  function lbShow(i) {
    if (!lbImgs.length) return;
    lbAt = (i + lbImgs.length) % lbImgs.length;
    var src = lbImgs[lbAt];
    var im = lb.querySelector('img');
    im.src = src.currentSrc || src.src;
    im.alt = src.alt || '';
    lb.querySelector('.lb__n').textContent = lbImgs.length > 1 ? (lbAt + 1) + ' / ' + lbImgs.length : '';
    lb.querySelector('.lb__alt').textContent = src.alt || '';
    lb.querySelector('.lb__prev').hidden = lb.querySelector('.lb__next').hidden = lbImgs.length < 2;
    [lbAt + 1, lbAt - 1].forEach(function (k) { var s = lbImgs[(k + lbImgs.length) % lbImgs.length]; if (s) { var p = new Image(); p.src = s.currentSrc || s.src; } });
    if (src.scrollIntoView) src.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
  function lbClose() {  // 열 때 넣은 기록이 있으면 그걸 되돌려 닫는다(popstate가 닫음), 없으면 바로 닫음
    if (history.state && history.state.lb) { try { history.back(); return; } catch (err) {} }
    lb.close();
  }
  function openImage(target) {
    if (!lb) {
      lb = document.createElement('dialog');
      lb.className = 'lb';
      lb.innerHTML = '<figure class="lb__f"><img alt=""><figcaption class="lb__cap"><span class="lb__n"></span><span class="lb__alt"></span></figcaption></figure>'
        + '<button type="button" class="lb__btn lb__prev" aria-label="Previous">' + arrow(-1) + '</button>'
        + '<button type="button" class="lb__btn lb__next" aria-label="Next">' + arrow(1) + '</button>'
        + '<button type="button" class="lb__btn lb__x" aria-label="Close">&times;</button>';
      document.body.appendChild(lb);
      lb.querySelector('.lb__prev').addEventListener('click', function (e) { e.stopPropagation(); lbShow(lbAt - 1); });
      lb.querySelector('.lb__next').addEventListener('click', function (e) { e.stopPropagation(); lbShow(lbAt + 1); });
      lb.querySelector('.lb__x').addEventListener('click', function (e) { e.stopPropagation(); lbClose(); });
      lb.querySelector('img').addEventListener('click', function (e) { e.stopPropagation(); if (lbImgs.length > 1) lbShow(lbAt + 1); else lbClose(); });
      lb.addEventListener('click', function (e) { if (e.target === lb) lbClose(); });
      // 열 때 브라우저 기록을 하나 넣어 두어, 휴대폰 뒤로가기(제스처)가 쪽을 떠나지 않고 크게 보기를 닫는다
      lb.addEventListener('close', function () {
        if (lbPop) { lbPop = false; return; }
        if (history.state && history.state.lb) { try { history.back(); } catch (err) {} }
      });
      window.addEventListener('popstate', function () { if (lb && lb.open) { lbPop = true; lb.close(); } });
      lb.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight') { e.preventDefault(); lbShow(lbAt + 1); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); lbShow(lbAt - 1); }
      });
      var tx = null;
      lb.addEventListener('touchstart', function (e) { tx = e.touches[0].clientX; }, { passive: true });
      lb.addEventListener('touchend', function (e) {
        if (tx === null) return;
        var dx = e.changedTouches[0].clientX - tx; tx = null;
        if (Math.abs(dx) > 40) lbShow(lbAt + (dx < 0 ? 1 : -1));
      }, { passive: true });
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
