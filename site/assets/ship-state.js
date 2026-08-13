/* Сквозной проект: результаты расчёта главных элементов сохраняются и
 * подхватываются страницами эскиза, теоретического чертежа и проверок.
 * Хранилище — localStorage, ключ 'shipdesign.project'. */
'use strict';
window.ShipState = (function () {
  const KEY = 'shipdesign.project';

  function save(p) {
    try { localStorage.setItem(KEY, JSON.stringify({ ...p, ts: Date.now() })); } catch (e) { /* приватный режим */ }
  }
  function load() {
    try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; }
  }
  function clear() { try { localStorage.removeItem(KEY); } catch (e) { /* нечего чистить */ } }

  /* подставить сохранённые размерения в поля страницы и показать плашку */
  function apply(map, opts) {
    const p = load();
    if (!p) return null;
    let used = [];
    for (const [id, key] of Object.entries(map)) {
      const el = document.getElementById(id);
      if (el && p[key] != null && isFinite(p[key])) {
        el.value = Math.round(p[key] * 1000) / 1000;
        used.push(`${key} = ${el.value}`);
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
    if (!used.length) return p;
    const bar = document.createElement('div');
    bar.className = 'note tip';
    bar.style.margin = '14px 0';
    bar.innerHTML = `<b>Проект: ${p.typeName || 'судно'}.</b> Размерения подставлены из
      <a href="solver">расчёта главных элементов</a> (${used.join('; ')}).
      <button type="button" class="btn" id="ship-state-clear" style="margin-left:10px">считать независимо</button>`;
    const main = document.querySelector('main.wrap');
    const anchor = (opts && opts.before) ? document.querySelector(opts.before) : main.children[2];
    main.insertBefore(bar, anchor || null);
    document.getElementById('ship-state-clear').addEventListener('click', () => {
      clear(); location.reload();
    });
    return p;
  }
  return { save, load, clear, apply };
})();
