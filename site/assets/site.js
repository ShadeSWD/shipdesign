/* Данные каркаса страниц. Машинерия — assets/shell.js. */
'use strict';
(function () {
  const me = document.currentScript;
  buildSiteShell({
    root: (me && me.dataset.root) || './',
    page: (me && me.dataset.page) || '',
    brand: 'Проектирование судов',
    logo: `<span style="font-size:24px;line-height:1">🚢</span>`,
    nav: [
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
    ],
    footer: `<div>Учебный сайт по курсу «Теория проектирования судов» · живые расчёты в браузере</div>`,
    markers: `<marker id="arrE" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto">
      <path d="M0,0 L10,4 L0,8 z" fill="#16161a"/></marker>
    <marker id="arrS" markerWidth="10" markerHeight="8" refX="1" refY="4" orient="auto">
      <path d="M10,0 L0,4 L10,8 z" fill="#16161a"/></marker>`,
  });
})();
