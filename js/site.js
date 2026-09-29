const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Старт: светофор ---------- */
(function () {
  const box = document.getElementById('lights');
  if (!box) { document.body.classList.add('ready'); return; }
  const bulbs = [...box.querySelectorAll('i')];
  if (reduce) { box.remove(); document.body.classList.add('ready'); return; }
  bulbs.forEach((b, i) => setTimeout(() => b.classList.add('on'), 130 + i * 130));
  setTimeout(() => bulbs.forEach(b => b.classList.remove('on')), 130 + bulbs.length * 130 + 260);
  setTimeout(() => {
    box.classList.add('off');
    document.body.classList.add('ready');
  }, 130 + bulbs.length * 130 + 420);
})();

/* ---------- Шапка ---------- */
(function () {
  const hdr = document.getElementById('hdr');
  if (!hdr) return;
  addEventListener('scroll', () => hdr.classList.toggle('stuck', scrollY > 40), { passive: true });
})();

/* ---------- Тахометр: общий для всех страниц ---------- */
(function () {
  if (reduce) return;

  // на внутренних страницах прибора в разметке нет — создаём его сами
  let box = document.querySelector('.rpm');
  if (!box) {
    box = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    box.setAttribute('class', 'rpm');
    box.setAttribute('viewBox', '0 0 100 100');
    box.setAttribute('aria-label', 'Тахометр');
    box.innerHTML =
      '<circle class="rpm-bg" cx="50" cy="50" r="49"/>' +
      '<path class="rpm-arc" d="M18 78 A 42 42 0 1 1 82 78"/>' +
      '<path class="rpm-fill" id="rpmfill" d="M18 78 A 42 42 0 1 1 82 78" stroke-dasharray="0 400"/>' +
      '<g id="ticks"></g>' +
      '<line class="rpm-needle" id="needle" x1="50" y1="50" x2="50" y2="18"/>' +
      '<circle cx="50" cy="50" r="3.5" fill="var(--white)"/>' +
      '<text class="rpm-val" x="50" y="90" id="rpmval">900</text>' +
      '<text class="rpm-lbl" x="50" y="97">RPM</text>' +
      '<text class="rpm-hint" x="50" y="66">НАВЕРХ</text>';
    (document.querySelector('main') || document.body).append(box);
  }

  const needle = box.querySelector('#needle');
  const rpmval = box.querySelector('#rpmval');
  const fill = box.querySelector('#rpmfill');
  const ticksBox = box.querySelector('#ticks');

  for (let i = 0; i <= 8; i++) {
    const a = (-225 + i * (270 / 8)) * Math.PI / 180;
    const l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    l.setAttribute('x1', (50 + Math.cos(a) * 38).toFixed(1));
    l.setAttribute('y1', (50 + Math.sin(a) * 38).toFixed(1));
    l.setAttribute('x2', (50 + Math.cos(a) * 33).toFixed(1));
    l.setAttribute('y2', (50 + Math.sin(a) * 33).toFixed(1));
    l.setAttribute('class', 'rpm-tick');
    if (i >= 7) l.setAttribute('stroke', 'var(--red)');
    ticksBox.append(l);
  }

  const ARC = fill.getTotalLength();
  const IDLE = 900 / 8200;                 // холостой ход
  let rpm = IDLE, target = IDLE, lastY = scrollY;

  // трасса есть только на главной — она живёт от тех же оборотов
  const track = document.getElementById('track');
  const live = document.getElementById('live');
  const car = document.getElementById('car');
  const spd = document.getElementById('spd');
  const gear = document.getElementById('gear');
  const lap = document.getElementById('lap');
  const LEN = track ? track.getTotalLength() : 0;
  let pos = 0, lapT = 98.42;
  if (track) live.style.strokeDasharray = '58 ' + LEN;

  let running = false, idleTimer = 0, sceneVisible = !!track;

  const start = () => { if (!running && !document.hidden) { running = true; requestAnimationFrame(frame); } };

  addEventListener('scroll', () => {
    const d = Math.abs(scrollY - lastY); lastY = scrollY;
    target = Math.min(1, IDLE + d / 42);
    start();
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => { target = IDLE; }, 900);
  }, { passive: true });

  document.addEventListener('visibilitychange', () => { if (!document.hidden) start(); });

  // машина едет только когда трасса на экране
  if (track) {
    const scene = track.closest('.scene');
    if (scene && 'IntersectionObserver' in window) {
      new IntersectionObserver(es => {
        sceneVisible = es[0].isIntersecting;
        if (sceneVisible) start();
      }, { threshold: 0 }).observe(scene);
    }
  }

  // прибор живёт прямо в body: внутри первого экрана его перекрывали все блоки ниже,
  // потому что у первого экрана свой слой (isolation) и z-index 70 работал только внутри него
  document.body.append(box);
  box.classList.add('docked');            // прибор виден сразу, на всех страницах
  box.addEventListener('click', () => scrollTo({ top: 0, behavior: 'smooth' }));

  function frame() {
    rpm += (target - rpm) * 0.09;

    needle.setAttribute('transform', 'rotate(' + (-135 + rpm * 270) + ' 50 50)');
    const doc = document.documentElement;
    const progress = Math.min(1, scrollY / Math.max(1, doc.scrollHeight - innerHeight));
    fill.setAttribute('stroke-dasharray', (ARC * progress).toFixed(1) + ' ' + ARC);
    rpmval.textContent = String(Math.round(rpm * 8200 / 10) * 10);

    if (track && sceneVisible) {
      pos = (pos + 0.6 + rpm * 5.2) % LEN;
      const pt = track.getPointAtLength(pos);
      car.setAttribute('cx', pt.x); car.setAttribute('cy', pt.y);
      live.style.strokeDashoffset = LEN - pos;
      spd.textContent = Math.round(60 + rpm * 260);
      gear.textContent = Math.max(1, Math.ceil(rpm * 6));
      if (pos < 6) lapT = 92 + Math.random() * 12;
      lap.textContent = Math.floor(lapT / 60) + ':' + (lapT % 60).toFixed(2).padStart(5, '0');
    }
    // в покое кадры не тратим: стрелка замерла, трасса вне экрана
    const restless = Math.abs(rpm - target) > 0.0015 || (track && sceneVisible);
    if (restless && !document.hidden) requestAnimationFrame(frame);
    else running = false;
  }
  start();
})();

/* ---------- Появление карточек ---------- */
(function () {
  const cards = document.querySelectorAll('.card');
  if (!cards.length) return;
  const io = new IntersectionObserver(
    es => es.forEach(e => { if (e.isIntersecting) e.target.classList.add('in'); }),
    { threshold: .2 }
  );
  cards.forEach(c => io.observe(c));
})();

/* ---------- Схема поста: связь списка и чертежа ---------- */
(function () {
  const parts = document.querySelectorAll('.bp-part');
  const items = document.querySelectorAll('.rig-list li');
  if (!parts.length || !items.length) return;
  const light = key => parts.forEach(p => p.classList.toggle('hot', !!key && p.dataset.part === key));
  items.forEach(li => {
    li.addEventListener('mouseenter', () => light(li.dataset.part));
    li.addEventListener('mouseleave', () => light(null));
    li.addEventListener('focusin', () => light(li.dataset.part));
  });
})();

/* ---------- Прогресс сценария заезда ---------- */
(function () {
  const list = document.querySelector('.steps');
  if (!list) return;
  const items = [...list.querySelectorAll('li')];
  function tick() {
    const r = list.getBoundingClientRect();
    const seen = Math.min(1, Math.max(0, (innerHeight * .72 - r.top) / r.height));
    list.style.setProperty('--flow', seen.toFixed(3));
    items.forEach(li => li.classList.toggle('done', li.getBoundingClientRect().top < innerHeight * .72));
  }
  let queued = false;
  const onScroll = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { tick(); queued = false; });
  };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  tick();
})();

/* ---------- Заявка на бронь ---------- */
(function () {
  /* Точка интеграции: если у клуба появится Langame / SmartShell / YCLIENTS,
     меняется только этот объект — разметка и валидация остаются как есть. */
  const BOOKING = {
    mode: 'whatsapp',            // whatsapp | telegram | endpoint
    whatsapp: '79377074555',
    telegram: 'Top_Skill_Club',
    endpoint: '',                // сюда встанет URL системы бронирования
  };

  const form = document.getElementById('bookForm');
  if (!form) return;
  const note = document.getElementById('formNote');
  const digits = s => (s || '').replace(/\D/g, '');

  form.querySelector('[name=phone]').addEventListener('input', e => {
    let d = digits(e.target.value).slice(0, 11);
    if (d && d[0] === '8') d = '7' + d.slice(1);
    if (d && d[0] !== '7') d = '7' + d;
    const p = ['+7'];
    if (d.length > 1) p.push(' ' + d.slice(1, 4));
    if (d.length > 4) p.push(' ' + d.slice(4, 7));
    if (d.length > 7) p.push('-' + d.slice(7, 9));
    if (d.length > 9) p.push('-' + d.slice(9, 11));
    e.target.value = p.join('');
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(form).entries());
    const bad = [];
    if (!f.name || f.name.trim().length < 2) bad.push('name');
    if (digits(f.phone).length !== 11) bad.push('phone');
    if (!f.agree) bad.push('agree');

    form.querySelectorAll('.bad').forEach(i => i.classList.remove('bad'));
    bad.forEach(n => { const el = form.querySelector('[name=' + n + ']'); if (el) el.classList.add('bad'); });

    if (bad.length) {
      note.classList.add('err');
      note.textContent = bad.includes('agree')
        ? 'Отметьте согласие на обработку данных'
        : 'Проверьте имя и телефон';
      return;
    }
    note.classList.remove('err');

    const text = [
      'Заявка с сайта Skill Gaming',
      'Зона: ' + f.zone,
      'Имя: ' + f.name,
      'Телефон: ' + f.phone,
      f.date ? 'Дата: ' + f.date.split('-').reverse().join('.') : null,
      f.time ? 'Время: ' + f.time : null,
      'Гостей: ' + (f.guests || 1) + ', часов: ' + (f.hours || 1),
      f.note ? 'Комментарий: ' + f.note : null,
    ].filter(Boolean).join('\n');

    const url = BOOKING.mode === 'telegram'
      ? 'https://t.me/' + BOOKING.telegram
      : 'https://wa.me/' + BOOKING.whatsapp + '?text=' + encodeURIComponent(text);

    window.open(url, '_blank', 'noopener');
    note.textContent = 'Заявка собрана — отправьте её в открывшемся чате';
  });
})();

/* ---------- Мобильное меню ---------- */
(function () {
  const btn = document.getElementById('burger');
  const nav = document.querySelector('nav');
  if (!btn || !nav) return;
  const toggle = open => {
    nav.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    document.body.style.overflow = open ? 'hidden' : '';
  };
  btn.addEventListener('click', () => toggle(!nav.classList.contains('open')));
  nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => toggle(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape') toggle(false); });
})();

/* ---------- Курсор ---------- */
(function () {
  const c = document.getElementById('cursor');
  if (!c) return;
  if (reduce || matchMedia('(pointer: coarse)').matches) { c.remove(); return; }

  // системный курсор прячем только если наш смайл действительно загрузился
  const probe = new Image();
  probe.onload = () => document.documentElement.classList.add('has-cursor');
  probe.onerror = () => c.remove();
  probe.src = 'img/mark.svg';
  addEventListener('mouseleave', () => { c.style.opacity = '0'; });
  addEventListener('mouseenter', () => { c.style.opacity = '1'; });
  let x = innerWidth / 2, y = innerHeight / 2, tx = x, ty = y, k = 1, tk = 1;
  addEventListener('mousemove', e => { tx = e.clientX; ty = e.clientY; }, { passive: true });
  (function loop() {
    x += (tx - x) * .18; y += (ty - y) * .18;
    tk = c.classList.contains('big') ? 1.9 : 1;
    k += (tk - k) * .16;
    c.style.transform = 'translate(' + x + 'px,' + y + 'px) translate(-50%,-50%) scale(' + k.toFixed(3) + ')';
    requestAnimationFrame(loop);
  })();
  document.querySelectorAll('a,button,.card').forEach(el => {
    el.addEventListener('mouseenter', () => c.classList.add('big'));
    el.addEventListener('mouseleave', () => c.classList.remove('big'));
  });
})();

/* ---------- Табло прайса: счётчик цифр и перекрестье ---------- */
(function () {
  const table = document.querySelector('.rates table');
  if (!table) return;
  const body = table.tBodies[0];
  const rows = [...body.rows];

  // размечаем ячейки: числовые и прочерки
  rows.forEach(r => [...r.cells].forEach((td, i) => {
    if (i === 0) return;
    const n = parseInt(td.textContent.replace(/\s/g, ''), 10);
    if (Number.isFinite(n)) { td.classList.add('num'); td.dataset.val = n; }
    else td.classList.add('dash');
  }));

  // перекрестье: подсвечиваем колонку под курсором
  const head = table.tHead ? [...table.tHead.rows[0].cells] : [];
  const light = idx => {
    rows.forEach(r => [...r.cells].forEach((td, i) => td.classList.toggle('hot-col', i === idx && i > 0)));
    head.forEach((th, i) => th.classList.toggle('hot-col', i === idx && i > 0));
  };
  table.addEventListener('mouseover', e => {
    const td = e.target.closest('td,th');
    light(td ? td.cellIndex : -1);
  });
  table.addEventListener('mouseleave', () => light(-1));

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    rows.forEach(r => r.classList.add('in'));
    return;
  }

  // цифры набегают, как на секундомере
  const run = td => {
    const target = +td.dataset.val;
    const t0 = performance.now(), dur = 620 + Math.random() * 260;
    const step = now => {
      const k = Math.min(1, (now - t0) / dur);
      const eased = 1 - Math.pow(1 - k, 3);
      td.textContent = Math.round(target * eased) + ' ₽';
      if (k < 1) requestAnimationFrame(step);
    };
    td.textContent = '0 ₽';
    requestAnimationFrame(step);
  };

  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    const r = e.target, delay = rows.indexOf(r) * 70;
    setTimeout(() => {
      r.classList.add('in');
      [...r.cells].forEach(td => { if (td.classList.contains('num')) run(td); });
    }, delay);
    io.unobserve(r);
  }), { threshold: .35 });
  rows.forEach(r => io.observe(r));
})();

/* ---------- Прайс-аккордеон: тап на тач-экранах ---------- */
(function () {
  document.querySelectorAll('.pz').forEach(group => {
    const rows = [...group.querySelectorAll('.pz-row')];
    rows.forEach(row => {
      row.querySelector('.pz-head').addEventListener('click', () => {
        const open = !row.classList.contains('open');
        rows.forEach(r => {
          const on = r === row && open;
          r.classList.toggle('open', on);
          r.querySelector('.pz-head').setAttribute('aria-expanded', on ? 'true' : 'false');
        });
      });
    });
  });
})();

/* ---------- Карусель зон: свайп, стрелки, точки ---------- */
(function () {
  const box = document.querySelector('.cards');
  const track = box && box.querySelector('.cards-track');
  if (!box || !track) return;
  const zone = box.closest('.cards-wrap') || box;   // стрелки лежат поверх карусели —
                                                    // слушаем жест на всей обёртке

  const cards = [...track.children];
  const dots = document.querySelector('.cards-dots');
  const arrows = [...document.querySelectorAll('.cards-arrow')];
  let index = 0, startX = 0, startY = 0, startT = 0, dx = 0, dragging = false, locked = null;

  const mobile = () => matchMedia('(max-width:1000px)').matches;
  const step = () => (cards[1] ? cards[1].offsetLeft - cards[0].offsetLeft : box.clientWidth);
  const last = () => cards.length - 1;

  function render(offset) {
    track.style.transform = 'translateX(' + (-index * step() + offset) + 'px)';
    if (dots) [...dots.children].forEach((d, i) => d.classList.toggle('on', i === index));
    arrows.forEach(a => {
      const dir = +a.dataset.dir;
      a.disabled = (dir < 0 && index === 0) || (dir > 0 && index === last());
    });
  }

  function go(i) {
    index = Math.max(0, Math.min(last(), i));
    track.classList.remove('dragging');
    render(0);
  }

  if (dots && !dots.children.length) {
    cards.forEach((c, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', 'Зона ' + (i + 1));
      b.addEventListener('click', () => go(i));
      dots.append(b);
    });
  }
  arrows.forEach(a => a.addEventListener('click', e => {
    if (Math.abs(dx) > 8) { e.preventDefault(); return; }   // это был свайп по стрелке
    go(index + (+a.dataset.dir));
  }));

  zone.addEventListener('touchstart', e => {
    if (!mobile()) return;
    startX = e.touches[0].clientX; startY = e.touches[0].clientY;
    startT = performance.now();
    dx = 0; dragging = true; locked = null;
    track.classList.add('dragging');
  }, { passive: true });

  zone.addEventListener('touchmove', e => {
    if (!dragging || !mobile()) return;
    const mx = e.touches[0].clientX - startX;
    const my = e.touches[0].clientY - startY;
    if (locked === null && (Math.abs(mx) > 6 || Math.abs(my) > 6)) {
      locked = Math.abs(mx) > Math.abs(my) ? 'x' : 'y';
    }
    if (locked !== 'x') return;
    dx = mx;
    if ((index === 0 && dx > 0) || (index === last() && dx < 0)) dx *= 0.35;
    render(dx);
  }, { passive: true });

  const finish = () => {
    if (!dragging) return;
    dragging = false;
    track.classList.remove('dragging');
    const dt = Math.max(1, performance.now() - startT);
    const speed = Math.abs(dx) / dt;                 // px/мс — короткий быстрый флик тоже листает
    const enough = Math.abs(dx) > 28 || speed > 0.28;
    if (locked === 'x' && enough) go(index + (dx < 0 ? 1 : -1));
    else go(index);
    dx = 0;
  };
  zone.addEventListener('touchend', finish, { passive: true });
  zone.addEventListener('touchcancel', finish, { passive: true });

  addEventListener('resize', () => { if (mobile()) go(index); else track.style.transform = ''; });
  if (mobile()) go(0); else render(0);
})();

/* ============================================================
   ГЛАВНАЯ v2: секундомер, температуры, зоны, галерея, карта, фон
   ============================================================ */

/* ---------- Секундомер круга: тикает сотыми, сброс на каждом круге ---------- */
(function () {
  const lap = document.getElementById('lap');
  if (!lap || reduce) return;
  let t0 = performance.now(), best = 98420, running = true;
  function draw(ms) {
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    const c = Math.floor((ms % 1000) / 10);
    lap.innerHTML = m + ':' + String(s).padStart(2, '0') + '.<small>' + String(c).padStart(2, '0') + '</small>';
  }
  function tick(now) {
    const ms = now - t0;
    if (ms > best) { t0 = now; best = 92000 + (ms % 9000); }   // новый круг: 1:32–1:41
    draw(ms);
    if (running && !document.hidden) requestAnimationFrame(tick);
    else running = false;
  }
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && !running) { running = true; t0 = performance.now(); requestAnimationFrame(tick); }
  });
  requestAnimationFrame(tick);
})();

/* ---------- Температуры: масло и охлаждение ходят 0→100→0 в противофазе ---------- */
(function () {
  const oil = document.getElementById('tOil'), cool = document.getElementById('tCool');
  const oilBar = document.getElementById('tOilBar'), coolBar = document.getElementById('tCoolBar');
  if (!oil || !cool) return;
  const oilBox = oil.closest('.temp'), coolBox = cool.closest('.temp');
  if (reduce) { oil.textContent = '87'; cool.textContent = '92'; oilBar.style.transform = 'scaleX(.87)'; coolBar.style.transform = 'scaleX(.92)'; return; }
  let last = 0;
  function frame(now) {
    if (now - last > 120) {                    // 8 обновлений в секунду хватает, глаз не видит больше
      last = now;
      const t = now / 1000;
      // медленный треугольный ход 0…100…0 за ~24 с + лёгкая дрожь
      const tri = x => 100 * Math.abs(((x / 24) % 2) - 1);
      const o = Math.round(Math.min(100, Math.max(0, tri(t) + Math.sin(t * 2.1) * 1.6)));
      const c = Math.round(Math.min(100, Math.max(0, tri(t + 12) + Math.sin(t * 1.7 + 1) * 1.6)));
      oil.textContent = o; cool.textContent = c;
      oilBar.style.transform = 'scaleX(' + o / 100 + ')'; coolBar.style.transform = 'scaleX(' + c / 100 + ')';
      oilBox.classList.toggle('hot', o > 90); coolBox.classList.toggle('hot', c > 90);
    }
    if (!document.hidden) requestAnimationFrame(frame);
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) requestAnimationFrame(frame); });
  requestAnimationFrame(frame);
})();

/* ---------- Общий слайдер: свайп + стрелки + точки (зоны и галерея) ---------- */
function makeSlider(o) {
  const wrap = document.querySelector(o.wrap);
  const track = wrap && wrap.querySelector(o.track);
  if (!wrap || !track) return null;
  const items = [...track.children];
  const arrows = [...document.querySelectorAll(o.arrows)];
  const dots = o.dots ? document.querySelector(o.dots) : null;
  const counter = o.counter ? document.getElementById(o.counter) : null;
  let index = 0, startX = 0, startY = 0, startT = 0, dx = 0, dragging = false, locked = null;

  const active = () => !o.mobileOnly || matchMedia('(max-width:1000px)').matches;
  const step = () => items[1] ? items[1].offsetLeft - items[0].offsetLeft : wrap.clientWidth;
  // дальше последнего «полного» экрана не листаем: справа не должно оставаться пустоты
  const maxOffset = () => Math.max(0, track.scrollWidth - wrap.clientWidth);
  const last = () => Math.min(items.length - 1, Math.ceil(maxOffset() / step() - 0.01));
  const perView = () => Math.max(1, Math.round((wrap.clientWidth + (step() - items[0].offsetWidth)) / step()));

  function render(offset) {
    track.style.transform = 'translateX(' + (-Math.min(index * step(), maxOffset()) + offset) + 'px)';
    if (dots) [...dots.children].forEach((d, i) => d.classList.toggle('on', i === index));
    if (counter) { const v = perView(); counter.textContent = v > 1 ? (index + 1) + '–' + Math.min(items.length, index + v) : index + 1; }
    arrows.forEach(a => { const d = +a.dataset.dir; a.disabled = (d < 0 && index === 0) || (d > 0 && index === last()); });
  }
  function go(i) { index = Math.max(0, Math.min(last(), i)); track.classList.remove('dragging'); render(0); }

  if (dots && !dots.children.length) items.forEach((c, i) => {
    const b = document.createElement('button'); b.type = 'button';
    b.setAttribute('aria-label', (o.label || 'Слайд') + ' ' + (i + 1));
    b.addEventListener('click', () => go(i)); dots.append(b);
  });
  arrows.forEach(a => a.addEventListener('click', e => {
    if (Math.abs(dx) > 8) { e.preventDefault(); return; }
    go(index + (+a.dataset.dir));
  }));

  wrap.addEventListener('touchstart', e => {
    if (!active()) return;
    startX = e.touches[0].clientX; startY = e.touches[0].clientY; startT = performance.now();
    dx = 0; dragging = true; locked = null; track.classList.add('dragging');
  }, { passive: true });
  wrap.addEventListener('touchmove', e => {
    if (!dragging || !active()) return;
    const mx = e.touches[0].clientX - startX, my = e.touches[0].clientY - startY;
    if (locked === null && (Math.abs(mx) > 6 || Math.abs(my) > 6)) locked = Math.abs(mx) > Math.abs(my) ? 'x' : 'y';
    if (locked !== 'x') return;
    dx = mx;
    if ((index === 0 && dx > 0) || (index === last() && dx < 0)) dx *= 0.35;
    render(dx);
  }, { passive: true });
  const finish = () => {
    if (!dragging) return;
    dragging = false; track.classList.remove('dragging');
    const speed = Math.abs(dx) / Math.max(1, performance.now() - startT);
    if (locked === 'x' && (Math.abs(dx) > 28 || speed > 0.28)) go(index + (dx < 0 ? 1 : -1)); else go(index);
    dx = 0;
  };
  wrap.addEventListener('touchend', finish, { passive: true });
  wrap.addEventListener('touchcancel', finish, { passive: true });

  // мышью на десктопе — тоже можно тянуть
  let mdown = false;
  wrap.addEventListener('mousedown', e => {
    if (!active() || e.button !== 0) return;
    mdown = true; startX = e.clientX; startT = performance.now(); dx = 0; track.classList.add('dragging'); e.preventDefault();
  });
  addEventListener('mousemove', e => { if (!mdown) return; dx = e.clientX - startX; render(dx); });
  addEventListener('mouseup', () => {
    if (!mdown) return; mdown = false; track.classList.remove('dragging');
    if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1)); else go(index);
    const moved = Math.abs(dx) > 8; dx = 0;
    if (moved) { wrap.dataset.moved = '1'; setTimeout(() => delete wrap.dataset.moved, 50); }
  });

  addEventListener('resize', () => { if (active()) go(index); else { track.style.transform = ''; } });
  if (active()) go(0); else render(0);
  return { go, get index() { return index; }, items };
}

/* ---------- Зоны: на телефоне карусель ---------- */
makeSlider({ wrap: '.zm-wrap', track: '.zm-list', arrows: '.zm-arrow', dots: '.zm-dots', label: 'Зона', mobileOnly: true });

/* ---------- Галерея: слайдер + лайтбокс ---------- */
(function () {
  const gal = makeSlider({ wrap: '.gal-wrap', track: '.gal-track', arrows: '.gal-arrow', counter: 'galCur', label: 'Фото' });
  const total = document.getElementById('galTotal');
  if (gal && total) total.textContent = gal.items.length;

  const lb = document.getElementById('lb');
  if (!lb) return;
  const img = document.getElementById('lbImg'), cap = document.getElementById('lbCap');
  let list = [], cur = 0;

  // смена фото в просмотре: старое уезжает и гаснет, новое (уже декодированное) выезжает с той стороны, куда листают
  let swapT = 0;
  function show(i, dir) {
    cur = (i + list.length) % list.length;
    const it = list[cur];
    cap.textContent = it.cap || '';
    lb.classList.toggle('single', list.length < 2);
    if (lb.hidden || !img.getAttribute('src') || !dir) { img.src = it.src; img.alt = it.alt || ''; return; }
    img.style.setProperty('--lb-dx', (dir > 0 ? -1 : 1) * 32 + 'px');
    img.classList.add('lb-out');
    clearTimeout(swapT);
    const pre = new Image(); pre.src = it.src;
    const ready = pre.decode ? pre.decode().catch(() => {}) : Promise.resolve();
    swapT = setTimeout(() => ready.then(() => {
      if (list[cur] !== it) return;                       // пока грузилось, уже перелистнули дальше
      img.style.setProperty('--lb-dx', (dir > 0 ? 1 : -1) * 32 + 'px');
      img.classList.add('lb-from'); img.classList.remove('lb-out');
      img.src = it.src; img.alt = it.alt || '';
      requestAnimationFrame(() => requestAnimationFrame(() => img.classList.remove('lb-from')));
    }), 200);
  }
  function open(items, i) {
    list = items; show(i); lb.hidden = false; document.body.style.overflow = 'hidden';
  }
  function close() { lb.hidden = true; document.body.style.overflow = ''; }

  if (gal) gal.items.forEach((fig, i) => fig.addEventListener('click', () => {
    if (document.querySelector('.gal-wrap').dataset.moved) return;   // это был драг, а не клик
    open(gal.items.map(f => {
      const im = f.querySelector('img'), c = f.querySelector('figcaption');
      return { src: im.currentSrc || im.src, alt: im.alt, cap: c ? c.textContent : '' };
    }), i);
  }));

  // скриншоты отзывов — одиночный просмотр
  document.querySelectorAll('.rv-proof').forEach(b => b.addEventListener('click', () => {
    const fig = b.closest('.rv');
    const who = fig ? fig.querySelector('.rv-top b').textContent : '';
    open([{ src: b.dataset.shot, alt: 'Скриншот отзыва', cap: who }], 0);
  }));

  lb.querySelector('.lb-close').addEventListener('click', close);
  lb.querySelector('.lb-prev').addEventListener('click', () => show(cur - 1, -1));
  lb.querySelector('.lb-next').addEventListener('click', () => show(cur + 1, 1));
  lb.addEventListener('click', e => { if (e.target === lb) close(); });
  addEventListener('keydown', e => {
    if (lb.hidden) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') show(cur - 1, -1);
    if (e.key === 'ArrowRight') show(cur + 1, 1);
  });
  // свайп внутри лайтбокса
  let sx = 0;
  lb.addEventListener('touchstart', e => { sx = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', e => {
    const d = e.changedTouches[0].clientX - sx;
    if (Math.abs(d) > 40 && list.length > 1) show(cur + (d < 0 ? 1 : -1), d < 0 ? 1 : -1);
  }, { passive: true });
})();

/* ---------- Карта: снимок сразу, живая карта грузится заранее и сменяет его ---------- */
// Виджет Яндекса тяжёлый (~140 запросов, 4–5 с), а тайлы вне экрана браузер не дорисовывает.
// Поэтому: 1) в разметке лежит снимок той же карты — человек видит карту мгновенно;
// 2) виджет начинаем грузить заранее, по первому действию человека на странице;
// 3) снимок убираем, только когда виджет загружен И уже на экране, + пауза, чтобы тайлы успели нарисоваться.
(function () {
  const frame = document.querySelector('.map-frame');
  if (!frame) return;
  let started = false, loaded = false, seen = false, done = false;
  const reveal = () => {
    if (done || !loaded || !seen) return;
    done = true;
    setTimeout(() => frame.classList.add('ready'), 1100);
  };
  const load = () => {
    if (started) return; started = true;
    const f = document.createElement('iframe');
    f.src = frame.dataset.src; f.title = 'Skill Gaming на карте';
    f.setAttribute('allowfullscreen', '');
    f.addEventListener('load', () => { loaded = true; reveal(); }, { once: true });
    setTimeout(() => { loaded = true; reveal(); }, 15000);   // load так и не пришёл — всё равно открываем
    // фрейм — ПЕРЕД снимком: у фрейма есть filter, а элемент с filter рисуется как позиционированный
    // в порядке разметки; стоял бы после снимка — пустой ещё фрейм перекрыл бы снимок тёмным полем
    frame.prepend(f);
  };
  if ('IntersectionObserver' in window) {
    // на экране ли карта (для смены снимка на живую карту)
    new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { seen = true; load(); reveal(); } }, { threshold: 0.2 }).observe(frame);
  } else { seen = true; load(); }

  const c = navigator.connection;
  const frugal = !!(c && (c.saveData || /2g/.test(c.effectiveType || '')));   // «3g» Chrome часто показывает и на нормальном мобильном интернете
  const idle = fn => ('requestIdleCallback' in window) ? requestIdleCallback(fn, { timeout: 1500 }) : setTimeout(fn, 800);
  const whenLoaded = fn => document.readyState === 'complete' ? fn() : addEventListener('load', fn, { once: true });

  // человек целится в «Контакты» — начинаем сразу
  document.querySelectorAll('a[href$="#contacts"]').forEach(a =>
    ['pointerenter', 'touchstart', 'focus'].forEach(ev => a.addEventListener(ev, load, { once: true, passive: true })));

  // на подходе к блоку — всегда (и при экономии трафика)
  if ('IntersectionObserver' in window) {
    const near = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { load(); near.disconnect(); } },
      { rootMargin: (frugal ? 600 : 2000) + 'px 0px' });
    near.observe(frame);
  }
  if (frugal) return;
  // по первому действию на странице (мышь, касание, прокрутка, клавиша) — в простое.
  // Не сразу при загрузке: робот PageSpeed ничего не делает, и тяжёлые скрипты карты не портят ему оценку.
  const evs = ['pointermove', 'pointerdown', 'touchstart', 'wheel', 'scroll', 'keydown'];
  const go = () => { evs.forEach(e => removeEventListener(e, go)); whenLoaded(() => idle(load)); };
  evs.forEach(e => addEventListener(e, go, { passive: true }));
})();

/* ---------- Видео: на медленной сети не грузим тяжёлый файл ---------- */
(function () {
  const v = document.querySelector('.hero-vid');
  if (!v) return;
  const c = navigator.connection;
  if (c && (c.saveData || /2g/.test(c.effectiveType || ''))) { v.removeAttribute('autoplay'); v.preload = 'none'; return; }
  const p = v.play && v.play();
  if (p && p.catch) p.catch(() => {});   // автоплей может быть запрещён — останется постер
})();

/* ============================================================
   ЖИВОЙ ФОН v3 — слои + связь с прокруткой
   - Создаёт .aurora первым ребёнком <body> (если её нет в разметке).
   - На прокрутке (passive + один rAF на кадр) пишет ДВЕ переменные на .aurora:
       --au-s  синус от scrollY → параллакс слоёв с разной скоростью
       --au-w  «теплота» 0…1: красный у видео и у брони, сталь в середине страницы
   - Само движение цвета — CSS-анимации transform, JS в нём не участвует.
   ============================================================ */
(function () {
  var d = document, root = d.documentElement;
  var au = d.querySelector('.aurora');
  if (!au) {
    au = d.createElement('div');
    au.className = 'aurora';
    au.setAttribute('aria-hidden', 'true');
    au.innerHTML =
      '<div class="au-p au-p3"><i class="au-f au-f3"></i></div>' +   // сталь — ниже всех
      '<div class="au-p au-p2"><i class="au-f au-f2"></i></div>' +   // бордо
      '<div class="au-p au-p1"><i class="au-f au-f1"></i></div>' +   // жар
      '<div class="au-p au-p4"><i class="au-shape"><i class="au-comet"></i></i></div>';     // кольцо + комета
    d.body.insertBefore(au, d.body.firstChild);
  }

  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var hero = d.getElementById('hero');
  var book = d.getElementById('booking');
  var vh = 0, heroH = 0, bookTop = Infinity, queued = false, lastS = '', lastW = '';

  function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function smooth(x) { x = clamp01(x); return x * x * (3 - 2 * x); }

  function measure() {
    vh = window.innerHeight || 800;
    heroH = hero ? hero.offsetHeight : vh;
    bookTop = book ? book.getBoundingClientRect().top + window.pageYOffset : Infinity;
  }

  function update() {
    queued = false;
    var y = window.pageYOffset;
    // параллакс: синус, чтобы сдвиг был ограничен на любой длине страницы (период ≈ 6,9 тыс. px)
    var s = Math.sin(y / 1100).toFixed(3);
    // теплота: 1 пока виден первый экран → 0 к середине → снова 1 при подходе к брони
    var wTop = 1 - smooth((y - heroH * 0.35) / (vh * 1.3));
    var wBot = smooth((y + vh * 1.25 - bookTop) / (vh * 1.1));
    var w = Math.max(wTop, wBot).toFixed(3);
    if (s !== lastS) { au.style.setProperty('--au-s', s); lastS = s; }
    if (w !== lastW) { au.style.setProperty('--au-w', w); lastW = w; }
  }

  function request() { if (!queued) { queued = true; requestAnimationFrame(update); } }

  measure(); update();
  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', function () { measure(); request(); }, { passive: true });
  // высота страницы меняется после загрузки картинок/шрифтов — перемеряем позицию брони
  window.addEventListener('load', function () { measure(); request(); });
  if (window.ResizeObserver) new ResizeObserver(function () { measure(); request(); }).observe(d.body);
})();

/* ============================================================
   ЖИВОЙ ФОН «MESH»: абстрактный текучий градиент на весь экран (WebGL1, без библиотек)
   - несколько крупных цветовых полей (кармин / красный / вино / сталь) плавают по экрану
     и перетекают друг в друга; пространство слегка «течёт» (domain warp) — формы
     полей всё время меняются, как у меш-градиента
   - прокрутка сдвигает всё поле: в каждой секции свой рисунок, а не одно пятно
   - считается в ~0.3 от размера экрана (градиент гладкий), 30 fps, стоп на скрытой вкладке;
     без WebGL — статичный CSS-градиент, prefers-reduced-motion — один кадр
   Пресет цвета: window.MESH_PRESET (1 красный/графит, 2 красный+сталь, 3 тёмный кармин)
   ============================================================ */
(function () {
  'use strict';
  var d = document, w = window;
  var still = !!(w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var PRESETS = {
    1: { base: [.034, .038, .048], c: [[.46, .045, .06], [.66, .09, .075], [.22, .025, .05], [.11, .135, .175]], s: [1, .8, .9, .7], b: .42 },
    2: { base: [.03, .035, .045], c: [[.6, .07, .065], [.15, .21, .29], [.32, .035, .055], [.2, .24, .3]], s: [1, .9, .8, .55], b: .45 },
    3: { base: [.022, .025, .032], c: [[.32, .03, .05], [.5, .055, .06], [.14, .02, .045], [.075, .085, .11]], s: [1, .75, .9, .7], b: .5 }
  };
  var P = PRESETS[w.MESH_PRESET] || PRESETS[3];   // выбран «Тёмный кармин»

  var host = d.createElement('div');
  host.className = 'mesh-bg'; host.setAttribute('aria-hidden', 'true');
  var cv = d.createElement('canvas'); host.appendChild(cv);
  d.body.insertBefore(host, d.body.firstChild);
  function fallback() { host.classList.add('nogl'); }

  var gl = null;
  try {
    var opt = { alpha: false, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: false, powerPreference: 'low-power' };
    gl = cv.getContext('webgl', opt) || cv.getContext('experimental-webgl', opt);
  } catch (e) { gl = null; }
  if (!gl) { fallback(); return; }

  var VS = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
  var FS = [
    '#ifdef GL_FRAGMENT_PRECISION_HIGH', 'precision highp float;', '#else', 'precision mediump float;', '#endif',
    'uniform vec2 u_res; uniform float u_t; uniform float u_scroll; uniform float u_port;',
    'uniform vec3 u_base; uniform vec3 u_c1; uniform vec3 u_c2; uniform vec3 u_c3; uniform vec3 u_c4;',
    'uniform vec4 u_s; uniform float u_b;',
    'float hash(vec2 p){vec3 p3=fract(vec3(p.xyx)*.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}',
    'float noise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);',
    '  return mix(mix(hash(i),hash(i+vec2(1.,0.)),u.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),u.x),u.y);}',
    'float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*noise(p);p=mat2(1.6,1.2,-1.2,1.6)*p+3.1;a*=.5;}return v;}',
    /* вес цветового поля: мягкий гауссов «ком» вокруг движущейся точки */
    'float blob(vec2 p,vec2 c,float r){vec2 d=p-c;return exp(-dot(d,d)/(r*r));}',
    'void main(){',
    '  vec2 p=(gl_FragCoord.xy-.5*u_res)/u_res.y;',
    '  float t=u_t;',
    '  float sy=u_scroll*3.2;',
    '  vec2 fp=p*1.05+vec2(0.,sy*.55);',
    '  vec2 q=vec2(fbm(fp*1.2+vec2(0.,t*.09)),fbm(fp*1.2+vec2(5.2,1.3)+vec2(t*.07,-t*.05)));',
    '  vec2 wp=p+(q-.5)*1.15;',                               /* поля остаются на экране; прокрутка меняет их рисунок и траектории */
    '  float sx=mix(1.,.6,u_port);',
    '  vec2 P1=vec2(sx*(.55*sin(t*.16+sy*.9)+.25),.38*cos(t*.13+1.)+.05);',
    '  vec2 P2=vec2(sx*(.6*cos(t*.12+2.)-.2),.42*sin(t*.17+sy*.7));',
    '  vec2 P3=vec2(sx*(.45*sin(t*.19+4.)+.45),.36*sin(t*.11+sy*1.1+3.)-.1);',
    '  vec2 P4=vec2(sx*(.55*cos(t*.14+5.)-.35),.4*cos(t*.15+sy*.8+2.)+.08);',
    '  float r=mix(.46,.4,u_port);',
    '  float w1=u_s.x*blob(wp,P1,r*1.05), w2=u_s.y*blob(wp,P2,r*.85), w3=u_s.z*blob(wp,P3,r*1.2), w4=u_s.w*blob(wp,P4,r);',
    '  float B=u_b;',
    '  vec3 col=(u_base*B+u_c1*w1+u_c2*w2+u_c3*w3+u_c4*w4)/(B+w1+w2+w3+w4);',
    /* свечение там, где поля сливаются — объём, а не плоская заливка */
    '  float glow=smoothstep(.35,1.4,w1+w2);',
    '  col+=u_c2*glow*.12;',
    /* колонка текста слева на компьютере чуть темнее */
    '  col*=mix(mix(.78,1.,smoothstep(-.95,.05,p.x)),1.,u_port);',
    '  col+=(hash(gl_FragCoord.xy+fract(t*7.))-.5)/255.;',
    '  gl_FragColor=vec4(clamp(col,0.,1.),1.);',
    '}'
  ].join('\n');

  function sh(type, src) {
    var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  var prog;
  try {
    prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  } catch (e) { fallback(); return; }
  gl.useProgram(prog);
  var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(prog, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  var U = {};
  ['u_res', 'u_t', 'u_scroll', 'u_port', 'u_base', 'u_c1', 'u_c2', 'u_c3', 'u_c4', 'u_s', 'u_b'].forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });
  gl.uniform3fv(U.u_base, P.base); gl.uniform3fv(U.u_c1, P.c[0]); gl.uniform3fv(U.u_c2, P.c[1]);
  gl.uniform3fv(U.u_c3, P.c[2]); gl.uniform3fv(U.u_c4, P.c[3]);
  gl.uniform4fv(U.u_s, P.s); gl.uniform1f(U.u_b, P.b);

  /* размер: градиент гладкий — хватает ~0.3 от экрана, растягивает CSS */
  var cw = 0, ch = 0, port = 0;
  function size() {
    var W = host.clientWidth || w.innerWidth, H = host.clientHeight || w.innerHeight;
    var k = Math.min(0.32, 640 / Math.max(W, H));
    var nw = Math.max(2, Math.round(W * k)), nh = Math.max(2, Math.round(H * k));
    port = Math.max(0, Math.min(1, (1.15 - W / H) / 0.55));
    if (nw === cw && nh === ch) return false;
    cw = cv.width = nw; ch = cv.height = nh; gl.viewport(0, 0, cw, ch);
    return true;
  }
  var docMax = 1, sT = 0;
  function readScroll() { sT = Math.min(1, Math.max(0, w.scrollY / docMax)); }
  function measure() { docMax = Math.max(1, d.documentElement.scrollHeight - w.innerHeight); readScroll(); }
  w.addEventListener('scroll', readScroll, { passive: true });
  w.addEventListener('load', measure);
  if (w.ResizeObserver) { try { new ResizeObserver(measure).observe(d.body); } catch (e) {} }
  measure();

  var sC = sT, T0 = performance.now(), T_OFF = 40;
  function draw(now) {
    gl.uniform2f(U.u_res, cw, ch);
    gl.uniform1f(U.u_t, (still ? T_OFF : T_OFF + (now - T0) / 1000) % 3600);
    gl.uniform1f(U.u_scroll, sC); gl.uniform1f(U.u_port, port);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  size();
  var raf = 0, last = 0, lastTick = 0, shown = false;
  function frame(now) {
    raf = w.requestAnimationFrame(frame);
    if (now - last < 31) return;                              /* ~30 fps */
    var dt = Math.min(0.1, (now - (lastTick || now)) / 1000); lastTick = now; last = now;
    sC += (sT - sC) * (1 - Math.exp(-dt * 3));               /* плавная инерция прокрутки */
    draw(now);
    if (!shown) { shown = true; host.classList.add('on'); }
  }
  function start() { if (!raf && !still && !d.hidden) { last = 0; lastTick = 0; raf = w.requestAnimationFrame(frame); } }
  function stop() { if (raf) { w.cancelAnimationFrame(raf); raf = 0; } }
  var rT = 0;
  w.addEventListener('resize', function () {
    clearTimeout(rT);
    rT = setTimeout(function () { if (size() && still) draw(performance.now()); measure(); }, 150);
  });
  d.addEventListener('visibilitychange', function () { if (d.hidden) stop(); else start(); });
  cv.addEventListener('webglcontextlost', function (e) { e.preventDefault(); stop(); fallback(); });
  if (still) { draw(performance.now()); host.classList.add('on'); } else start();
})();

/* ---------- v5: размытые абстрактные формы по всей странице ---------- */
// У каждой секции своя размытая форма, стороны чередуются (право / лево / право…),
// у длинных секций — две. Позиции считаются от реальных секций и пересчитываются,
// когда меняется высота страницы. Анимация идёт только у форм рядом с экраном.
(function () {
  var main = document.querySelector('main');
  if (!main) return;
  var box = document.createElement('div');
  box.className = 'bshapes';
  box.setAttribute('aria-hidden', 'true');
  main.insertBefore(box, main.firstChild);

  var PAL = ['red', 'wine', 'red', 'steel', 'wine', 'red'];
  var io = ('IntersectionObserver' in window) ? new IntersectionObserver(function (es) {
    es.forEach(function (e) { e.target.classList.toggle('run', e.isIntersecting); });
  }, { rootMargin: '300px 0px' }) : null;

  var lastKey = '';
  function build() {
    var W = document.documentElement.clientWidth, mob = W < 700;
    var mainTop = main.getBoundingClientRect().top + window.pageYOffset;
    var secs = [].slice.call(main.querySelectorAll(':scope > section'));
    var spots = [];
    secs.forEach(function (s, i) {
      var top = s.getBoundingClientRect().top + window.pageYOffset - mainTop, h = s.offsetHeight;
      if (i === 0 && s.classList.contains('hero-video')) {
        // первая форма принимает растворяющееся видео — у нижнего края первого экрана, справа
        spots.push({ y: top + h * 0.92, side: 1 });
        return;
      }
      spots.push({ y: top + Math.min(h * 0.32, 420), side: spots.length % 2 ? -1 : 1 });
      if (h > (mob ? 1500 : 1100)) spots.push({ y: top + h * 0.78, side: spots.length % 2 ? -1 : 1 });
    });
    var key = W + ':' + spots.map(function (p) { return Math.round(p.y / 40); }).join(',');
    if (key === lastKey) return;
    lastKey = key;

    if (io) io.disconnect();
    box.innerHTML = '';
    spots.forEach(function (p, i) {
      var el = document.createElement('i');
      var size = mob ? W * (1.15 + (i % 3) * 0.15) : Math.min(1150, W * (0.5 + (i % 3) * 0.08));
      var x = mob ? W * (p.side > 0 ? 0.78 : 0.22) : W * (p.side > 0 ? 0.8 : 0.18);
      el.className = 'bshape ' + PAL[i % PAL.length];
      el.style.cssText =
        '--x:' + Math.round(x) + 'px;--y:' + Math.round(p.y) + 'px;' +
        '--w:' + Math.round(size) + 'px;--h:' + Math.round(size * 0.78) + 'px;' +
        '--dd:' + (15 + (i * 7) % 9) + 's;--dm:' + (11 + (i * 5) % 7) + 's;--dl:-' + (i * 3.7).toFixed(1) + 's;' +
        '--df:' + (3.6 + (i * 1.3) % 2.6).toFixed(1) + 's;' +   // у каждой формы свой ритм мерцания
        '--mx:' + (mob ? 8 : 6) + 'vw;--my:' + (mob ? 4 : 6) + 'vh';
      box.appendChild(el);
      if (io) io.observe(el); else el.classList.add('run');
    });
  }

  build();
  window.addEventListener('load', build);
  var rT = 0;
  function later() { clearTimeout(rT); rT = setTimeout(build, 200); }
  window.addEventListener('resize', later);
  if ('ResizeObserver' in window) new ResizeObserver(later).observe(main);
})();

/* ---------- Фото: докачиваем заранее и показываем плавно ---------- */
// GitHub отдаёт файлы небыстро, а «ленивые» фото начинали грузиться, только когда до них почти долистали.
// Теперь: 1) всё, что ближе 1600 px к экрану, грузится сразу; 2) после старта страницы остальные фото
// тихо докачиваются по очереди (по два), в порядке страницы; 3) фото, которое ещё грузится, проявляется плавно.
(function () {
  const imgs = [...document.querySelectorAll('img[loading="lazy"]')];
  if (!imgs.length) return;
  const eager = im => { if (im.loading === 'lazy') im.loading = 'eager'; };

  document.querySelectorAll('main img').forEach(im => {
    if (im.complete && im.naturalWidth) return;
    im.classList.add('img-fade');
    const done = () => {
      im.classList.add('img-in');
      setTimeout(() => im.classList.remove('img-fade', 'img-in'), 700);   // вернуть картинке её обычные переходы
    };
    im.addEventListener('load', done, { once: true });
    im.addEventListener('error', done, { once: true });
  });

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { eager(e.target); io.unobserve(e.target); }
    }), { rootMargin: '1600px 0px' });
    imgs.forEach(im => io.observe(im));
  } else imgs.forEach(eager);

  const c = navigator.connection;
  if (c && (c.saveData || /2g/.test(c.effectiveType || ''))) return;   // экономия трафика — только по мере прокрутки
  let k = 0;
  const next = () => {
    const im = imgs[k++]; if (!im) return;
    if (im.complete && im.naturalWidth) return next();
    eager(im);
    im.addEventListener('load', next, { once: true });
    im.addEventListener('error', next, { once: true });
  };
  const warm = () => { next(); next(); };
  const start = () => setTimeout(() => ('requestIdleCallback' in window) ? requestIdleCallback(warm, { timeout: 2000 }) : warm(), 1000);
  if (document.readyState === 'complete') start(); else addEventListener('load', start, { once: true });
})();

/* ---------- Цены на телефоне: залы-полоски раскрываются по нажатию; табло сверху открывает нужный зал ---------- */
(function () {
  const setOpen = (h, on) => { h.classList.toggle('open', on); h.querySelector('.rxm-head').setAttribute('aria-expanded', on); };
  document.querySelectorAll('.rxm-hall').forEach(h =>
    h.querySelector('.rxm-head').addEventListener('click', () => setOpen(h, !h.classList.contains('open'))));
  document.querySelectorAll('.rxm-board a').forEach(a => a.addEventListener('click', e => {
    const t = document.querySelector(a.getAttribute('href'));
    if (!t) return;
    e.preventDefault();
    setOpen(t, true);
    t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    t.classList.remove('flash'); void t.offsetWidth; t.classList.add('flash');
    clearTimeout(t._f); t._f = setTimeout(() => t.classList.remove('flash'), 1400);
  }));
})();
