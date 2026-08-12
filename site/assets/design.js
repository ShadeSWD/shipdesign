/* Расчёт «первое приближение по судам-аналогам» + уравнение нагрузки. */
'use strict';

/* ---------- утилиты ---------- */
function fmt(v, d = 0) {
  if (!isFinite(v)) return '—';
  return v.toLocaleString('ru-RU', { minimumFractionDigits: d, maximumFractionDigits: d });
}
function stepRow(f, sub, res) {
  return `<div style="margin:6px 0;font:14.5px system-ui"><span style="color:#3a3a42">${f}</span>` +
    (sub ? ` = <span style="color:#6b6b74">${sub}</span>` : '') + ` = <b>${res}</b></div>`;
}
function numCell(val, id, step) {
  return `<td><input type="number" step="${step || 'any'}" value="${val}" id="${id}" ` +
    `style="width:84px;font:14px ui-monospace,monospace;border:1px solid #d8d6cf;border-radius:6px;padding:3px 5px"></td>`;
}
function readN(id) { return parseFloat(document.getElementById(id).value); }
function cbrt(x) { return Math.cbrt(x); }

/* ================= Блок 1: первое приближение (задача 1.15) ================= */
const A1 = [
  { D: 12100, P: 7502, L: 138.3, B: 18.4, T: 6.4, d: 0.72, v: 14, N: 3363 },
  { D: 14100, P: 8742, L: 152.2, B: 20.3, T: 6.3, d: 0.70, v: 16, N: 5560 },
  { D: 16100, P: 9982, L: 165.4, B: 22.1, T: 5.8, d: 0.74, v: 18, N: 8648 },
];
const A1_KEYS = ['D', 'P', 'L', 'B', 'T', 'd', 'v', 'N'];

function buildTable1() {
  const head = ['№', 'D₀, т', 'Р<sub>гр0</sub>, т', 'L₀, м', 'B₀, м', 'T₀, м',
    'δ₀', 'v₀, уз', 'N₀, кВт'];
  let h = `<tr>${head.map(x => `<th>${x}</th>`).join('')}</tr>`;
  A1.forEach((r, i) => {
    h += `<tr><td>${i + 1}</td>` +
      A1_KEYS.map(k => numCell(r[k], `a1-${i}-${k}`)).join('') + '</tr>';
  });
  document.getElementById('an1-table').innerHTML = h;
}

function calc1() {
  const rows = A1.map((_, i) => {
    const o = {};
    A1_KEYS.forEach(k => o[k] = readN(`a1-${i}-${k}`));
    o.mu = o.P / o.D;
    o.c = o.L / (cbrt(o.v) * cbrt(o.D));
    o.lb = o.L / o.B;
    o.Ca = Math.pow(o.D, 2 / 3) * Math.pow(o.v, 3) / o.N;
    return o;
  });
  const avg = k => rows.reduce((s, r) => s + r[k], 0) / rows.length;
  const mu = avg('mu'), c = avg('c'), lb = avg('lb'), dd = avg('d'), Ca = avg('Ca');

  // таблица измерителей
  let h = `<tr><th>№</th><th>μ = Р<sub>гр</sub>/D</th>
    <th>c = L/(v<sup>⅓</sup>D<sup>⅓</sup>)</th><th>L/B</th><th>δ</th>
    <th>C<sub>a</sub> = D<sup>⅔</sup>v³/N</th></tr>`;
  rows.forEach((r, i) => {
    h += `<tr><td>${i + 1}</td><td>${fmt(r.mu, 3)}</td><td>${fmt(r.c, 3)}</td>
      <td>${fmt(r.lb, 3)}</td><td>${fmt(r.d, 2)}</td><td>${fmt(r.Ca, 1)}</td></tr>`;
  });
  h += `<tr style="background:#eef3ff;font-weight:700"><td>ср.</td><td>${fmt(mu, 3)}</td>
    <td>${fmt(c, 3)}</td><td>${fmt(lb, 3)}</td><td>${fmt(dd, 2)}</td><td>${fmt(Ca, 1)}</td></tr>`;
  document.getElementById('meas1-table').innerHTML = h;

  // проект
  const P = readN('p1-P'), v = readN('p1-v'), rho = readN('p1-rho');
  const D = P / mu;
  const L = c * cbrt(v) * cbrt(D);
  const B = L / lb;
  const T = D / (rho * dd * L * B);
  const N = Math.pow(D, 2 / 3) * Math.pow(v, 3) / Ca;

  const o = [];
  o.push(stepRow('D = Р<sub>гр</sub>/μ', `${fmt(P)}/${fmt(mu, 3)}`, `${fmt(D)} т`));
  o.push(stepRow('L = c·v<sup>⅓</sup>·D<sup>⅓</sup>',
    `${fmt(c, 3)}·${fmt(v, 1)}<sup>⅓</sup>·${fmt(D)}<sup>⅓</sup>`, `${fmt(L, 1)} м`));
  o.push(stepRow('B = L/(L/B)', `${fmt(L, 1)}/${fmt(lb, 3)}`, `${fmt(B, 1)} м`));
  o.push(stepRow('δ = δ<sub>ср</sub>', '', `${fmt(dd, 2)}`));
  o.push(stepRow('T = D/(ρ·δ·L·B)',
    `${fmt(D)}/(${fmt(rho, 3)}·${fmt(dd, 2)}·${fmt(L, 1)}·${fmt(B, 1)})`, `${fmt(T, 2)} м`));
  o.push(stepRow('N = D<sup>⅔</sup>·v³/C<sub>a</sub>',
    `${fmt(D)}<sup>⅔</sup>·${fmt(v, 1)}³/${fmt(Ca, 1)}`, `${fmt(N)} кВт`));
  document.getElementById('steps1').innerHTML = o.join('');

  window.SOLVER1 = { mu, c, lb, d: dd, Ca, D, L, B, T, N };
}

/* ================= Блок 2: уравнение нагрузки (задача 2.15) ================= */
const A2 = [
  { D: 11900, P: 7973, Pk: 2023, Pob: 476, Pseu: 863, Psez: 388, Pzv: 77, Psn: 100, N: 3450, v: 12, R: 4500 },
  { D: 12900, P: 8643, Pk: 2193, Pob: 516, Pseu: 913, Psez: 421, Pzv: 114, Psn: 100, N: 3650, v: 13, R: 5000 },
  { D: 13900, P: 9313, Pk: 2363, Pob: 556, Pseu: 963, Psez: 454, Pzv: 152, Psn: 100, N: 3850, v: 14, R: 5500 },
];
const A2_KEYS = ['D', 'P', 'Pk', 'Pob', 'Pseu', 'Psez', 'Pzv', 'Psn', 'N', 'v', 'R'];

function buildTable2() {
  const head = ['№', 'D₀, т', 'Р<sub>гр0</sub>', 'Р<sub>к0</sub>', 'Р<sub>об0</sub>',
    'Р<sub>сэу0</sub>', 'Р<sub>сэз0</sub>', 'Р<sub>зв0</sub>', 'Р<sub>сн0</sub>',
    'N₀, кВт', 'v₀, уз', 'R₀, миль'];
  let h = `<tr>${head.map(x => `<th>${x}</th>`).join('')}</tr>`;
  A2.forEach((r, i) => {
    h += `<tr><td>${i + 1}</td>` +
      A2_KEYS.map(k => numCell(r[k], `a2-${i}-${k}`)).join('') + '</tr>';
  });
  document.getElementById('an2-table').innerHTML = h;
}

function calc2() {
  const rows = A2.map((_, i) => {
    const o = {};
    A2_KEYS.forEach(k => o[k] = readN(`a2-${i}-${k}`));
    o.mu = o.P / o.D;
    o.pk = o.Pk / o.D;
    o.pob = o.Pob / o.D;
    o.pseu = o.Pseu / o.N;
    o.psez = o.Psez * o.v / (o.N * o.R);
    o.Ca = Math.pow(o.D, 2 / 3) * Math.pow(o.v, 3) / o.N;
    return o;
  });
  const avg = k => rows.reduce((s, r) => s + r[k], 0) / rows.length;
  const mu = avg('mu'), pk = avg('pk'), pob = avg('pob'), pseu = avg('pseu'),
    psez = avg('psez'), Ca = avg('Ca');

  let h = `<tr><th>№</th><th>μ = Р<sub>гр</sub>/D</th><th>p<sub>к</sub> = Р<sub>к</sub>/D</th>
    <th>p<sub>об</sub> = Р<sub>об</sub>/D</th><th>p<sub>сэу</sub> = Р<sub>сэу</sub>/N</th>
    <th>p<sub>сэз</sub> = Р<sub>сэз</sub>·v/(N·R)</th><th>C<sub>a</sub></th></tr>`;
  rows.forEach((r, i) => {
    h += `<tr><td>${i + 1}</td><td>${fmt(r.mu, 3)}</td><td>${fmt(r.pk, 3)}</td>
      <td>${fmt(r.pob, 3)}</td><td>${fmt(r.pseu, 4)}</td><td>${r.psez.toExponential(3).replace('.', ',').replace('e-4', '·10⁻⁴')}</td>
      <td>${fmt(r.Ca, 1)}</td></tr>`;
  });
  h += `<tr style="background:#eef3ff;font-weight:700"><td>ср.</td><td>${fmt(mu, 3)}</td>
    <td>${fmt(pk, 3)}</td><td>${fmt(pob, 3)}</td><td>${fmt(pseu, 4)}</td>
    <td>${psez.toExponential(3).replace('.', ',').replace('e-4', '·10⁻⁴')}</td><td>${fmt(Ca, 1)}</td></tr>`;
  document.getElementById('meas2-table').innerHTML = h;

  const P = readN('p2-P'), v = readN('p2-v'), R = readN('p2-R'),
    A = readN('p2-A'), n = readN('p2-n');
  const D = P / mu;
  const N = Math.pow(D, 2 / 3) * Math.pow(v, 3) / Ca;
  const Psez = psez * N * R / v;
  const Psn = 0.12 * n + 0.15 * n * A + 0.003 * n * A + 20;
  const DWT = P + Psez + Psn;
  const Pk = pk * D, Pob = pob * D, Pseu = pseu * N;

  const o = [];
  o.push(stepRow('D = Р<sub>гр</sub>/μ', `${fmt(P)}/${fmt(mu, 3)}`, `${fmt(D)} т`));
  o.push(stepRow('N = D<sup>⅔</sup>·v³/C<sub>a</sub>',
    `${fmt(D)}<sup>⅔</sup>·${fmt(v, 1)}³/${fmt(Ca, 1)}`, `${fmt(N)} кВт`));
  o.push(stepRow('Р<sub>к</sub> = p<sub>к</sub>·D', `${fmt(pk, 3)}·${fmt(D)}`, `${fmt(Pk)} т`));
  o.push(stepRow('Р<sub>об</sub> = p<sub>об</sub>·D', `${fmt(pob, 3)}·${fmt(D)}`, `${fmt(Pob)} т`));
  o.push(stepRow('Р<sub>сэу</sub> = p<sub>сэу</sub>·N', `${fmt(pseu, 4)}·${fmt(N)}`, `${fmt(Pseu)} т`));
  o.push(stepRow('Р<sub>сэз</sub> = p<sub>сэз</sub>·N·R/v',
    `${psez.toExponential(3).replace('.', ',').replace('e-4', '·10⁻⁴')}·${fmt(N)}·${fmt(R)}/${fmt(v, 1)}`,
    `${fmt(Psez)} т`));
  o.push(stepRow('Р<sub>сн</sub> = 0,12·n<sub>эк</sub> + (0,15 + 0,003)·n<sub>эк</sub>·A + 20',
    `0,12·${n} + 0,153·${n}·${A} + 20`, `${fmt(Psn, 1)} т`));
  o.push(stepRow('DWT = Р<sub>гр</sub> + Р<sub>сэз</sub> + Р<sub>сн</sub>',
    `${fmt(P)} + ${fmt(Psez)} + ${fmt(Psn, 1)}`, `${fmt(DWT)} т`));
  document.getElementById('steps2').innerHTML = o.join('');

  window.SOLVER2 = { mu, pk, pob, pseu, psez, Ca, D, N, Psez, Psn, DWT };
}

/* ============ Блок 3: второе приближение (курсовая цепочка) ============ */
function expFmt(x) {
  if (!isFinite(x)) return '—';
  return x.toExponential(3).replace('.', ',')
    .replace(/e-(\d+)/, (_, p) => `·10⁻${'⁰¹²³⁴⁵⁶⁷⁸⁹'.split('')[+p] || p}`);
}
function badgeRow(text, ok) {
  return `<div style="margin:8px 0"><span class="badge ${ok ? 'ok' : 'bad'}">${text}</span></div>`;
}

function calc3() {
  const g = id => readN('c3-' + id);
  const D0 = g('D0'), L0 = g('L0'), B0 = g('B0'), T0 = g('T0'), H0 = g('H0'),
    Pst0 = g('Pst0'), Pob0 = g('Pob0'), Pseu0 = g('Pseu0'), Psez0 = g('Psez0'),
    N0 = g('N0'), u0 = g('u0'), R0 = g('R0');
  const Pgr = g('Pgr'), u = g('u'), R = g('R'), nek = g('nek'), A = g('A'), Pinv = g('Pinv');
  const D1 = g('D1'), L1 = g('L1'), B1 = g('B1'), T1 = g('T1'), H1 = g('H1'),
    k = g('k'), rho = g('rho'), pzv = g('pzv');

  // измерители прототипа
  const pseu = Pseu0 / N0;
  const psez = Psez0 * u0 / (N0 * R0);
  const Ca = Math.pow(D0, 2 / 3) * Math.pow(u0, 3) / N0;
  const d0 = (D0 / rho) / (L0 * B0 * T0);
  const gst = Pst0 / (cbrt(d0) * Math.pow(L0, 1.5) * B0 * Math.sqrt(H0));
  const gob = Pob0 / Math.pow(L0 * B0 * H0, 2 / 3);
  // зависящие от D1 статьи первого приближения
  const d1 = D1 / (k * rho * L1 * B1 * T1);
  const N1 = Math.pow(D1, 2 / 3) * Math.pow(u, 3) / Ca;
  const Pseu1 = pseu * N1;
  const Psez1 = psez * N1 * R / u;
  const Pzv1 = pzv * D1;
  const Psn = 0.12 * nek + 0.003 * nek * A + 0.15 * nek * A + Pinv;
  // уточнение массы корпуса
  const Pst2 = gst * cbrt(d1) * Math.pow(L1, 1.5) * B1 * Math.sqrt(H1);
  const Pob2 = gob * Math.pow(L1 * B1 * H1, 2 / 3);
  const Pkob2 = Pst2 + Pob2;
  const As1 = Pkob2 + Pseu1 + Psez1 + Pzv1 + Psn + Pgr;
  const dP = As1 - D1, thr = 0.5 * Pzv1;
  const need = Math.abs(dP) > thr;
  const eta = 1 / (1 - Pkob2 / D1 - 2 * (Pseu1 + Psez1) / (3 * D1));
  const dD = need ? eta * dP : 0;
  const D2 = D1 + dD;
  const lam = cbrt(D2 / D1);
  const L2 = lam * L1, B2 = lam * B1, T2 = lam * T1, H2 = H1 / (lam * lam);
  const Pseu2 = Pseu1 * lam * lam, Psez2 = Psez1 * lam * lam;
  // контрольный пересчёт нагрузки на новых размерениях
  const Pst3 = gst * cbrt(d1) * Math.pow(L2, 1.5) * B2 * Math.sqrt(H2);
  const Pob3 = gob * Math.pow(L2 * B2 * H2, 2 / 3);
  const Pkob3 = Pst3 + Pob3;
  const As2 = Pkob3 + Pseu2 + Psez2 + Pzv1 + Psn + Pgr;

  const o = [];
  o.push('<div style="font:600 14px system-ui;margin:4px 0">Измерители по прототипу</div>');
  o.push(stepRow('δ<sub>0</sub> = D₀/(ρ·L₀·B₀·T₀)',
    `${fmt(D0)}/(${fmt(rho, 3)}·${fmt(L0, 1)}·${fmt(B0, 1)}·${fmt(T0, 2)})`, fmt(d0, 3)));
  o.push(stepRow('g<sub>ст</sub> = Р<sub>ст0</sub>/(δ<sub>0</sub><sup>⅓</sup>·L₀<sup>3/2</sup>·B₀·√H₀)',
    `${fmt(Pst0)}/(${fmt(d0, 3)}<sup>⅓</sup>·${fmt(L0, 1)}<sup>3/2</sup>·${fmt(B0, 1)}·√${fmt(H0, 1)})`,
    fmt(gst, 4)));
  o.push(stepRow('g<sub>об</sub> = Р<sub>об0</sub>/(L₀·B₀·H₀)<sup>⅔</sup>',
    `${fmt(Pob0)}/(${fmt(L0, 1)}·${fmt(B0, 1)}·${fmt(H0, 1)})<sup>⅔</sup>`, fmt(gob, 3)));
  o.push(stepRow('p<sub>сэу</sub> = Р<sub>сэу0</sub>/N₀', `${fmt(Pseu0)}/${fmt(N0)}`, fmt(pseu, 4) + ' т/кВт'));
  o.push(stepRow('p<sub>сэз</sub> = Р<sub>сэз0</sub>·u₀/(N₀·R₀)',
    `${fmt(Psez0)}·${fmt(u0, 1)}/(${fmt(N0)}·${fmt(R0)})`, expFmt(psez)));
  o.push(stepRow('C<sub>a</sub> = D₀<sup>⅔</sup>·u₀³/N₀',
    `${fmt(D0)}<sup>⅔</sup>·${fmt(u0, 1)}³/${fmt(N0)}`, fmt(Ca, 1)));
  o.push('<div style="font:600 14px system-ui;margin:10px 0 4px">Статьи нагрузки первого приближения</div>');
  o.push(stepRow('δ₁ = D₁/(k·ρ·L₁·B₁·T₁)',
    `${fmt(D1)}/(${fmt(k, 3)}·${fmt(rho, 3)}·${fmt(L1, 1)}·${fmt(B1, 2)}·${fmt(T1, 2)})`, fmt(d1, 3)));
  o.push(stepRow('N₁ = D₁<sup>⅔</sup>·u³/C<sub>a</sub>',
    `${fmt(D1)}<sup>⅔</sup>·${fmt(u, 1)}³/${fmt(Ca, 1)}`, `${fmt(N1)} кВт`));
  o.push(stepRow('Р<sub>сэу1</sub> = p<sub>сэу</sub>·N₁', `${fmt(pseu, 4)}·${fmt(N1)}`, `${fmt(Pseu1)} т`));
  o.push(stepRow('Р<sub>сэз1</sub> = p<sub>сэз</sub>·N₁·R/u',
    `${expFmt(psez)}·${fmt(N1)}·${fmt(R)}/${fmt(u, 1)}`, `${fmt(Psez1)} т`));
  o.push(stepRow('Р<sub>зв1</sub> = p<sub>зв</sub>·D₁', `${fmt(pzv, 3)}·${fmt(D1)}`, `${fmt(Pzv1)} т`));
  o.push(stepRow('Р<sub>эк.сн</sub> = 0,12·n<sub>эк</sub> + (0,003 + 0,15)·n<sub>эк</sub>·A + Р<sub>инв</sub>',
    `0,12·${fmt(nek)} + 0,153·${fmt(nek)}·${fmt(A)} + ${fmt(Pinv)}`, `${fmt(Psn, 1)} т`));
  o.push('<div style="font:600 14px system-ui;margin:10px 0 4px">Уточнение массы корпуса</div>');
  o.push(stepRow('Р<sub>ст2</sub> = g<sub>ст</sub>·δ₁<sup>⅓</sup>·L₁<sup>3/2</sup>·B₁·√H₁',
    `${fmt(gst, 4)}·${fmt(d1, 3)}<sup>⅓</sup>·${fmt(L1, 1)}<sup>3/2</sup>·${fmt(B1, 2)}·√${fmt(H1, 2)}`,
    `${fmt(Pst2)} т`));
  o.push(stepRow('Р<sub>об2</sub> = g<sub>об</sub>·(L₁·B₁·H₁)<sup>⅔</sup>',
    `${fmt(gob, 3)}·(${fmt(L1, 1)}·${fmt(B1, 2)}·${fmt(H1, 2)})<sup>⅔</sup>`, `${fmt(Pob2)} т`));
  o.push(stepRow('Р<sub>коб2</sub> = Р<sub>ст2</sub> + Р<sub>об2</sub>',
    `${fmt(Pst2)} + ${fmt(Pob2)}`, `${fmt(Pkob2)} т`));
  o.push(stepRow('A₁ = Р<sub>коб2</sub> + Р<sub>сэу1</sub> + Р<sub>сэз1</sub> + Р<sub>зв1</sub> + Р<sub>эк.сн</sub> + Р<sub>гр</sub>',
    `${fmt(Pkob2)} + ${fmt(Pseu1)} + ${fmt(Psez1)} + ${fmt(Pzv1)} + ${fmt(Psn, 1)} + ${fmt(Pgr)}`,
    `${fmt(As1)} т`));
  o.push(stepRow('dP = A₁ − D₁', `${fmt(As1)} − ${fmt(D1)}`, `${fmt(dP)} т`));
  o.push(badgeRow(need
    ? `|dP| = ${fmt(Math.abs(dP))} т &gt; 0,5·Р<sub>зв1</sub> = ${fmt(thr, 1)} т — нужна корректировка водоизмещения и размерений`
    : `|dP| = ${fmt(Math.abs(dP))} т ≤ 0,5·Р<sub>зв1</sub> = ${fmt(thr, 1)} т — достаточно скорректировать запас водоизмещения`,
    !need));
  if (need) {
    o.push('<div style="font:600 14px system-ui;margin:10px 0 4px">Корректировка по Норману</div>');
    o.push(stepRow('η<sub>н</sub> = 1/(1 − Р<sub>коб2</sub>/D₁ − 2·(Р<sub>сэу1</sub> + Р<sub>сэз1</sub>)/(3·D₁))',
      `1/(1 − ${fmt(Pkob2)}/${fmt(D1)} − 2·(${fmt(Pseu1)} + ${fmt(Psez1)})/(3·${fmt(D1)}))`,
      fmt(eta, 2)));
    o.push(stepRow('dD = η<sub>н</sub>·dP', `${fmt(eta, 2)}·${fmt(dP)}`, `${fmt(dD)} т`));
  }
  o.push(stepRow('D₂ = D₁ + dD', `${fmt(D1)} + ${fmt(dD)}`, `${fmt(D2)} т`));
  o.push(stepRow('λ = ∛(D₂/D₁)', `∛(${fmt(D2)}/${fmt(D1)})`, fmt(lam, 3)));
  o.push('<div style="font:600 14px system-ui;margin:10px 0 4px">Аффинное преобразование размерений</div>');
  o.push(stepRow('L₂ = λ·L₁', `${fmt(lam, 3)}·${fmt(L1, 1)}`, `${fmt(L2)} м`));
  o.push(stepRow('B₂ = λ·B₁', `${fmt(lam, 3)}·${fmt(B1, 2)}`, `${fmt(B2, 1)} м`));
  o.push(stepRow('T₂ = λ·T₁', `${fmt(lam, 3)}·${fmt(T1, 2)}`, `${fmt(T2, 1)} м`));
  o.push(stepRow('H₂ = H₁/λ²', `${fmt(H1, 2)}/${fmt(lam, 3)}²`, `${fmt(H2, 1)} м`));
  o.push(stepRow('Р<sub>сэу2</sub> = Р<sub>сэу1</sub>·λ²', `${fmt(Pseu1)}·${fmt(lam, 3)}²`, `${fmt(Pseu2)} т`));
  o.push(stepRow('Р<sub>сэз2</sub> = Р<sub>сэз1</sub>·λ²', `${fmt(Psez1)}·${fmt(lam, 3)}²`, `${fmt(Psez2)} т`));
  o.push('<div style="font:600 14px system-ui;margin:10px 0 4px">Контроль на новых размерениях</div>');
  o.push(stepRow('Р<sub>коб3</sub> = g<sub>ст</sub>·δ<sup>⅓</sup>·L₂<sup>3/2</sup>·B₂·√H₂ + g<sub>об</sub>·(L₂·B₂·H₂)<sup>⅔</sup>',
    `${fmt(Pst3)} + ${fmt(Pob3)}`, `${fmt(Pkob3)} т`));
  o.push(stepRow('A₂ = Р<sub>коб3</sub> + Р<sub>сэу2</sub> + Р<sub>сэз2</sub> + Р<sub>зв1</sub> + Р<sub>эк.сн</sub> + Р<sub>гр</sub>',
    `${fmt(Pkob3)} + ${fmt(Pseu2)} + ${fmt(Psez2)} + ${fmt(Pzv1)} + ${fmt(Psn, 1)} + ${fmt(Pgr)}`,
    `${fmt(As2)} т`));
  o.push(stepRow('A₂ − D₂', `${fmt(As2)} − ${fmt(D2)}`, `${fmt(As2 - D2)} т`));
  document.getElementById('steps3').innerHTML = o.join('');

  window.COURSE = { pseu, psez, Ca, gst, gob, d1, D1, D2, lam, eta,
    L2, B2, T2, H2, Pseu2, Psez2, Pkob3, Pzv1, Psn, Pgr, R, u, k, rho };
}

/* ============ Блок 4: третье приближение — мощность и двигатель ============ */
function calc4() {
  const C = window.COURSE;
  if (!C) return;
  const modeEl = document.querySelector('input[name="p4-mode"]:checked');
  const mode = modeEl ? modeEl.value : 'pe';
  document.getElementById('p4-PE').disabled = mode !== 'pe';
  document.getElementById('p4-c').disabled = mode !== 'papmel';
  const eta0 = readN('p4-eta'), zap = readN('p4-z'), step = readN('p4-s');

  const o = [];
  let PE;
  if (mode === 'pe') {
    PE = readN('p4-PE');
    o.push(stepRow('P<sub>E</sub> = R<sub>т</sub>·v — буксировочная мощность по Холтропу–Меннену (задана)',
      '', `${fmt(PE)} кВт`));
  } else {
    const V2 = C.D2 / (C.k * C.rho);
    const psi = 10 * C.d1 * C.B2 / C.L2;
    const lamP = C.L2 < 100 ? 0.7 + 0.3 * Math.sqrt(0.01 * C.L2) : 1;
    const x = 1;
    const vP = C.u * Math.sqrt(psi / C.L2);
    const cP = readN('p4-c');
    PE = 0.736 * (V2 * Math.pow(C.u, 3) / (cP * C.L2)) * Math.sqrt(psi) / lamP * x;
    o.push(stepRow('V₂ = D₂/(k·ρ)', `${fmt(C.D2)}/(${fmt(C.k, 3)}·${fmt(C.rho, 3)})`, `${fmt(V2)} м³`));
    o.push(stepRow('ψ<sub>к</sub> = 10·δ·B₂/L₂',
      `10·${fmt(C.d1, 3)}·${fmt(C.B2, 1)}/${fmt(C.L2, 1)}`, fmt(psi, 3)));
    o.push(stepRow('λ<sub>п</sub> = 0,7 + 0,3·√(0,01·L₂) при L &lt; 100 м, иначе 1', '', fmt(lamP, 3)));
    o.push(stepRow("v′ = u·√(ψ<sub>к</sub>/L₂) — аргумент диаграммы c(v′, ψ<sub>к</sub>)",
      `${fmt(C.u, 1)}·√(${fmt(psi, 3)}/${fmt(C.L2, 1)})`, fmt(vP, 2)));
    o.push(stepRow('P<sub>E</sub> = 0,736·V₂·u³/(c<sub>П</sub>·L₂)·√ψ<sub>к</sub>/λ<sub>п</sub>',
      `0,736·${fmt(V2)}·${fmt(C.u, 1)}³/(${fmt(cP, 1)}·${fmt(C.L2, 1)})·√${fmt(psi, 3)}/${fmt(lamP, 3)}`,
      `${fmt(PE)} кВт`));
  }
  const Nmin = PE / eta0;
  const Ntr = (1 + zap / 100) * Nmin;
  const Ngl = Math.ceil(Ntr / step) * step;
  const Pseu3 = C.pseu * Ngl;
  const Psez3 = C.psez * Ngl * C.R / C.u;
  const dSeu = Pseu3 - C.Pseu2, dSez = Psez3 - C.Psez2;
  const dP3 = dSeu + dSez, thr = 0.5 * C.Pzv1;
  const dD3 = C.eta * dP3;
  const D3 = C.D2 + dD3;

  o.push(stepRow('N<sub>min</sub> = P<sub>E</sub>/η', `${fmt(PE)}/${fmt(eta0, 2)}`, `${fmt(Nmin)} кВт`));
  o.push(stepRow(`N<sub>тр</sub> = ${fmt(1 + zap / 100, 2)}·N<sub>min</sub>`,
    `${fmt(1 + zap / 100, 2)}·${fmt(Nmin)}`, `${fmt(Ntr)} кВт`));
  o.push(stepRow(`N<sub>гл</sub> — вверх до ступени каталога ${fmt(step)} кВт`,
    `⌈${fmt(Ntr)}/${fmt(step)}⌉·${fmt(step)}`, `${fmt(Ngl)} кВт`));
  o.push(stepRow('Р<sub>сэу3</sub> = p<sub>сэу</sub>·N<sub>гл</sub>',
    `${fmt(C.pseu, 4)}·${fmt(Ngl)}`, `${fmt(Pseu3)} т`));
  o.push(stepRow('Р<sub>сэз3</sub> = p<sub>сэз</sub>·N<sub>гл</sub>·R/u',
    `${expFmt(C.psez)}·${fmt(Ngl)}·${fmt(C.R)}/${fmt(C.u, 1)}`, `${fmt(Psez3)} т`));
  o.push(stepRow('ΔР<sub>сэу</sub> = Р<sub>сэу3</sub> − Р<sub>сэу2</sub>',
    `${fmt(Pseu3, 1)} − ${fmt(C.Pseu2, 1)}`, `${fmt(dSeu, 1)} т`));
  o.push(stepRow('ΔР<sub>сэз</sub> = Р<sub>сэз3</sub> − Р<sub>сэз2</sub>',
    `${fmt(Psez3, 1)} − ${fmt(C.Psez2, 1)}`, `${fmt(dSez, 1)} т`));
  o.push(stepRow('dD = η<sub>н</sub>·(ΔР<sub>сэу</sub> + ΔР<sub>сэз</sub>)',
    `${fmt(C.eta, 2)}·(${fmt(dSeu, 1)} + ${fmt(dSez, 1)})`, `${fmt(dD3, 1)} т`));
  o.push(stepRow('D₃ = D₂ + dD', `${fmt(C.D2)} + ${fmt(dD3, 1)}`, `${fmt(D3)} т`));
  const ok = Math.abs(dP3) <= thr;
  o.push(badgeRow(ok
    ? `|ΔР| = ${fmt(Math.abs(dP3), 1)} т ≤ 0,5·Р<sub>зв</sub> = ${fmt(thr, 1)} т — корректировка размерений не требуется`
    : `|ΔР| = ${fmt(Math.abs(dP3), 1)} т &gt; 0,5·Р<sub>зв</sub> = ${fmt(thr, 1)} т — нужен ещё виток уточнения размерений`,
    ok));
  document.getElementById('steps4').innerHTML = o.join('');

  window.COURSE3 = { PE, Nmin, Ntr, Ngl, Pseu3, Psez3, D3, ok };
}

/* ============ Итоговая таблица «Эскизные характеристики судна» ============ */
function renderFinal() {
  const C = window.COURSE, F = window.COURSE3;
  if (!C || !F) return;
  const DWT = C.Pgr + F.Psez3 + C.Psn;
  const rows = [
    ['Водоизмещение D₃, т', fmt(F.D3)],
    ['Длина L, м', fmt(C.L2)],
    ['Ширина B, м', fmt(C.B2, 1)],
    ['Осадка T, м', fmt(C.T2, 1)],
    ['Высота борта H, м', fmt(C.H2, 1)],
    ['Коэффициент общей полноты δ', fmt(C.d1, 3)],
    ['Мощность главного двигателя N<sub>гл</sub>, кВт', fmt(F.Ngl)],
    ['Масса СЭУ Р<sub>сэу3</sub>, т', fmt(F.Pseu3)],
    ['Масса СЭЗ Р<sub>сэз3</sub>, т', fmt(F.Psez3)],
    ['Дедвейт DWT = Р<sub>гр</sub> + Р<sub>сэз3</sub> + Р<sub>эк.сн</sub>, т', fmt(DWT)],
  ];
  document.getElementById('final-table').innerHTML =
    '<tr><th style="text-align:left">Характеристика</th><th>Значение</th></tr>' +
    rows.map(r => `<tr><td style="text-align:left">${r[0]}</td><td style="font-weight:700">${r[1]}</td></tr>`).join('');
  document.getElementById('final-badge').innerHTML =
    `<span class="badge ${F.ok ? 'ok' : 'bad'}">${F.ok
      ? 'Эскиз сходится: после выбора двигателя расхождение нагрузки в допуске запаса водоизмещения'
      : 'Эскиз не сошёлся: расхождение нагрузки больше половины запаса водоизмещения — нужен ещё виток'}</span>`;
}

/* ---------- запуск ---------- */
buildTable1();
buildTable2();
function recalcAll() { calc1(); calc2(); calc3(); calc4(); renderFinal(); }
document.addEventListener('input', e => {
  if (e.target && (e.target.type === 'number' || e.target.type === 'radio')) recalcAll();
});
document.addEventListener('change', e => {
  if (e.target && e.target.type === 'radio') recalcAll();
});
recalcAll();
