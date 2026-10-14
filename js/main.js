(function () {
  var root = document.documentElement;
  root.classList.add('js');

  // 언어 전환(모든 쪽에서 같은 선택을 기억한다)
  function store(key, val) {
    try {
      if (val === undefined) return window.localStorage.getItem(key);
      window.localStorage.setItem(key, val);
    } catch (e) { /* 저장을 못 써도 화면은 그대로 동작 */ }
    return null;
  }
  function setLang(lang) {
    root.setAttribute('data-lang', lang);
    root.setAttribute('lang', lang);
    var nodes = document.querySelectorAll('[data-' + lang + ']');
    for (var i = 0; i < nodes.length; i++) nodes[i].textContent = nodes[i].getAttribute('data-' + lang);
    var btns = document.querySelectorAll('[data-set-lang]');
    for (var j = 0; j < btns.length; j++) btns[j].setAttribute('aria-pressed', String(btns[j].getAttribute('data-set-lang') === lang));
    var title = root.getAttribute('data-title-' + lang);
    if (title) document.title = title;
  }
  var saved = store('lang');
  if (saved === 'ko') setLang('ko');
  root.classList.add('lang-ready');  // 한글로 바꾼 뒤에 보이게(영문이 먼저 비치지 않도록)
  document.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('[data-set-lang]') : null;
    if (!b) return;
    var lang = b.getAttribute('data-set-lang');
    setLang(lang);
    store('lang', lang);
  });

  // 첫 화면: 낱말에 올리면 오른쪽 그림이 그 증거로 바뀜
  var plate = document.querySelector('.plate');
  function show(key) {
    if (!plate) return;
    var els = plate.querySelectorAll('[data-for]');
    for (var i = 0; i < els.length; i++) els[i].classList.toggle('is-on', els[i].getAttribute('data-for') === key);
  }
  var roles = document.querySelectorAll('.role');
  var canHover = window.matchMedia && window.matchMedia('(hover:hover)').matches;
  for (var r = 0; r < roles.length; r++) {
    (function (el) {
      var key = el.getAttribute('data-key');
      if (canHover) el.addEventListener('mouseenter', function () { show(key); });
      el.addEventListener('focus', function () { show(key); });
      el.addEventListener('blur', function () { show('portrait'); });
    })(roles[r]);
  }
  var list = document.querySelector('.roles');
  if (list && canHover) list.addEventListener('mouseleave', function () { show('portrait'); });

  // 들어올 때 한 번
  function enter() {
    root.classList.add('is-in');
    window.setTimeout(function () { root.classList.add('is-done'); }, 1800);
  }
  var started = false;
  function start() { if (!started) { started = true; window.requestAnimationFrame(enter); } }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(start);
  window.setTimeout(start, 900);
})();

// 연락 카드: 메일 주소를 누르면 명함이 뜨고, 복사·바로가기 단추
(function () {
  var root = document.documentElement;
  var card = document.getElementById('card');
  if (!card) return;
  var lastFocus = null;
  function openCard() {
    lastFocus = document.activeElement;
    card.hidden = false;
    root.classList.add('is-card');
    var x = card.querySelector('.card__x');
    if (x) x.focus();
  }
  function closeCard() {
    if (card.hidden) return;
    card.hidden = true;
    root.classList.remove('is-card');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.left = '-1000px';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (err) { /* 복사가 막힌 환경 */ }
    document.body.removeChild(ta);
  }
  function copied(btn) {
    var lang = root.getAttribute('data-lang') || 'en';
    btn.textContent = btn.getAttribute('data-done-' + lang);
    btn.classList.add('is-done');
    window.setTimeout(function () {
      btn.textContent = btn.getAttribute('data-' + (root.getAttribute('data-lang') || 'en'));
      btn.classList.remove('is-done');
    }, 1600);
  }
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    if (t.closest('[data-card]')) { e.preventDefault(); openCard(); return; }
    if (t.closest('[data-card-close]')) { closeCard(); return; }
    var cp = t.closest('[data-copy]');
    if (!cp) return;
    var text = cp.getAttribute('data-copy');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { copied(cp); }, function () { fallbackCopy(text); copied(cp); });
    } else { fallbackCopy(text); copied(cp); }
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeCard(); });
})();

// 기울어지는 카드: 포인터를 따라 무게감 있게 기울고(관성), 빛을 받는 쪽이 밝아지며 하이라이트가 지나간다
(function () {
  var mq = window.matchMedia;
  if (!mq || !mq('(hover:hover) and (pointer:fine)').matches || mq('(prefers-reduced-motion:reduce)').matches) return;
  var els = document.querySelectorAll('[data-tilt]');
  for (var i = 0; i < els.length; i++) {
    (function (el) {
      var max = parseFloat(el.getAttribute('data-tilt')) || 6;
      var lift = parseFloat(el.getAttribute('data-lift') || '1.02');
      var glare = document.createElement('span');
      glare.className = 'tilt__glare';
      el.appendChild(glare);
      el.classList.add('tilt');
      var cur = { x: 0, y: 0, g: 0.5, h: 0.5, l: 0 }, tgt = { x: 0, y: 0, g: 0.5, h: 0.5, l: 0 };
      var over = false, raf = null;
      function step() {
        raf = null;
        var done = true, key, d;
        for (key in tgt) {
          d = tgt[key] - cur[key];
          if (Math.abs(d) > 0.0015) done = false;
          cur[key] += d * 0.13;
        }
        var rx = cur.x * max, ry = cur.y * max, s = 1 + (lift - 1) * cur.l;
        el.style.transform = 'perspective(1100px) rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg) scale3d(' + s.toFixed(4) + ',' + s.toFixed(4) + ',1)';
        el.style.setProperty('--rx', rx.toFixed(2) + 'deg');
        el.style.setProperty('--ry', ry.toFixed(2) + 'deg');
        el.style.setProperty('--gx', (cur.g * 100).toFixed(1) + '%');
        el.style.setProperty('--gy', (cur.h * 100).toFixed(1) + '%');
        el.style.setProperty('--sx', (-ry * 1.8).toFixed(1) + 'px');
        el.style.setProperty('--sy', (34 + rx * 1.8 + cur.l * 12).toFixed(1) + 'px');
        el.style.setProperty('--sb', (70 + cur.l * 24).toFixed(1) + 'px');
        if (!done) raf = window.requestAnimationFrame(step);
        else if (!over) { el.style.transform = ''; el.classList.remove('is-tilt'); }
      }
      function kick() { if (!raf) raf = window.requestAnimationFrame(step); }
      el.addEventListener('pointerenter', function () { over = true; tgt.l = 1; el.classList.add('is-tilt'); kick(); });
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        if (!r.width || !r.height) return;
        var px = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
        var py = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
        tgt.x = (0.5 - py) * 2; tgt.y = (px - 0.5) * 2; tgt.g = px; tgt.h = py;
        kick();
      });
      el.addEventListener('pointerleave', function () { over = false; tgt.x = 0; tgt.y = 0; tgt.l = 0; tgt.g = 0.5; tgt.h = 0.5; kick(); });
    })(els[i]);
  }
})();
