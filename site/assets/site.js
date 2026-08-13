/* Каркас страниц «Проектирование судов». */
'use strict';
(function () {
  const me = document.currentScript;
  const root = (me && me.dataset.root) || './';
  const page = (me && me.dataset.page) || '';
  const chapters = [
    { href: 't-basics', title: '1. Методология проектирования' },
    { href: 't-stages', title: '2. Стадии и документация' },
    { href: 't-load', title: '3. Нагрузка масс и вместимость' },
    { href: 't-form', title: '4. Форма корпуса' },
    { href: 't-power', title: '5. Ходкость и энергетическая установка' },
    { href: 't-econ', title: '6. Экономика проекта' },
  ];
  const nav = [
    { href: '', key: 'index', title: 'Обзор' },
    { href: 'theory', key: 'theory', title: 'Теория', drop: chapters },
    { href: 'solver', key: 'solver', title: 'Главные элементы судна' },
    { href: 'arrangement', key: 'arrangement', title: 'Общее расположение' },
    { href: 'hullform', key: 'hullform', title: 'Теоретический чертёж' },
    { href: 'checks', key: 'checks', title: 'Проверочные расчёты' },
    { href: 'floodcalc', key: 'floodcalc', title: 'Непотопляемость' },
    { href: 'sources', key: 'sources', title: 'Источники' },
  ];
  const header = document.createElement('header');
  header.className = 'site';
  header.innerHTML = `<div class="wrap">
    <a class="logo" href="${root}"><span style="font-size:24px;line-height:1">🚢</span><span>Проектирование судов</span></a>
    <nav class="top">${nav.map(({ href, key, title, drop }) => {
      const link = `<a href="${root}${href}" class="${page === key ? 'on' : ''}">${title}</a>`;
      if (!drop) return link;
      const items = drop.map((c) =>
        `<a href="${root}${c.href}">${c.title}</a>`).join('');
      return `<span class="nav-drop">${link}<span class="drop">${items}</span></span>`;
    }).join('')}</nav>
  </div>`;
  document.body.prepend(header);
  const footer = document.createElement('footer');
  footer.className = 'site';
  footer.innerHTML = `<div class="wrap">
    <div>Учебный сайт по курсу «Теория проектирования судов» · живые расчёты в браузере</div>
  </div>`;
  document.body.appendChild(footer);
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  defs.setAttribute('width', '0'); defs.setAttribute('height', '0');
  defs.style.position = 'absolute';
  defs.innerHTML = `<defs>
    <marker id="arrE" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto">
      <path d="M0,0 L10,4 L0,8 z" fill="#16161a"/></marker>
    <marker id="arrS" markerWidth="10" markerHeight="8" refX="1" refY="4" orient="auto">
      <path d="M10,0 L0,4 L10,8 z" fill="#16161a"/></marker>
  </defs>`;
  document.body.appendChild(defs);
})();
