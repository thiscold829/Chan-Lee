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

  // 그림 크게 보기
  var lb = null;
  function openImage(src, alt) {
    if (!lb) {
      lb = document.createElement('dialog');
      lb.className = 'lb';
      lb.appendChild(document.createElement('img'));
      lb.addEventListener('click', function () { lb.close(); });
      document.body.appendChild(lb);
    }
    var im = lb.firstChild;
    im.src = src;
    im.alt = alt || '';
    if (lb.showModal) lb.showModal();
  }
  if (window.HTMLDialogElement) {
    document.addEventListener('click', function (e) {
      var t = e.target;
      if (t && t.classList && t.classList.contains('zoom')) openImage(t.currentSrc || t.src, t.alt);
    });
  }

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
  var as = document.querySelectorAll('.bar__nav a[href*="#"]');
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
