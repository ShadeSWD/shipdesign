/* Решатель «первое приближение по судам-аналогам» + уравнение нагрузки. */
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

/* ---------- запуск ---------- */
buildTable1();
buildTable2();
function recalcAll() { calc1(); calc2(); }
document.addEventListener('input', e => {
  if (e.target && e.target.type === 'number') recalcAll();
});
recalcAll();
