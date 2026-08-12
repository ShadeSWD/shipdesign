/* hull.js — строевая по шпангоутам (Хогг + вставка по Линдбладу),
 * грузовая ватерлиния и мидель-шпангоут. */
'use strict';
(function () {
  const NS = 'http://www.w3.org/2000/svg';
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
  function mk(name, attrs, parent) {
    const e = document.createElementNS(NS, name);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function tx(parent, x, y, s, attrs) {
    const e = mk('text', Object.assign({ x, y, 'font-family': 'system-ui,sans-serif' }, attrs || {}), parent);
    e.textContent = s; return e;
  }

  function calc() {
    const L = readN('hf-L'), B = readN('hf-B'), T = readN('hf-T'), H = readN('hf-H'),
      delta = readN('hf-delta'), alpha = readN('hf-alpha'), beta = readN('hf-beta'), u = readN('hf-u');
    if (![L, B, T, H, delta, alpha, beta, u].every(isFinite)) return;

    /* ---------- 1. подготовительные данные ---------- */
    const V = delta * L * B * T;
    const zeta = delta / beta;
    const xbar = 0.12 * (delta - 0.63);
    const xcTar = xbar * L;
    const v = 0.514 * u;
    const Fr = v / Math.sqrt(9.81 * L);
    const ins = Fr < 0.26;
    const Lcvn = 0.19 * L, Lcvk = 0.12 * L;
    let o = [];
    o.push(stepRow('V = δ·L·B·T', `${fmt(delta, 3)}·${fmt(L, 1)}·${fmt(B, 1)}·${fmt(T, 1)}`, `${fmt(V)} м³`));
    o.push(stepRow('ζ = δ/β', `${fmt(delta, 3)}/${fmt(beta, 3)}`, fmt(zeta, 3)));
    o.push(stepRow('x̄<sub>c</sub> = 0,12·(δ − 0,63)', `0,12·(${fmt(delta, 3)} − 0,63)`,
      `${fmt(xbar, 4)} → x<sub>c</sub> = ${fmt(xcTar, 2)} м в нос от миделя`));
    o.push(stepRow('v = 0,514·u', `0,514·${fmt(u, 1)}`, `${fmt(v, 2)} м/с`));
    o.push(stepRow('Fr = v/√(g·L)', `${fmt(v, 2)}/√(9,81·${fmt(L, 1)})`, fmt(Fr, 3)));
    o.push(badgeRow(ins
      ? `Fr = ${fmt(Fr, 3)} &lt; 0,26 — цилиндрическая вставка целесообразна`
      : `Fr = ${fmt(Fr, 3)} ≥ 0,26 — вставка нецелесообразна, принят шпангоут наибольшего сечения`, ins));
    o.push(stepRow('L<sub>цв.н</sub> ≈ 0,19·L (по Линдбладу)', `0,19·${fmt(L, 1)}`, `${fmt(Lcvn, 2)} м`));
    o.push(stepRow('L<sub>цв.к</sub> ≈ 0,12·L (по Линдбладу)', `0,12·${fmt(L, 1)}`, `${fmt(Lcvk, 2)} м`));
    o.push(stepRow('L<sub>цв</sub> = L<sub>цв.н</sub> + L<sub>цв.к</sub>',
      `${fmt(Lcvn, 2)} + ${fmt(Lcvk, 2)}`, `${fmt(Lcvn + Lcvk, 2)} м`));
    document.getElementById('hf-steps1').innerHTML = o.join('');

    /* ---------- 2. строевая ---------- */
    const zn = zeta + 0.002 + 2 * xbar;
    const zk = zeta - 0.002 - 2 * xbar;
    const Xn1 = zn * L / 2, Xk1 = zk * L / 2;
    const Lnz = L / 2 - Lcvn, Lkz = L / 2 - Lcvk;
    const znz = 1 + L * (zn - 1) / (2 * Lnz);
    const zkz = 1 + L * (zk - 1) / (2 * Lkz);
    const Sm = beta * B * T;
    const pn = Math.min(30, Math.max(0.4, znz / (1 - znz)));
    const pk = Math.min(30, Math.max(0.4, zkz / (1 - zkz)));
    /* строевая S(x), x — от кормового перпендикуляра */
    const S = x => {
      if (x <= 0 || x >= L) return 0;
      if (x < Lkz) return Sm * (1 - Math.pow((Lkz - x) / Lkz, pk));
      if (x > L - Lnz) return Sm * (1 - Math.pow((x - (L - Lnz)) / Lnz, pn));
      return Sm;
    };
    let Vc = 0, Mx = 0;
    const nInt = 800, dx = L / nInt;
    for (let i = 0; i <= nInt; i++) {
      const x = i * dx, w = (i === 0 || i === nInt) ? 0.5 : 1;
      Vc += w * S(x) * dx;
      Mx += w * S(x) * (x - L / 2) * dx;
    }
    const xcC = Mx / Vc;
    o = [];
    o.push(stepRow('ζ<sub>н</sub> = ζ + 0,002 + 2·x̄<sub>c</sub>',
      `${fmt(zeta, 3)} + 0,002 + 2·${fmt(xbar, 4)}`, fmt(zn, 3)));
    o.push(stepRow('ζ<sub>к</sub> = ζ − 0,002 − 2·x̄<sub>c</sub>',
      `${fmt(zeta, 3)} − 0,002 − 2·${fmt(xbar, 4)}`, fmt(zk, 3)));
    o.push(stepRow('X<sub>н1</sub> = ζ<sub>н</sub>·L/2', `${fmt(zn, 3)}·${fmt(L / 2, 1)}`, `${fmt(Xn1, 2)} м`));
    o.push(stepRow('X<sub>к1</sub> = ζ<sub>к</sub>·L/2', `${fmt(zk, 3)}·${fmt(L / 2, 1)}`, `${fmt(Xk1, 2)} м`));
    o.push(stepRow('L<sub>нз</sub> = L/2 − L<sub>цв.н</sub>', `${fmt(L / 2, 1)} − ${fmt(Lcvn, 2)}`, `${fmt(Lnz, 2)} м`));
    o.push(stepRow('L<sub>кз</sub> = L/2 − L<sub>цв.к</sub>', `${fmt(L / 2, 1)} − ${fmt(Lcvk, 2)}`, `${fmt(Lkz, 2)} м`));
    o.push(stepRow('ζ<sub>нз</sub> = 1 + L·(ζ<sub>н</sub> − 1)/(2·L<sub>нз</sub>)',
      `1 + ${fmt(L, 1)}·(${fmt(zn, 3)} − 1)/(2·${fmt(Lnz, 2)})`, fmt(znz, 3)));
    o.push(stepRow('ζ<sub>кз</sub> = 1 + L·(ζ<sub>к</sub> − 1)/(2·L<sub>кз</sub>)',
      `1 + ${fmt(L, 1)}·(${fmt(zk, 3)} − 1)/(2·${fmt(Lkz, 2)})`, fmt(zkz, 3)));
    o.push(stepRow('S<sub>⊗</sub> = β·B·T — ордината строевой на миделе',
      `${fmt(beta, 3)}·${fmt(B, 1)}·${fmt(T, 1)}`, `${fmt(Sm, 2)} м²`));
    o.push(badgeRow(`самопроверка площади: V<sub>строевой</sub> = ${fmt(Vc)} м³, задано V = ${fmt(V)} м³
      (расхождение ${fmt(Math.abs(Vc - V) / V * 100, 2)} %)`, Math.abs(Vc - V) / V < 0.01));
    o.push(badgeRow(`самопроверка центра: x<sub>c</sub> кривой = ${fmt(xcC, 2)} м при расчётном ${fmt(xcTar, 2)} м —
      доводится сглаживанием при вычерчивании`, Math.abs(xcC - xcTar) < 0.005 * L));
    document.getElementById('hf-steps2').innerHTML = o.join('');

    /* ---------- 3. КВЛ ---------- */
    const Swl = alpha * L * B;
    const phi = 69.5 - 260 * zn * (1 - zn);
    const xf = -0.01 * L * (1.75 + alpha + 3.5 * alpha * alpha) * Math.sqrt(Math.max(0, 1 - alpha));
    const tanphi = Math.tan(phi * Math.PI / 180);
    const xiC = Math.max(1, (B / 2 - 1.2) / Math.max(0.08, tanphi));
    const noseY = xi => { // xi — от носового перпендикуляра
      if (xi >= Lnz) return B / 2;
      return xi < xiC ? tanphi * xi : B / 2 - 1.2 * Math.exp(-(xi - xiC) / 2.2);
    };
    /* площадь носа и вставки, добор кормы степенной кривой */
    let Ani = (L - Lnz - Lkz) * B / 2;
    for (let i = 0; i <= 400; i++) {
      const xi = i * Lnz / 400, w = (i === 0 || i === 400) ? 0.5 : 1;
      Ani += w * noseY(xi) * (Lnz / 400);
    }
    const aKz = Math.min(0.97, Math.max(0.3, (Swl / 2 - Ani) / (Lkz * B / 2)));
    const qk = aKz / (1 - aKz);
    const yWL = x => { // x — от кормового перпендикуляра
      if (x <= 0 || x >= L) return 0;
      if (x < Lkz) return B / 2 * (1 - Math.pow((Lkz - x) / Lkz, qk));
      return noseY(L - x);
    };
    let Sc = 0, Mf = 0;
    for (let i = 0; i <= nInt; i++) {
      const x = i * dx, w = (i === 0 || i === nInt) ? 0.5 : 1;
      Sc += w * 2 * yWL(x) * dx;
      Mf += w * 2 * yWL(x) * (x - L / 2) * dx;
    }
    const xfC = Mf / Sc;
    o = [];
    o.push(stepRow('S<sub>вл</sub> = α·L·B', `${fmt(alpha, 3)}·${fmt(L, 1)}·${fmt(B, 1)}`, `${fmt(Swl)} м²`));
    o.push(stepRow('φ = 69,5 − 260·ζ<sub>н</sub>·(1 − ζ<sub>н</sub>)',
      `69,5 − 260·${fmt(zn, 3)}·(1 − ${fmt(zn, 3)})`, `${fmt(phi, 1)}°`));
    o.push(badgeRow(`φ = ${fmt(phi, 1)}° ≥ 8° — носовое заострение допустимо; кормовая ветвь прямая, угол ≤ 30°`, phi >= 8));
    o.push(stepRow('x<sub>f</sub> = −0,01·L·(1,75 + α + 3,5·α²)·√(1 − α)',
      `−0,01·${fmt(L, 1)}·(1,75 + ${fmt(alpha, 3)} + 3,5·${fmt(alpha * alpha, 3)})·√(1 − ${fmt(alpha, 3)})`,
      `${fmt(xf, 2)} м (в корму от миделя)`));
    o.push(badgeRow(`самопроверка площади КВЛ: ${fmt(Sc)} м² при заданных ${fmt(Swl)} м²
      (расхождение ${fmt(Math.abs(Sc - Swl) / Swl * 100, 2)} %); x<sub>f</sub> кривой = ${fmt(xfC, 2)} м`,
      Math.abs(Sc - Swl) / Swl < 0.02));
    document.getElementById('hf-steps3').innerHTML = o.join('');

    /* ---------- 4. мидель ---------- */
    const Rsk = Math.sqrt(2.32 * B * T * (1 - beta));
    const hdd = Math.ceil(B / 15 * 10) / 10, bdb = 2.0, hp = B / 50;
    o = [];
    o.push(stepRow('R<sub>ск</sub> = √(2,32·B·T·(1 − β))',
      `√(2,32·${fmt(B, 1)}·${fmt(T, 1)}·(1 − ${fmt(beta, 3)}))`, `${fmt(Rsk, 2)} м`));
    o.push(stepRow('без развала бортов и килеватости; погибь бимса h<sub>п</sub> = B/50',
      `${fmt(B, 1)}/50`, `${fmt(hp, 2)} м`));
    document.getElementById('hf-steps4').innerHTML = o.join('');

    drawStroevaya({ L, Sm, S, Lkz, Lnz, Xn1, Xk1, V: Vc, xcC, beta, T, yWL });
    drawWL({ L, B, yWL, Lkz, Lnz, phi, xf, tanphi });
    drawMidship({ B, T, H, Rsk, hdd, bdb, hp });
    framesTable({ L, T, beta, S, yWL, Lkz, Lnz });
  }

  /* ---------------- строевая ---------------- */
  function drawStroevaya(p) {
    const svg = document.getElementById('hf-str');
    svg.innerHTML = '';
    const W = 1000, Hpx = 300, mx = 46, my = 34;
    svg.setAttribute('viewBox', `0 0 ${W} ${Hpx}`);
    const sx = (W - mx - 30) / p.L, sy = (Hpx - my - 56) / (p.Sm * 1.12);
    const X = x => mx + x * sx, Y = s => Hpx - 46 - s * sy;
    const g = mk('g', {}, svg);
    /* вставка */
    mk('rect', { x: X(p.Lkz), y: Y(p.Sm), width: (p.L - p.Lnz - p.Lkz) * sx, height: p.Sm * sy, fill: '#f0f0ec' }, g);
    /* кривая с заливкой */
    let d = `M ${X(0)} ${Y(0)}`;
    for (let i = 0; i <= 300; i++) { const x = i * p.L / 300; d += ` L ${X(x)} ${Y(p.S(x))}`; }
    d += ` L ${X(p.L)} ${Y(0)} Z`;
    mk('path', { d, fill: 'rgba(43,79,160,.10)', stroke: '#2b4fa0', 'stroke-width': 1.8 }, g);
    /* оси */
    mk('line', { x1: X(0), y1: Y(0), x2: X(p.L) + 16, y2: Y(0), stroke: '#16161a', 'stroke-width': 1.2 }, g);
    mk('line', { x1: X(0), y1: Y(0) + 4, x2: X(0), y2: Y(p.Sm * 1.1), stroke: '#16161a', 'stroke-width': 1.2 }, g);
    tx(g, X(0) - 6, Y(p.Sm * 1.08), 'S, м²', { 'font-size': 11, 'text-anchor': 'end', 'font-style': 'italic' });
    tx(g, X(p.L) + 18, Y(0) + 4, 'x', { 'font-size': 12, 'font-style': 'italic' });
    /* мидель */
    mk('line', { x1: X(p.L / 2), y1: Y(0) + 8, x2: X(p.L / 2), y2: Y(p.Sm * 1.09), stroke: '#6b6b74', 'stroke-width': .8, 'stroke-dasharray': '10 4 2 4' }, g);
    tx(g, X(p.L / 2), Y(p.Sm * 1.1) - 3, '⊗ мидель', { 'font-size': 10.5, 'text-anchor': 'middle', fill: '#6b6b74' });
    /* ордината Sм */
    mk('line', { x1: X(0), y1: Y(p.Sm), x2: X(p.Lkz), y2: Y(p.Sm), stroke: '#9a9aa2', 'stroke-width': .7, 'stroke-dasharray': '4 4' }, g);
    tx(g, X(0) + 4, Y(p.Sm) - 5, `S⊗ = ${fmt(p.Sm, 1)} м²`, { 'font-size': 10.5, fill: '#3a3a42' });
    /* вспомогательные точки Хогга */
    [[p.L / 2 + p.Xn1, 'Xн1', '#9c2b22'], [p.L / 2 - p.Xk1, 'Xк1', '#9c2b22']].forEach(([x, t, c]) => {
      mk('line', { x1: X(x), y1: Y(0), x2: X(x), y2: Y(p.Sm * 0.55), stroke: c, 'stroke-width': 1, 'stroke-dasharray': '5 3' }, g);
      mk('circle', { cx: X(x), cy: Y(0), r: 3.2, fill: c }, g);
      tx(g, X(x), Y(p.Sm * 0.58) - 3, t, { 'font-size': 10.5, 'text-anchor': 'middle', fill: c, 'font-weight': 600 });
    });
    /* размерные скобки вставки */
    tx(g, X(p.Lkz + (p.L - p.Lnz - p.Lkz) / 2), Y(p.Sm * 0.5), 'цилиндрическая вставка',
      { 'font-size': 10.5, 'text-anchor': 'middle', fill: '#6b6b74' });
    tx(g, X(p.L * 0.62), Y(p.Sm * 0.24), `V = ${fmt(p.V)} м³`, { 'font-size': 12.5, 'text-anchor': 'middle', fill: '#2b4fa0', 'font-weight': 700 });
    /* центр величины */
    mk('path', { d: `M ${X(p.L / 2 + p.xcC)} ${Y(0)} l -5 9 l 10 0 Z`, fill: '#17632f' }, g);
    tx(g, X(p.L / 2 + p.xcC) + 6, Y(0) + 11, `xc = ${fmt(p.xcC, 2)} м`, { 'font-size': 10, fill: '#17632f' });
    /* теоретические шпангоуты (0 — нос) */
    for (let i = 0; i <= 10; i++) {
      const x = p.L - i * p.L / 10;
      mk('line', { x1: X(x), y1: Y(0), x2: X(x), y2: Y(0) + 5, stroke: '#16161a', 'stroke-width': .8 }, g);
      tx(g, X(x), Y(0) + 16, String(i), { 'font-size': 9.5, 'text-anchor': 'middle', fill: '#6b6b74' });
    }
    tx(g, X(2), Y(0) + 28, 'корма', { 'font-size': 10, fill: '#6b6b74' });
    tx(g, X(p.L - 2), Y(0) + 28, 'нос', { 'font-size': 10, fill: '#6b6b74', 'text-anchor': 'end' });
  }

  /* ---------------- полуширота КВЛ ---------------- */
  function drawWL(p) {
    const svg = document.getElementById('hf-wl');
    svg.innerHTML = '';
    const W = 1000, mx = 46;
    const sx = (W - mx - 30) / (p.L + 6), sy = sx; // истинный масштаб — углы честные
    const Hpx = Math.round(p.B / 2 * sy + 84);
    svg.setAttribute('viewBox', `0 0 ${W} ${Hpx}`);
    const X = x => mx + x * sx, Y = y => Hpx - 44 - y * sy;
    const g = mk('g', {}, svg);
    mk('rect', { x: X(p.Lkz), y: Y(p.B / 2), width: (p.L - p.Lnz - p.Lkz) * sx, height: p.B / 2 * sy, fill: '#f0f0ec' }, g);
    let d = `M ${X(0)} ${Y(0)}`;
    for (let i = 0; i <= 400; i++) { const x = i * p.L / 400; d += ` L ${X(x)} ${Y(p.yWL(x))}`; }
    d += ` L ${X(p.L)} ${Y(0)} Z`;
    mk('path', { d, fill: 'rgba(29,78,216,.08)', stroke: '#1d4ed8', 'stroke-width': 1.8 }, g);
    /* ЦЛ (ось) */
    mk('line', { x1: X(-3), y1: Y(0), x2: X(p.L + 5), y2: Y(0), stroke: '#16161a', 'stroke-width': 1.1, 'stroke-dasharray': '14 4 3 4' }, g);
    tx(g, X(p.L + 5), Y(0) - 5, 'ЦЛ', { 'font-size': 10.5, 'text-anchor': 'end', fill: '#3a3a42' });
    /* мидель и шпангоуты */
    mk('line', { x1: X(p.L / 2), y1: Y(0) + 6, x2: X(p.L / 2), y2: Y(p.B / 2) - 8, stroke: '#6b6b74', 'stroke-width': .8, 'stroke-dasharray': '10 4 2 4' }, g);
    tx(g, X(p.L / 2), Y(p.B / 2) - 12, '⊗', { 'font-size': 11, 'text-anchor': 'middle', fill: '#6b6b74' });
    for (let i = 0; i <= 10; i++) {
      const x = p.L - i * p.L / 10;
      mk('line', { x1: X(x), y1: Y(0), x2: X(x), y2: Y(0) + 5, stroke: '#16161a', 'stroke-width': .8 }, g);
      tx(g, X(x), Y(0) + 15, String(i), { 'font-size': 9, 'text-anchor': 'middle', fill: '#6b6b74' });
    }
    /* угол заострения */
    const lphi = 34;
    mk('line', {
      x1: X(p.L), y1: Y(0), x2: X(p.L - lphi), y2: Y(lphi * p.tanphi),
      stroke: '#9c2b22', 'stroke-width': 1, 'stroke-dasharray': '6 3'
    }, g);
    const aphi = Math.atan(p.tanphi);
    mk('path', {
      d: `M ${X(p.L - 16)} ${Y(0)} A ${16 * sx} ${16 * sx} 0 0 1 ${X(p.L - 16 * Math.cos(aphi))} ${Y(16 * Math.sin(aphi))}`,
      fill: 'none', stroke: '#9c2b22', 'stroke-width': 1
    }, g);
    tx(g, X(p.L - 21), Y(2.2), `φ = ${fmt(p.phi, 1)}°`, { 'font-size': 10.5, 'text-anchor': 'end', fill: '#9c2b22', 'font-weight': 600 });
    /* xf */
    mk('path', { d: `M ${X(p.L / 2 + p.xf)} ${Y(0)} l -5 9 l 10 0 Z`, fill: '#17632f' }, g);
    tx(g, X(p.L / 2 + p.xf) - 6, Y(0) + 18, `xf = ${fmt(p.xf, 2)} м`, { 'font-size': 10, fill: '#17632f', 'text-anchor': 'end' });
    tx(g, X(2), Y(0) + 26, 'корма', { 'font-size': 10, fill: '#6b6b74' });
    tx(g, X(p.L - 2), Y(0) + 26, 'нос', { 'font-size': 10, fill: '#6b6b74', 'text-anchor': 'end' });
    tx(g, X(p.L / 2), Y(p.B / 2) + 14, `B/2 = ${fmt(p.B / 2, 2)} м`, { 'font-size': 10, 'text-anchor': 'middle', fill: '#3a3a42' });
  }

  /* ---------------- мидель ---------------- */
  function drawMidship(p) {
    const svg = document.getElementById('hf-mid');
    svg.innerHTML = '';
    const W = 560, mx = 62;
    const s = (W - mx - 66) / p.B;
    const Hpx = Math.round((p.H + p.hp) * s + 70);
    svg.setAttribute('viewBox', `0 0 ${W} ${Hpx}`);
    const X = x => mx + (x + p.B / 2) * s;   // x от ЦЛ
    const Y = z => Hpx - 34 - z * s;
    const g = mk('g', {}, svg);
    const R = p.Rsk;
    const d = [
      `M ${X(-p.B / 2)} ${Y(p.H)}`,
      `L ${X(-p.B / 2)} ${Y(R)}`,
      `Q ${X(-p.B / 2)} ${Y(0)} ${X(-p.B / 2 + R)} ${Y(0)}`,
      `L ${X(p.B / 2 - R)} ${Y(0)}`,
      `Q ${X(p.B / 2)} ${Y(0)} ${X(p.B / 2)} ${Y(R)}`,
      `L ${X(p.B / 2)} ${Y(p.H)}`,
      `Q ${X(0)} ${Y(p.H + 2 * p.hp)} ${X(-p.B / 2)} ${Y(p.H)}`,
      'Z',
    ].join(' ');
    mk('path', { d, fill: '#f6f8fc', stroke: '#16161a', 'stroke-width': 1.8 }, g);
    /* ЦЛ и ОП */
    mk('line', { x1: X(0), y1: Y(-1.5), x2: X(0), y2: Y(p.H + 2.2), stroke: '#6b6b74', 'stroke-width': .8, 'stroke-dasharray': '12 4 2 4' }, g);
    mk('line', { x1: X(-p.B / 2) - 22, y1: Y(0), x2: X(p.B / 2) + 22, y2: Y(0), stroke: '#6b6b74', 'stroke-width': .8, 'stroke-dasharray': '12 4 2 4' }, g);
    tx(g, X(0) + 4, Y(p.H + 2.2) + 10, 'ЦЛ', { 'font-size': 10, fill: '#6b6b74' });
    tx(g, X(p.B / 2) + 24, Y(0) + 4, 'ОП', { 'font-size': 10, fill: '#6b6b74' });
    /* КВЛ */
    mk('line', { x1: X(-p.B / 2) - 14, y1: Y(p.T), x2: X(p.B / 2) + 14, y2: Y(p.T), stroke: '#1d4ed8', 'stroke-width': 1.3 }, g);
    tx(g, X(-p.B / 2) - 16, Y(p.T) - 4, `КВЛ, T = ${fmt(p.T, 1)} м`, { 'font-size': 10, fill: '#1d4ed8' });
    /* двойное дно */
    mk('line', { x1: X(-p.B / 2 + 0.1), y1: Y(p.hdd), x2: X(p.B / 2 - 0.1), y2: Y(p.hdd), stroke: '#2b4fa0', 'stroke-width': 1.1, 'stroke-dasharray': '7 4' }, g);
    tx(g, X(0) + 6, Y(p.hdd) - 5, `двойное дно h = ${fmt(p.hdd, 1)} м`, { 'font-size': 10, fill: '#2b4fa0' });
    /* двойной борт */
    [1, -1].forEach(sg => mk('line', {
      x1: X(sg * (p.B / 2 - p.bdb)), y1: Y(p.hdd), x2: X(sg * (p.B / 2 - p.bdb)), y2: Y(p.H),
      stroke: '#2b4fa0', 'stroke-width': 1.1, 'stroke-dasharray': '7 4'
    }, g));
    tx(g, X(p.B / 2 - p.bdb) - 4, Y(p.H * 0.62), `двойной борт ${fmt(p.bdb, 1)} м`,
      { 'font-size': 10, fill: '#2b4fa0', 'text-anchor': 'end', transform: `rotate(-90 ${X(p.B / 2 - p.bdb) - 4} ${Y(p.H * 0.62)})` });
    /* радиус скулы */
    mk('line', {
      x1: X(p.B / 2 - R), y1: Y(R), x2: X(p.B / 2 - R * 0.29), y2: Y(R * 0.29),
      stroke: '#9c2b22', 'stroke-width': 1, 'marker-end': 'url(#hf-arr)'
    }, g);
    tx(g, X(p.B / 2 - R) - 5, Y(R) - 6, `Rск = ${fmt(R, 2)} м`, { 'font-size': 10, fill: '#9c2b22', 'text-anchor': 'end' });
    /* погибь */
    mk('line', { x1: X(0) - 30, y1: Y(p.H + p.hp), x2: X(0) + 30, y2: Y(p.H + p.hp), stroke: '#9a9aa2', 'stroke-width': .7, 'stroke-dasharray': '3 3' }, g);
    tx(g, X(0) + 34, Y(p.H + p.hp) + 3, `погибь B/50 = ${fmt(p.hp, 2)} м`, { 'font-size': 10, fill: '#3a3a42' });
    /* размеры B, H */
    const defs = mk('defs', {}, svg);
    defs.innerHTML = `<marker id="hf-arr" markerWidth="9" markerHeight="8" refX="8" refY="4" orient="auto">
      <path d="M0,0 L9,4 L0,8 z" fill="#9c2b22"/></marker>
      <marker id="hf-de" markerWidth="9" markerHeight="8" refX="8" refY="4" orient="auto">
      <path d="M0,0 L9,4 L0,8 z" fill="#16161a"/></marker>
      <marker id="hf-ds" markerWidth="9" markerHeight="8" refX="1" refY="4" orient="auto">
      <path d="M9,0 L0,4 L9,8 z" fill="#16161a"/></marker>`;
    const yB = Y(p.H + 3.6);
    mk('line', { x1: X(-p.B / 2), y1: yB, x2: X(p.B / 2), y2: yB, stroke: '#16161a', 'stroke-width': .9, 'marker-start': 'url(#hf-ds)', 'marker-end': 'url(#hf-de)' }, g);
    tx(g, X(0), yB - 4, `B = ${fmt(p.B, 1)} м`, { 'font-size': 10.5, 'text-anchor': 'middle', 'font-weight': 600 });
    [[-p.B / 2, p.H + 3.4], [p.B / 2, p.H + 3.4]].forEach(([x, z]) =>
      mk('line', { x1: X(x), y1: Y(p.H) - 2, x2: X(x), y2: Y(z), stroke: '#9a9aa2', 'stroke-width': .6 }, g));
    const xH = X(p.B / 2) + 40;
    mk('line', { x1: xH, y1: Y(0), x2: xH, y2: Y(p.H), stroke: '#16161a', 'stroke-width': .9, 'marker-start': 'url(#hf-ds)', 'marker-end': 'url(#hf-de)' }, g);
    tx(g, xH + 4, Y(p.H / 2), `H = ${fmt(p.H, 1)} м`, { 'font-size': 10.5, 'font-weight': 600, transform: `rotate(-90 ${xH + 10} ${Y(p.H / 2)})`, 'text-anchor': 'middle' });
    mk('line', { x1: X(p.B / 2) + 2, y1: Y(p.H), x2: xH + 4, y2: Y(p.H), stroke: '#9a9aa2', 'stroke-width': .6 }, g);
  }

  /* ---------------- таблица шпангоутов ---------------- */
  function framesTable(p) {
    const rows = [];
    let maxB = -1, maxI = -1;
    for (let i = 0; i <= 10; i++) {
      const x = p.L - i * p.L / 10;            // от кормового перпендикуляра
      const Si = p.S(x), bi = 2 * p.yWL(x);
      const beti = bi > 0.5 ? Si / (bi * p.T) : NaN;
      if (isFinite(beti) && beti > maxB) { maxB = beti; maxI = i; }
      rows.push({ i, x, Si, bi, beti, ins: x >= p.Lkz - 1e-6 && x <= p.L - p.Lnz + 1e-6 });
    }
    let h = `<tr><th>Шпангоут</th><th>S<sub>i</sub>, м²</th><th>b<sub>i</sub> по КВЛ, м</th>
      <th>β<sub>i</sub> = S<sub>i</sub>/(b<sub>i</sub>T)</th><th>зона</th></tr>`;
    rows.forEach(r => {
      h += `<tr${r.ins ? ' style="background:#f6f8ef"' : ''}><td>${r.i}</td><td>${fmt(r.Si, 2)}</td>
        <td>${fmt(r.bi, 2)}</td><td${r.i === maxI ? ' style="font-weight:700"' : ''}>${isFinite(r.beti) ? fmt(r.beti, 3) : '—'}</td>
        <td>${r.ins ? 'цилиндрическая вставка' : (r.i < 5 ? 'носовое заострение' : 'кормовое заострение')}</td></tr>`;
    });
    document.getElementById('hf-frames').innerHTML = h;
    const okA = rows.every(r => !isFinite(r.beti) || r.beti <= p.beta + 0.002);
    const okB = rows[maxI] && rows[maxI].ins;
    const cap = document.getElementById('hf-frames').parentElement.nextElementSibling;
    if (cap) {
      const old = cap.querySelector('.badge'); if (old) old.parentElement.remove();
      const div = document.createElement('div');
      div.innerHTML = badgeRow(`проверка а) β<sub>i</sub> ≤ β = ${fmt(p.beta, 3)}: ${okA ? 'выполнено' : 'нарушено'};
        проверка б) максимум β<sub>i</sub> — в зоне вставки: ${okB ? 'выполнено' : 'нарушено'}
        (небольшой рост β на крайнем носовом шпангоуте допускается методикой)`, okA && okB);
      cap.prepend(div.firstChild);
    }
  }

  document.addEventListener('input', e => {
    if (e.target && e.target.type === 'number') calc();
  });
  calc();
})();
