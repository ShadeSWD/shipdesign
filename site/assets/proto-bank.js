/* «Прототип из банка»: выпадающий список судов-прототипов справочника
 * (/ref/api/tables/ships.json — учебные варианты кафедры проектирования
 * судов СПбГМТУ). Выбор судна подставляет его размерения и водоизмещение
 * в поля прототипа второго приближения; значения по умолчанию и пресеты
 * типов судна остаются прежними — банк только добавляет выбор.
 * Дополнительно: страницу можно открыть ссылкой из карточки судна
 * (…/design/solver?ship=v16) — прототип подставится сразу. */
'use strict';
(function () {
  const URL_JSON = 'https://shadeswd.duckdns.org/ref/api/tables/ships.json';
  const SEL = 'proto-bank';
  const $ = (id) => document.getElementById(id);
  if (!$(SEL)) return;

  const fmt = (v, d) => (v == null || !isFinite(v) ? '—'
    : v.toLocaleString('ru-RU', { minimumFractionDigits: d, maximumFractionDigits: d }));
  const beam = (s) => s.B_eff || s.B;

  function apply(s, fromLink) {
    const d = s.design || {};
    const set = (id, v) => {
      const el = $(id);
      if (el && v != null && isFinite(v)) {
        el.value = Math.round(v * 1000) / 1000;
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }
    };
    set('c3-D0', d.D);
    set('c3-L0', s.L_pp);
    set('c3-B0', beam(s));
    set('c3-T0', s.T);
    set('c3-H0', s.H_est);          // высота борта известна не у всех вариантов
    const note = $('proto-bank-note');
    if (note) {
      note.innerHTML = `Прототип из банка: <b>вариант ${s.variant}</b>, ${s.type_name}`
        + (s.project ? ` («${s.project}»)` : '') + `. Подставлены D₀ = ${fmt(d.D, 0)} т, `
        + `L₀ = ${fmt(s.L_pp, 2)} м, B₀ = ${fmt(beam(s), 2)} м, T₀ = ${fmt(s.T, 2)} м`
        + (s.H_est ? `, H₀ = ${fmt(s.H_est, 2)} м` : '')
        + `; δ₀ = ${fmt(d.Cb, 4)}. Статьи нагрузки прототипа (Р<sub>ст0</sub>, `
        + 'Р<sub>об0</sub>, Р<sub>сэу0</sub>, Р<sub>сэз0</sub>, N₀, u₀, R₀) в банке '
        + 'отсутствуют и остались от выбранного типа судна — при необходимости '
        + 'поправьте их вручную. '
        + (s.H_est ? '' : 'Высота борта в этом варианте не задана — поле H₀ не менялось. ')
        + '<a href="https://shadeswd.duckdns.org/ref/ships#' + s.id + '">карточка судна</a> · '
        + 'источник — варианты заданий кафедры проектирования судов СПбГМТУ'
        + (fromLink ? ' (судно передано ссылкой из банка).' : '.');
      note.style.display = '';
    }
  }

  fetch(URL_JSON).then((r) => r.json()).then((doc) => {
    const sel = $(SEL);
    const byType = {};
    for (const s of doc.ships) (byType[s.type] = byType[s.type] || []).push(s);
    let html = '<option value="">— прототип из банка судов —</option>';
    for (const t of Object.keys(byType)) {
      html += `<optgroup label="${doc.types[t] || t}">`
        + byType[t].map((s) => `<option value="${s.id}">вариант ${s.variant}`
          + (s.project ? ' · ' + s.project : '')
          + ` · L=${fmt(s.L_pp, 1)} B=${fmt(beam(s), 1)} T=${fmt(s.T, 1)}</option>`).join('')
        + '</optgroup>';
    }
    sel.innerHTML = html;
    sel.addEventListener('change', () => {
      const s = doc.ships.find((x) => x.id === sel.value);
      if (s) apply(s, false);
    });
    const q = new URLSearchParams(location.search);
    const want = q.get('ship');
    const s = want && doc.ships.find((x) => x.id === want);
    if (s) { sel.value = s.id; apply(s, true); }
  }).catch(() => {
    const note = $('proto-bank-note');
    if (note) {
      note.textContent = 'банк судов-прототипов справочника сейчас недоступен — '
        + 'расчёт работает на значениях по умолчанию';
      note.style.display = '';
    }
  });
})();
