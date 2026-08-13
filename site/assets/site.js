/* Каркас страниц «Проектирование судов». */
'use strict';
(function () {
  const me = document.currentScript;
  const root = (me && me.dataset.root) || './';
  const page = (me && me.dataset.page) || '';
  const nav = [
    { h: '', k: 'index', t: 'Обзор' },
    { t: 'Теория', h: 'theory', drop: [
      { h: 'theory', k: 'theory', t: 'Оглавление курса' },
      { h: 't-basics', k: 'theory', t: '1. Методология проектирования' },
      { h: 't-stages', k: 'theory', t: '2. Стадии и документация' },
      { h: 't-load', k: 'theory', t: '3. Нагрузка масс и вместимость' },
      { h: 't-form', k: 'theory', t: '4. Форма корпуса' },
      { h: 't-power', k: 'theory', t: '5. Ходкость и установка' },
      { h: 't-econ', k: 'theory', t: '6. Экономика и энергоэффективность' },
    ] },
    { t: 'Задачи', h: 'solver', drop: [
      { h: 'solver', k: 'solver', t: 'Главные элементы судна' },
      { h: 'hullform', k: 'hullform', t: 'Теоретический чертёж' },
      { h: 'arrangement', k: 'arrangement', t: 'Общее расположение' },
      { h: 'checks', k: 'checks', t: 'Проверочные расчёты' },
      { h: 'floodcalc', k: 'floodcalc', t: 'Непотопляемость' },
    ] },
    { h: 'sources', k: 'sources', t: 'Источники' },
  ];
  const navLink = (it) =>
    `<a href="${root}${it.h}" class="${page === it.k ? 'on' : ''}">${it.t}</a>`;
  const navHtml = nav.map((g) => {
    if (!g.drop) return navLink(g);
    const on = g.drop.some((it) => page === it.k) ? 'on' : '';
    return `<span class="nav-drop"><a href="${root}${g.h}" class="${on}">${g.t} ▾</a>`
      + `<span class="drop">${g.drop.map(navLink).join('')}</span></span>`;
  }).join('');
  const header = document.createElement('header');
  header.className = 'site';
  header.innerHTML = `<div class="wrap">
    <a class="logo" href="${root}"><span style="font-size:24px;line-height:1">🚢</span><span>Проектирование судов</span></a>
    <nav class="top">${navHtml}</nav>
  </div>`;
  document.body.prepend(header);
  const onReady = (fn) => (document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', fn) : fn());
  const footer = document.createElement('footer');
  footer.className = 'site';
  footer.innerHTML = `<div class="wrap">
    <div>Учебный сайт по курсу «Теория проектирования судов» · живые расчёты в браузере</div>
  </div>`;
  onReady(() => document.body.appendChild(footer));
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  defs.setAttribute('width', '0'); defs.setAttribute('height', '0');
  defs.style.position = 'absolute';
  defs.innerHTML = `<defs>
    <marker id="arrE" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto">
      <path d="M0,0 L10,4 L0,8 z" fill="#16161a"/></marker>
    <marker id="arrS" markerWidth="10" markerHeight="8" refX="1" refY="4" orient="auto">
      <path d="M10,0 L0,4 L10,8 z" fill="#16161a"/></marker>
  </defs>`;
  onReady(() => document.body.appendChild(defs));
})();
