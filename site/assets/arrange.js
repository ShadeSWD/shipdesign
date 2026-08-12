/* arrange.js — эскиз общего расположения: шпация, переборки, МО, трюмы,
 * палубные сооружения + параметрический чертёж (через shipdraw.js). */
'use strict';
(function () {
  function fmt(v, d = 0) {
    if (!isFinite(v)) return '—';
    return v.toLocaleString('ru-RU', { minimumFractionDigits: d, maximumFractionDigits: d });
  }
  function stepRow(f, sub, res) {
    return `<div style="margin:6px 0;font:14.5px system-ui"><span style="color:#3a3a42">${f}</span>` +
      (sub ? ` = <span style="color:#6b6b74">${sub}</span>` : '') + ` = <b>${res}</b></div>`;
  }
  function badgeRow(text, ok) {
    return `<div style="margin:8px 0"><span class="badge ${ok ? 'ok' : 'bad'}">${text}</span></div>`;
  }
  const readN = id => parseFloat(document.getElementById(id).value);
  const ceilTo = (x, m) => Math.ceil(x / m - 1e-9) * m;
  const floorTo = (x, m) => Math.floor(x / m + 1e-9) * m;
  const roundTo = (x, m) => Math.round(x / m) * m;

  function calc() {
    const L = readN('ar-L'), B = readN('ar-B'), T = readN('ar-T'), H = readN('ar-H'),
      delta = readN('ar-delta'), DWT = readN('ar-DWT'), N = readN('ar-N'),
      nt = Math.max(2, Math.round(readN('ar-nt'))), a = readN('ar-a');
    if (![L, B, T, H, DWT, N, a].every(isFinite)) return;

    /* --- 1. шпация --- */
    const a0 = 0.002 * L + 0.48;
    const ar = 4 * a;
    const devi = Math.abs(a - a0) / a0 * 100;
    let o = [];
    o.push(stepRow('a₀ = 0,002·L + 0,48', `0,002·${fmt(L, 1)} + 0,48`, `${fmt(a0, 3)} м`));
    o.push(stepRow('a — утверждённая фактическая шпация (кратно 50 мм)', '', `${fmt(a, 2)} м`));
    o.push(badgeRow(`отклонение от нормальной ${fmt(devi, 1)} % ≤ 25 % и a = ${fmt(a, 2)} м ≤ 1 м — допустимо`,
      devi <= 25 && a <= 1));
    o.push(stepRow('a<sub>р</sub> = 4·a — рамная шпация', `4·${fmt(a, 2)}`, `${fmt(ar, 1)} м`));
    o.push(stepRow('шпация в форпике и ахтерпике — не более 0,6 м; принято', '', '0,60 м'));
    document.getElementById('ar-steps1').innerHTML = o.join('');

    /* --- 2. форпик / ахтерпик / центральная часть --- */
    const aPeak = 0.6;
    const lfp0 = 0.06 * L;
    const lfp = ceilTo(Math.min(lfp0, 10), aPeak);
    const lap0 = 0.15 * Math.pow(L, 0.8);
    const lcch = roundTo(L - lfp - lap0, ar);
    const lap = L - lfp - lcch;
    o = [];
    o.push(stepRow('l<sub>фп</sub> = 0,06·L (диапазон 0,05…0,08·L, но ≤ 10 м)',
      `0,06·${fmt(L, 1)}`, `${fmt(lfp0, 2)} м`));
    o.push(stepRow('l<sub>фп</sub> — кратно шпации форпика 0,6 м', `⌈${fmt(lfp0, 2)}/0,6⌉·0,6`, `${fmt(lfp, 1)} м`));
    o.push(stepRow('l<sub>ап</sub> = 0,15·L<sup>0,8</sup>', `0,15·${fmt(L, 1)}<sup>0,8</sup>`, `${fmt(lap0, 2)} м`));
    o.push(stepRow('l<sub>цч</sub> = L − l<sub>фп</sub> − l<sub>ап</sub> → кратно a<sub>р</sub>',
      `${fmt(L, 1)} − ${fmt(lfp, 1)} − ${fmt(lap0, 2)} = ${fmt(L - lfp - lap0, 2)}`,
      `${fmt(lcch, 1)} м (${fmt(lcch / ar)} рамных шпаций)`));
    o.push(stepRow('l<sub>ап</sub> = L − l<sub>фп</sub> − l<sub>цч</sub> — утверждённая длина ахтерпика',
      `${fmt(L, 1)} − ${fmt(lfp, 1)} − ${fmt(lcch, 1)}`, `${fmt(lap, 1)} м`));
    document.getElementById('ar-steps2').innerHTML = o.join('');

    /* --- 3. МО, двойное дно, двойной борт --- */
    const lmo0 = 0.39 * Math.pow(N, 0.43);
    const lmoLim = 0.15 * L;
    const lmo = ceilTo(Math.min(lmo0, lmoLim), ar);
    const hdd0 = B / 15, hdd = ceilTo(hdd0, 0.1);
    const bdb0 = 0.5 + DWT / 20000;
    const bdb = roundTo(Math.max(bdb0, 0.0855 * B), 0.1);
    o = [];
    o.push(stepRow('l<sub>МО</sub> = 0,39·N<sub>гл</sub><sup>0,43</sup>',
      `0,39·${fmt(N)}<sup>0,43</sup>`, `${fmt(lmo0, 2)} м`));
    o.push(badgeRow(`l<sub>МО</sub> = ${fmt(lmo0, 2)} м ≤ 0,15·L = ${fmt(lmoLim, 2)} м — в допуске`, lmo0 <= lmoLim));
    o.push(stepRow('l<sub>МО</sub> — кратно рамной шпации', `⌈${fmt(lmo0, 2)}/${fmt(ar, 1)}⌉·${fmt(ar, 1)}`,
      `${fmt(lmo, 1)} м (${fmt(lmo / ar)} рамных шпаций)`));
    o.push(stepRow('h<sub>дд</sub> = B/15', `${fmt(B, 1)}/15 = ${fmt(hdd0, 2)}`, `${fmt(hdd, 1)} м`));
    o.push(stepRow('b<sub>дб</sub> = 0,5 + DWT/20 000', `0,5 + ${fmt(DWT)}/20 000 = ${fmt(bdb0, 2)}`,
      `${fmt(bdb, 1)} м (принято конструктивно)`));
    document.getElementById('ar-steps3').innerHTML = o.join('');

    /* --- 4. вспомогательные помещения --- */
    const ltt = ceilTo(0.5 * lmo, ar), btt = ceilTo(0.25 * B, 0.5);
    o = [];
    o.push(stepRow('l<sub>тт</sub> = 0,5·l<sub>МО</sub> → кратно a<sub>р</sub>',
      `0,5·${fmt(lmo, 1)} = ${fmt(0.5 * lmo, 1)}`, `${fmt(ltt, 1)} м`));
    o.push(stepRow('b<sub>тт</sub> = 0,25·B — расстояние между внутренними стенками',
      `0,25·${fmt(B, 1)} = ${fmt(0.25 * B, 2)}`, `${fmt(btt, 1)} м`));
    document.getElementById('ar-steps4').innerHTML = o.join('');

    /* --- 5. трюмы --- */
    const lgr = lcch - lmo;
    const lsr = lgr / nt;
    const l2 = floorTo(lsr, ar);
    const l1 = lgr - (nt - 1) * l2;
    const holds = [l1].concat(Array(nt - 1).fill(l2)); // от носа
    o = [];
    o.push(stepRow('l<sub>гт</sub><sup>ср</sup> = (l<sub>цч</sub> − l<sub>МО</sub>)/n<sub>гт</sub>',
      `(${fmt(lcch, 1)} − ${fmt(lmo, 1)})/${nt}`, `${fmt(lsr, 2)} м`));
    o.push(stepRow(`l<sub>гт2…${nt}</sub> — кратно a<sub>р</sub> (вниз)`,
      `⌊${fmt(lsr, 2)}/${fmt(ar, 1)}⌋·${fmt(ar, 1)}`, `${fmt(l2, 1)} м (${fmt(l2 / ar)} рамных шпаций)`));
    o.push(stepRow('l<sub>гт1</sub> = l<sub>гр</sub> − (n<sub>гт</sub>−1)·l<sub>гт2</sub> — носовой трюм',
      `${fmt(lgr, 1)} − ${nt - 1}·${fmt(l2, 1)}`, `${fmt(l1, 1)} м (${fmt(l1 / ar)} рамных шпаций)`));
    document.getElementById('ar-steps5').innerHTML = o.join('');

    /* --- 6. палубные сооружения --- */
    const lk = floorTo(0.8 * l2, ar), bk = B - 2 * bdb, hk = 2.0;
    const hp0 = B / 50;
    const lb = floorTo(0.08 * L, aPeak);
    const lks = roundTo(0.035 * L, 0.5);
    const tierTop = ceilTo(0.05 * L, ar);
    const tierMid = lap + lks + ar;
    const lyut = lks + ceilTo(0.15 * L, ar);
    o = [];
    o.push(stepRow('l<sub>к</sub> = 0,8·l<sub>гт</sub> → кратно a<sub>р</sub>',
      `0,8·${fmt(l2, 1)} = ${fmt(0.8 * l2, 2)}`, `${fmt(lk, 1)} м`));
    o.push(stepRow('b<sub>к</sub> = B − 2·b<sub>дб</sub>', `${fmt(B, 1)} − 2·${fmt(bdb, 1)}`, `${fmt(bk, 1)} м`));
    o.push(stepRow('h<sub>к</sub> — высота комингса', '', `${fmt(hk, 1)} м`));
    o.push(stepRow('h<sub>п</sub> = B/50 — погибь бимса', `${fmt(B, 1)}/50 = ${fmt(hp0, 2)}`,
      `${fmt(hp0, 2)} м (в проекте принято 0,6 м)`));
    o.push(stepRow('l<sub>б</sub> = 0,08·L → кратно шпации 0,6 м — бак',
      `0,08·${fmt(L, 1)} = ${fmt(0.08 * L, 2)}`, `${fmt(lb, 1)} м`));
    o.push(stepRow('L<sub>кс</sub> = 0,035·L — кормовой свес', `0,035·${fmt(L, 1)}`, `${fmt(lks, 1)} м`));
    o.push(stepRow('l<sub>ю</sub> = L<sub>кс</sub> + 0,15·L↑ — ют (нижний ярус)',
      `${fmt(lks, 1)} + ${fmt(lyut - lks, 1)}`,
      `${fmt(lyut, 1)} м (статистически 0,15…0,25·L = ${fmt(0.15 * L, 1)}…${fmt(0.25 * L, 1)} м)`));
    o.push(stepRow('средний ярус', `l<sub>ап</sub> + L<sub>кс</sub> + a<sub>р</sub>`, `${fmt(tierMid, 1)} м`));
    o.push(stepRow('верхний ярус = 0,05…0,06·L↑', `⌈0,05·${fmt(L, 1)}⌉<sub>aр</sub>`, `${fmt(tierTop, 1)} м`));
    document.getElementById('ar-steps6').innerHTML = o.join('');

    /* --- 7. центр величины --- */
    const xbar = 0.12 * (delta - 0.63);
    const xlo = (xbar - 0.01) * L, xhi = (xbar + 0.01) * L;
    o = [];
    o.push(stepRow('x̄<sub>c</sub> = 0,12·(δ − 0,63)', `0,12·(${fmt(delta, 3)} − 0,63)`, fmt(xbar, 4)));
    o.push(stepRow('x<sub>c</sub> = x̄<sub>c</sub>·L ± 0,01·L — допустимый диапазон',
      `(${fmt(xbar, 4)} ± 0,01)·${fmt(L, 1)}`, `${fmt(xlo, 2)} … ${fmt(xhi, 2)} м`));
    o.push(stepRow('x<sub>c</sub> — принято по удифферентовке (x<sub>c</sub> = x<sub>g</sub>)', '',
      `${fmt(Math.max(xlo, Math.min(xhi, 0.286)), 3)} м в нос от миделя`));
    document.getElementById('ar-steps7').innerHTML = o.join('');

    /* --- чертежи --- */
    const p = {
      L, B, T, H, lap, lmo, lfp, holds, hdd, bdb,
      lbak: lb, hb: 2.7, lyut: lyut - lks, tiers: [tierMid, tierTop],
      a, ar, hk, bk, dims: true, combs: true,
    };
    SD.drawSide(document.getElementById('ar-side'), p);
    SD.drawPlan(document.getElementById('ar-plan'), p);

    /* --- таблица отсеков --- */
    const nFp = Math.round(lfp / aPeak);
    const rows = [];
    rows.push(['Форпик (балласт)', 0, lfp, `0 – ${nFp}`, lfp, `${fmt(nFp)} шпаций по 0,6 м`]);
    let x = lfp, sh = nFp;
    holds.forEach((lh, i) => {
      const sh2 = sh + Math.round(lh / a);
      rows.push([`Трюм ${i + 1}${i === 0 ? ' (носовой)' : ''}`, x, x + lh, `${sh} – ${sh2}`, lh,
        `${fmt(lh / ar)} рамных шпаций`]);
      x += lh; sh = sh2;
    });
    const shMo = sh + Math.round(lmo / a);
    rows.push(['Машинное отделение', x, x + lmo, `${sh} – ${shMo}`, lmo, `${fmt(lmo / ar)} рамных шпаций`]);
    x += lmo;
    rows.push(['Ахтерпик (балласт)', x, L, `${shMo} – КП`, L - x, 'шпация 0,6 м']);
    let h = `<tr><th>Отсек</th><th>от НП, м</th><th>до НП, м</th><th>шпангоуты</th>
      <th>длина, м</th><th>кратность</th></tr>`;
    rows.forEach(r => {
      h += `<tr><td style="text-align:left">${r[0]}</td><td>${fmt(r[1], 1)}</td><td>${fmt(r[2], 1)}</td>
        <td>${r[3]}</td><td style="font-weight:700">${fmt(r[4], 1)}</td><td>${r[5]}</td></tr>`;
    });
    h += `<tr style="background:#eef3ff;font-weight:700"><td style="text-align:left">Итого</td>
      <td>0</td><td>${fmt(L, 1)}</td><td>—</td><td>${fmt(L, 1)}</td><td>L между перпендикулярами</td></tr>`;
    document.getElementById('ar-table').innerHTML = h;
    document.getElementById('ar-table-cap').innerHTML =
      `Нулевая точка отсчёта практических шпаций — носовой перпендикуляр (по методике);
       в форпике шпация 0,6 м (${fmt(nFp)} шпаций укладываются ровно), в средней части — ${fmt(a, 2)} м,
       поэтому все переборки грузовой части попадают на целые практические шпангоуты.
       Ахтерпик длиной ${fmt(L - x, 1)} м набирается шпациями 0,6 м от переборки к корме.`;
  }

  document.addEventListener('input', e => {
    if (e.target && e.target.type === 'number') calc();
  });
  calc();
})();
