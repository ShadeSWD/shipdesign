/* Расчёт «предельная длина отсека» (непотопляемость, задача 3.2). */
'use strict';

function ffmt(v, d = 0) {
  if (!isFinite(v)) return '—';
  return v.toLocaleString('ru-RU', { minimumFractionDigits: d, maximumFractionDigits: d });
}
function fstep(f, sub, res) {
  return `<div style="margin:6px 0;font:14.5px system-ui"><span style="color:#3a3a42">${f}</span>` +
    (sub ? ` = <span style="color:#6b6b74">${sub}</span>` : '') + ` = <b>${res}</b></div>`;
}
function fread(id) { return parseFloat(document.getElementById(id).value); }

function floodCalc() {
  const L = fread('f-L'), B = fread('f-B'), T = fread('f-T'), H = fread('f-H'),
    nu = fread('f-nu'), mu = fread('f-mu'), rho = fread('f-rho'), del = fread('f-delta');

  const D = rho * del * L * B * T;
  const Wzp = (H - T) * B * L;
  const Wco = Wzp / mu;
  const Lco = Wco / (B * H);
  const LdopCo = nu * Lco;

  // крайний (носовой) отсек: осадка носом при затоплении отсека длиной L1
  const Hw = Math.pow(L, 3) * B / (12 * D);
  const end = L1 => {
    const W1 = L1 * B * H;
    const P1 = mu * W1;
    const D1 = D + P1;
    const xg1 = P1 * (0.5 * (L - L1)) / D1;
    const T1 = D1 / (L * B);
    const Tn = T1 + 0.5 * L * (xg1 - 0) / Hw;
    return { W1, P1, D1, xg1, T1, Tn };
  };

  // первая проба L1 = 0,1·L
  const L1a = 0.1 * L;
  const it1 = end(L1a);

  // подбор бисекцией: Tн(L1) = H
  let lo = 0, hi = 0.6 * L, Lstar = NaN;
  if (end(hi).Tn > H && end(0).Tn < H) {
    for (let i = 0; i < 80; i++) {
      const mid = (lo + hi) / 2;
      (end(mid).Tn < H) ? lo = mid : hi = mid;
    }
    Lstar = (lo + hi) / 2;
  }
  const it2 = isFinite(Lstar) ? end(Lstar) : null;
  const Ldop = nu * Lstar;

  const o1 = [];
  o1.push(fstep('D = ρ·δ·L·B·T',
    `${ffmt(rho, 3)}·${ffmt(del, 2)}·${ffmt(L, 1)}·${ffmt(B, 1)}·${ffmt(T, 1)}`,
    `${ffmt(D, 0)} т`));
  document.getElementById('fsteps0').innerHTML = o1.join('');

  const o2 = [];
  o2.push(fstep('W<sub>зп</sub> = (H − T)·B·L',
    `(${ffmt(H, 1)} − ${ffmt(T, 1)})·${ffmt(B, 1)}·${ffmt(L, 1)}`, `${ffmt(Wzp, 0)} м³`));
  o2.push(fstep('W<sub>цо</sub> = W<sub>зп</sub>/μ',
    `${ffmt(Wzp, 0)}/${ffmt(mu, 2)}`, `${ffmt(Wco, 1)} м³`));
  o2.push(fstep('L<sub>цо</sub> = W<sub>цо</sub>/(B·H)',
    `${ffmt(Wco, 1)}/(${ffmt(B, 1)}·${ffmt(H, 1)})`, `${ffmt(Lco, 2)} м`));
  o2.push(fstep('L<sub>доп.цо</sub> = ν·L<sub>цо</sub>',
    `${ffmt(nu, 2)}·${ffmt(Lco, 2)}`, `${ffmt(LdopCo, 2)} м`));
  document.getElementById('fsteps1').innerHTML = o2.join('');

  const o3 = [];
  o3.push(`<div style="font:600 14.5px system-ui;margin:4px 0">Проба 1: L₁ = 0,1·L = ${ffmt(L1a, 2)} м</div>`);
  o3.push(fstep('W₁ = L₁·B·H', `${ffmt(L1a, 2)}·${ffmt(B, 1)}·${ffmt(H, 1)}`, `${ffmt(it1.W1, 1)} м³`));
  o3.push(fstep('P₁ = μ·W₁', `${ffmt(mu, 2)}·${ffmt(it1.W1, 1)}`, `${ffmt(it1.P1, 1)} т`));
  o3.push(fstep('D₁ = D + P₁', `${ffmt(D, 0)} + ${ffmt(it1.P1, 1)}`, `${ffmt(it1.D1, 1)} т`));
  o3.push(fstep('x<sub>g1</sub> = P₁·0,5·(L − L₁)/D₁',
    `${ffmt(it1.P1, 1)}·0,5·(${ffmt(L, 1)} − ${ffmt(L1a, 2)})/${ffmt(it1.D1, 1)}`,
    `${ffmt(it1.xg1, 2)} м`));
  o3.push(fstep('T₁ = D₁/(L·B)', `${ffmt(it1.D1, 1)}/(${ffmt(L, 1)}·${ffmt(B, 1)})`, `${ffmt(it1.T1, 2)} м`));
  o3.push(fstep('H<sub>w</sub> = L³·B/(12·D)',
    `${ffmt(L, 1)}³·${ffmt(B, 1)}/(12·${ffmt(D, 0)})`, `${ffmt(Hw, 2)} м`));
  o3.push(fstep('T<sub>н</sub> = T₁ + 0,5·L·(x<sub>g1</sub> − x<sub>c</sub>)/H<sub>w</sub>',
    `${ffmt(it1.T1, 2)} + 0,5·${ffmt(L, 1)}·${ffmt(it1.xg1, 2)}/${ffmt(Hw, 2)}`,
    `${ffmt(it1.Tn, 2)} м ${it1.Tn < H ? '&lt;' : '&ge;'} H = ${ffmt(H, 1)} м`));
  if (it2) {
    o3.push(`<div style="font:600 14.5px system-ui;margin:10px 0 4px">Подбор L₁ до условия
      T<sub>н</sub> = H (палуба у воды):</div>`);
    o3.push(fstep('L₁* : T<sub>н</sub>(L₁*) = H',
      `T<sub>н</sub> = ${ffmt(it2.Tn, 3)} м`, `L₁* = ${ffmt(Lstar, 2)} м`));
    o3.push(fstep('L<sub>доп</sub> = ν·L₁*', `${ffmt(nu, 2)}·${ffmt(Lstar, 2)}`,
      `${ffmt(Ldop, 2)} м`));
  } else {
    o3.push('<div style="color:#b3382e;font:14.5px system-ui">При этих данных судно не догружается до палубы — увеличьте отсек или осадку.</div>');
  }
  document.getElementById('fsteps2').innerHTML = o3.join('');

  window.FLOOD = { D, Wzp, Wco, Lco, LdopCo, Lstar, Ldop, Tn1: it1.Tn, Hw };
}

document.addEventListener('input', e => {
  if (e.target && e.target.type === 'number') floodCalc();
});
floodCalc();
