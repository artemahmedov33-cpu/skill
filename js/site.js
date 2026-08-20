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

/* ---------- Тахометр и машина: живут от скорости скролла ---------- */
(function () {
  const track = document.getElementById('track');
  if (!track) return;
  const narrow = matchMedia('(max-width:1000px)');
  if (narrow.matches) {                       // сцена скрыта — не тратим кадры и батарею
    narrow.addEventListener('change', e => { if (!e.matches) location.reload(); });
    return;
  }
  const live = document.getElementById('live');
  const car = document.getElementById('car');
  const needle = document.getElementById('needle');
  const rpmval = document.getElementById('rpmval');
  const fill = document.getElementById('rpmfill');
  const spd = document.getElementById('spd');
  const gear = document.getElementById('gear');
  const lap = document.getElementById('lap');
  const ticksBox = document.getElementById('ticks');

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

  const LEN = track.getTotalLength();
  const ARC = fill.getTotalLength();
  live.style.strokeDasharray = '58 ' + LEN;   // короткий след за машиной

  let pos = 0, rpm = .18, target = .18, lastY = scrollY, lapT = 98.42;

  const rpmBox = document.querySelector('.rpm');
  const hero = document.querySelector('.hero');
  addEventListener('scroll', () => {
    const d = Math.abs(scrollY - lastY); lastY = scrollY;
    target = Math.min(1, .18 + d / 42);
    if (rpmBox && hero) rpmBox.classList.toggle('docked', scrollY > hero.offsetHeight * 0.72);
  }, { passive: true });

  if (rpmBox) rpmBox.addEventListener('click', () => {
    if (rpmBox.classList.contains('docked')) scrollTo({ top: 0, behavior: 'smooth' });
  });

  function frame() {
    target += (0.16 - target) * 0.03;
    rpm += (target - rpm) * 0.09;

    needle.setAttribute('transform', 'rotate(' + (-135 + rpm * 270) + ' 50 50)');
    const doc = document.documentElement;
    const progress = Math.min(1, scrollY / Math.max(1, doc.scrollHeight - innerHeight));
    fill.setAttribute('stroke-dasharray', (ARC * progress).toFixed(1) + ' ' + ARC);
    rpmval.textContent = String(Math.round(rpm * 8200)).padStart(4, '0');

    pos = (pos + 0.6 + rpm * 5.2) % LEN;
    const pt = track.getPointAtLength(pos);
    car.setAttribute('cx', pt.x); car.setAttribute('cy', pt.y);
    live.style.strokeDashoffset = LEN - pos;

    spd.textContent = Math.round(60 + rpm * 260);
    gear.textContent = Math.max(1, Math.ceil(rpm * 6));
    if (pos < 6) lapT = 92 + Math.random() * 12;
    lap.textContent = Math.floor(lapT / 60) + ':' + (lapT % 60).toFixed(2).padStart(5, '0');

    requestAnimationFrame(frame);
  }
  if (!reduce) frame();
  else { needle.setAttribute('transform', 'rotate(-40 50 50)'); rpmval.textContent = '2600'; }
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
    list.style.setProperty('--flow', (seen * 100).toFixed(1) + '%');
    items.forEach(li => li.classList.toggle('done', li.getBoundingClientRect().top < innerHeight * .72));
  }
  addEventListener('scroll', tick, { passive: true });
  addEventListener('resize', tick);
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
  let x = innerWidth / 2, y = innerHeight / 2, tx = x, ty = y;
  addEventListener('mousemove', e => { tx = e.clientX; ty = e.clientY; }, { passive: true });
  (function loop() {
    x += (tx - x) * .18; y += (ty - y) * .18;
    c.style.transform = 'translate(' + x + 'px,' + y + 'px) translate(-50%,-50%)';
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
