/* shipdraw.js — параметрический эскиз судна (боковой вид и план палубы).
 * Все построения — от главных размерений L, B, T, H и разбивки на отсеки;
 * координата x отсчитывается от кормового перпендикуляра в нос, z — от ОП вверх. */
'use strict';
window.SD = (function () {
  const NS = 'http://www.w3.org/2000/svg';

  function mk(name, attrs, parent) {
    const e = document.createElementNS(NS, name);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function txt(parent, x, y, s, attrs) {
    const e = mk('text', Object.assign({ x, y, 'font-family': 'system-ui,sans-serif' }, attrs || {}), parent);
    e.textContent = s;
    return e;
  }
  function fmt1(v, d) {
    return v.toLocaleString('ru-RU', { minimumFractionDigits: d == null ? 1 : d, maximumFractionDigits: d == null ? 1 : d });
  }

  /* седловатость главной палубы */
  function sheer(x, L, H) {
    const t = x / L;
    const bow = Math.max(0, (t - 0.55) / 0.45), st = Math.max(0, (0.25 - t) / 0.25);
    return H + 0.3 + 1.1 * bow * bow + 0.5 * st * st;
  }

  /* ------------------------------------------------------------------ *
   *  Боковой вид.
   *  p = { L,B,T,H, lap,lmo,lfp, holds:[от носа: т1..тN], hdd, bdb,
   *        lbak, hb (высота бака/юта), lyut, tiers:[длины ярусов сверху вниз без юта],
   *        a, ar, hk, dims:true, combs:true,
   *        waterlines:[{T,label,dash,color, Tn,Tk}], flags:[{x,label,color,z}] }
   * ------------------------------------------------------------------ */
  function drawSide(svg, p) {
    const L = p.L, H = p.H, T = p.T;
    svg.innerHTML = '';
    const W = 1120, Hpx = p.dims ? 320 : 260;
    const mx = 34, s = (W - mx - 60) / (L + 16);
    const baseY = Hpx - (p.dims ? 62 : 30);
    const X = x => mx + (x + 7) * s;
    const Y = z => baseY - z * s;
    svg.setAttribute('viewBox', `0 0 ${W} ${Hpx}`);
    const g = mk('g', {}, svg);
    const zd = x => sheer(x, L, H);
    const stemX = z => L + 0.5 * (z - T);          // наклонный форштевень через НП на КВЛ
    const dkBow = zd(L) + (p.lbak ? p.hb : 0);

    /* корпус */
    const deckPts = [];
    for (let x = 0; x <= L; x += L / 60) deckPts.push([X(x), Y(zd(x))]);
    const hull = [
      `M ${X(-2.8)} ${Y(zd(0))}`,                       // верх транца
      `L ${X(-1.2)} ${Y(6.2)}`,                          // транец
      `C ${X(1.4)} ${Y(4.4)} ${X(3.4)} ${Y(3.4)} ${X(4.2)} ${Y(1.3)}`, // подзор + старнпост
      `L ${X(4.9)} ${Y(0)}`,
      `L ${X(L - 6)} ${Y(0)}`,                           // киль
      `Q ${X(L - 3.2)} ${Y(0.3)} ${X(stemX(1.9))} ${Y(1.9)}`, // форфут
      `L ${X(stemX(dkBow))} ${Y(dkBow)}`,                // форштевень
    ];
    // палуба бака → уступ → главная палуба → ют (справа налево)
    const xb = L - (p.lbak || 0);
    if (p.lbak) {
      hull.push(`L ${X(xb)} ${Y(zd(xb) + p.hb)}`);
      hull.push(`L ${X(xb)} ${Y(zd(xb))}`);
    }
    const xy = p.lyut || 0;
    for (let x = xb; x >= xy; x -= L / 60) hull.push(`L ${X(x)} ${Y(zd(x))}`);
    if (p.lyut) {
      hull.push(`L ${X(xy)} ${Y(zd(xy))}`);
      hull.push(`L ${X(xy)} ${Y(zd(xy) + p.hb)}`);
      for (let x = xy; x >= -2.8; x -= 4) hull.push(`L ${X(x)} ${Y(zd(Math.max(x, 0)) + p.hb)}`);
      hull.push(`L ${X(-2.8)} ${Y(zd(0) + p.hb)}`);
    }
    hull.push('Z');
    mk('path', { d: hull.join(' '), fill: '#f6f8fc', stroke: '#16161a', 'stroke-width': 1.6, 'stroke-linejoin': 'round' }, g);

    /* ярусы надстройки и труба */
    if (p.tiers && p.tiers.length) {
      let z0 = zd(0) + p.hb;
      const back = 0.4;
      p.tiers.forEach((lt, i) => {
        const x0 = back + i * 1.6;
        mk('rect', {
          x: X(x0), y: Y(z0 + p.hb), width: (lt) * s, height: p.hb * s,
          fill: '#eef3ff', stroke: '#16161a', 'stroke-width': 1.2
        }, g);
        z0 += p.hb;
      });
      // труба стоит на крыше верхнего яруса надстройки (не висит в воздухе)
      const nT = p.tiers.length;
      const topX0 = back + (nT - 1) * 1.6, topLen = p.tiers[nT - 1];
      const fw = Math.min(3.6, Math.max(1.8, topLen * 0.4));
      const fx = topX0 + (topLen - fw) / 2, fh = 4.6, ztop = z0 + p.hb;
      mk('path', {
        d: `M ${X(fx)} ${Y(z0)} L ${X(fx + 1.1)} ${Y(z0 + fh)} L ${X(fx + 1.1 + fw)} ${Y(z0 + fh)} L ${X(fx + fw)} ${Y(z0)} Z`,
        fill: '#d9e2f4', stroke: '#16161a', 'stroke-width': 1.3
      }, g);
      mk('line', { x1: X(fx + 1.1), y1: Y(z0 + fh - 0.9), x2: X(fx + 1.1 + fw), y2: Y(z0 + fh - 0.9), stroke: '#16161a', 'stroke-width': 1 }, g);
      void ztop;
    }
    /* мачта на баке */
    if (p.lbak) {
      const mxx = L - 0.45 * p.lbak;
      mk('line', { x1: X(mxx), y1: Y(zd(mxx) + p.hb), x2: X(mxx), y2: Y(zd(mxx) + p.hb + 6.5), stroke: '#16161a', 'stroke-width': 1.4 }, g);
      mk('line', { x1: X(mxx), y1: Y(zd(mxx) + p.hb + 5), x2: X(mxx + 2.6), y2: Y(zd(mxx) + p.hb + 4.2), stroke: '#16161a', 'stroke-width': 1 }, g);
    }

    /* комингсы люков (сухогруз) или палубный трубопровод с манифольдом (танкер) */
    if (p.type === 'tank' && p.holds) {
      let xt = L - p.lfp;
      const zdeck = zd(0) + p.hb;
      // магистраль по палубе
      mk('line', { x1: X(p.lap + p.lmo), y1: Y(zdeck + 0.5), x2: X(L - p.lfp), y2: Y(zdeck + 0.5),
        stroke: '#155e75', 'stroke-width': 2 }, g);
      // манифольд в средней части
      const xm = (p.lap + p.lmo + L - p.lfp) / 2;
      mk('rect', { x: X(xm - 2), y: Y(zdeck + 2.2), width: 4 * s, height: 1.7 * s,
        fill: '#eef3ff', stroke: '#16161a', 'stroke-width': 1.2 }, g);
      txt(g, X(xm), Y(zdeck + 2.6), 'манифольд', { 'font-size': 9.5, 'text-anchor': 'middle', fill: '#3a3a42' });
      // горловины танков
      (p.holds || []).forEach(lh => {
        const xk = xt - lh;
        mk('rect', { x: X(xk + 0.45 * lh), y: Y(zdeck + 0.9), width: 1.6 * s, height: 0.9 * s,
          fill: '#fff', stroke: '#16161a', 'stroke-width': 1 }, g);
        xt = xk;
      });
    } else if (p.holds && p.hk) {
      let xn = L - p.lfp; // носовая граница трюма 1
      p.holds.forEach(lh => {
        const xk = xn - lh;
        const c0 = xk + 0.1 * lh, cw = 0.8 * lh;
        const zk = zd(c0 + cw / 2);
        mk('rect', { x: X(c0), y: Y(zk + p.hk), width: cw * s, height: p.hk * s, fill: '#fff', stroke: '#16161a', 'stroke-width': 1.1 }, g);
        xn = xk;
      });
    }

    /* двойное дно и переборки */
    const xap = p.lap, xfp = L - p.lfp;
    if (p.hdd) mk('line', {
      x1: X(xap), y1: Y(p.hdd), x2: X(xfp), y2: Y(p.hdd),
      stroke: '#2b4fa0', 'stroke-width': 1.1, 'stroke-dasharray': '7 4'
    }, g);
    const bh = [xap];
    let xc = xap + p.lmo; bh.push(xc);
    (p.holds || []).slice().reverse().slice(0, -1).forEach(lh => { xc += lh; bh.push(xc); });
    bh.push(xfp);
    bh.forEach(x => mk('line', {
      x1: X(x), y1: Y(0), x2: X(x), y2: Y(zd(x)),
      stroke: '#9c2b22', 'stroke-width': 1.15, 'stroke-dasharray': '4 3'
    }, g));

    /* ватерлинии */
    (p.waterlines || [{ T: T, label: `КВЛ, T = ${fmt1(T, 1)} м` }]).forEach(w => {
      const Tn = w.Tn != null ? w.Tn : w.T, Tk = w.Tk != null ? w.Tk : w.T;
      mk('line', {
        x1: X(-6.5), y1: Y(Tk), x2: X(L + 5), y2: Y(Tn),
        stroke: w.color || '#1d4ed8', 'stroke-width': 1.3, 'stroke-dasharray': w.dash || ''
      }, g);
      if (w.label) txt(g, X(L * 0.395), Y(Math.max(Tn, Tk)) - 4, w.label, { 'font-size': 11, fill: w.color || '#1d4ed8', 'font-style': 'italic' });
    });

    /* марки углубления на форштевне */
    for (let z = 2; z <= 10; z += 2) {
      mk('line', { x1: X(stemX(z)) + 2, y1: Y(z), x2: X(stemX(z)) + 8, y2: Y(z), stroke: '#16161a', 'stroke-width': 1 }, g);
      txt(g, X(stemX(z)) + 10, Y(z) + 3, String(z), { 'font-size': 7.5, fill: '#6b6b74' });
    }

    /* винт и перо руля */
    const rv = Math.min(0.312 * T * 2, 2.5) / 1; // ~половина d_гв
    const pc = { x: 2.5, z: 0.7 + rv };
    mk('circle', { cx: X(pc.x), cy: Y(pc.z), r: rv * s, fill: 'none', stroke: '#6b6b74', 'stroke-width': 1, 'stroke-dasharray': '3 3' }, g);
    mk('ellipse', { cx: X(pc.x), cy: Y(pc.z + rv / 2), rx: 2.5, ry: rv / 2 * s, fill: '#3a3a42' }, g);
    mk('ellipse', { cx: X(pc.x), cy: Y(pc.z - rv / 2), rx: 2.5, ry: rv / 2 * s, fill: '#3a3a42' }, g);
    mk('path', {
      d: `M ${X(1.1)} ${Y(0.9)} L ${X(-0.7)} ${Y(1.1)} L ${X(-0.9)} ${Y(4.9)} L ${X(0.9)} ${Y(5.1)} Z`,
      fill: '#e3e7ef', stroke: '#16161a', 'stroke-width': 1.1
    }, g);

    /* гребёнка шпаций на основной линии */
    if (p.combs && p.a) {
      for (let x = xap, i = 0; x <= xfp + 1e-6; x += p.a, i++) {
        const tall = (p.ar && Math.round(x / p.a) % Math.round(p.ar / p.a) === 0);
        mk('line', { x1: X(x), y1: Y(0), x2: X(x), y2: Y(0) + (tall ? 7 : 3.5), stroke: '#16161a', 'stroke-width': tall ? 0.9 : 0.5 }, g);
      }
      txt(g, X(xap + 1), Y(0) + 17, 'шкала практических шпаций (высокие штрихи — рамные)', { 'font-size': 9.5, fill: '#6b6b74' });
    }

    /* флажки xg / xc и прочие метки */
    (p.flags || []).forEach(f => {
      const z0 = f.z != null ? f.z : T;
      mk('line', { x1: X(f.x), y1: Y(0), x2: X(f.x), y2: Y(z0 + 3.2), stroke: f.color, 'stroke-width': 1.2, 'stroke-dasharray': '5 3' }, g);
      mk('path', { d: `M ${X(f.x)} ${Y(z0 + 3.2)} l 0 -8 l 26 4 Z`, fill: f.color }, g);
      txt(g, X(f.x) + 3, Y(z0 + 3.2) + 12, f.label, { 'font-size': 10.5, fill: f.color, 'font-weight': 600 });
    });

    /* размерные линии */
    if (p.dims) {
      const dim = (x1, x2, zrow, label) => {
        const y = baseY + zrow;
        mk('line', { x1: X(x1), y1: Y(0) + 2, x2: X(x1), y2: y + 4, stroke: '#9a9aa2', 'stroke-width': .6 }, g);
        mk('line', { x1: X(x2), y1: Y(0) + 2, x2: X(x2), y2: y + 4, stroke: '#9a9aa2', 'stroke-width': .6 }, g);
        mk('line', { x1: X(x1), y1: y, x2: X(x2), y2: y, stroke: '#16161a', 'stroke-width': .9, 'marker-start': 'url(#sd-s)', 'marker-end': 'url(#sd-e)' }, g);
        txt(g, (X(x1) + X(x2)) / 2, y - 3, label, { 'font-size': 10, 'text-anchor': 'middle', fill: '#16161a', 'font-weight': 600 });
      };
      const defs = mk('defs', {}, svg);
      defs.innerHTML = `<marker id="sd-e" markerWidth="9" markerHeight="8" refX="8" refY="4" orient="auto">
          <path d="M0,0 L9,4 L0,8 z" fill="#16161a"/></marker>
        <marker id="sd-s" markerWidth="9" markerHeight="8" refX="1" refY="4" orient="auto">
          <path d="M9,0 L0,4 L9,8 z" fill="#16161a"/></marker>`;
      let xr = xap;
      dim(0, xap, 30, `lап ${fmt1(p.lap)}`);
      dim(xr, xr + p.lmo, 30, `МО ${fmt1(p.lmo)}`); xr += p.lmo;
      const rev = (p.holds || []).slice().reverse();
      rev.forEach((lh, i) => {
        dim(xr, xr + lh, 30, `${p.type === 'tank' ? 'танк' : 'трюм'} ${p.holds.length - i} · ${fmt1(lh)}`);
        xr += lh;
      });
      dim(xfp, L, 30, `lфп ${fmt1(p.lfp)}`);
      dim(0, L, 52, `L = ${fmt1(L)} м (между перпендикулярами)`);
      // вертикальные размеры у форштевня
      const vdim = (xcol, z1, z2, label) => {
        const x = X(L + xcol);
        mk('line', { x1: x, y1: Y(z1), x2: x, y2: Y(z2), stroke: '#16161a', 'stroke-width': .9, 'marker-start': 'url(#sd-s)', 'marker-end': 'url(#sd-e)' }, g);
        txt(g, x + 3, (Y(z1) + Y(z2)) / 2 + 3, label, { 'font-size': 10, fill: '#16161a', 'font-weight': 600 });
      };
      vdim(6.2, 0, T, `T ${fmt1(T)}`);
      vdim(10.6, 0, H, `H ${fmt1(H)}`);
      mk('line', { x1: X(L + 2), y1: Y(0), x2: X(L + 12.6), y2: Y(0), stroke: '#9a9aa2', 'stroke-width': .6 }, g);
      mk('line', { x1: X(L + 4.4), y1: Y(T), x2: X(L + 8), y2: Y(T), stroke: '#9a9aa2', 'stroke-width': .6 }, g);
      mk('line', { x1: X(L - 2), y1: Y(H), x2: X(L + 12.6), y2: Y(H), stroke: '#9a9aa2', 'stroke-width': .6 }, g);
    }

    /* подписи отсеков */
    const lbl = (x, sText) => txt(g, X(x), Y(0.55 * T) + 4, sText, { 'font-size': 10.5, 'text-anchor': 'middle', fill: '#3a3a42', 'font-style': 'italic' });
    lbl(xap + p.lmo / 2, 'МО');
    let xh = xap + p.lmo;
    (p.holds || []).slice().reverse().forEach((lh, i, arr) => {
      lbl(xh + lh / 2, p.type === 'tank' ? `танк ${arr.length - i}` : `трюм ${arr.length - i}`);
      xh += lh;
    });
    txt(g, X(L - p.lfp / 2) - 4, Y(0.72 * T), 'форпик', { 'font-size': 9.5, 'text-anchor': 'middle', fill: '#3a3a42', 'font-style': 'italic', transform: `rotate(-70 ${X(L - p.lfp / 2) - 4} ${Y(0.72 * T)})` });
    txt(g, X(p.lap * 0.62), Y(0.9 * T), 'ахтерпик', { 'font-size': 9.5, 'text-anchor': 'middle', fill: '#3a3a42', 'font-style': 'italic', transform: `rotate(-70 ${X(p.lap * 0.62)} ${Y(0.9 * T)})` });
    /* перпендикуляры */
    [[0, 'КП'], [L, 'НП']].forEach(([x, t]) => {
      mk('line', { x1: X(x), y1: Y(-1.2), x2: X(x), y2: Y(H + 3), stroke: '#6b6b74', 'stroke-width': .7, 'stroke-dasharray': '10 4 2 4' }, g);
      txt(g, X(x) + 2, Y(H + 3) + 2, t, { 'font-size': 9.5, fill: '#6b6b74' });
    });
  }

  /* ------------------------------------------------------------------ *
   *  План верхней палубы: p = { L,B, lap,lmo,lfp, holds, bdb, lk отн.
   *        комингс bk, lyut } — люки, МО, надстройка.
   * ------------------------------------------------------------------ */
  function drawPlan(svg, p) {
    const L = p.L, B = p.B;
    svg.innerHTML = '';
    const W = 1120, Hpx = 210;
    const mx = 34, s = (W - mx - 60) / (L + 16);
    const cy = Hpx / 2;
    const X = x => mx + (x + 7) * s;
    const Yh = y => cy - y * s;   // y — полуширота
    svg.setAttribute('viewBox', `0 0 ${W} ${Hpx}`);
    const g = mk('g', {}, svg);

    /* контур палубы */
    const half = x => {
      const xs0 = 0.22 * L, xn0 = 0.70 * L, bowX = L + 1.2;
      if (x <= xs0) {
        // кормовой обвод: от ширины транца плавно к полной ширине палубы;
        // функция одна и та же для обоих бортов — контур строго симметричен
        const v = Math.max(0, Math.min(1, (x + 2.6) / (xs0 + 2.6)));
        return B / 2 * (0.34 + 0.66 * Math.pow(Math.sin(Math.PI / 2 * v), 1.25));
      }
      if (x >= xn0) {
        const u = Math.max(0, (bowX - x) / (bowX - xn0));
        return B / 2 * Math.pow(Math.sin(Math.PI / 2 * u), 0.82);
      }
      return B / 2;
    };
    let d = `M ${X(-2.6)} ${Yh(half(-2.6))}`;
    for (let x = -2.6; x <= L + 1.2; x += L / 140) d += ` L ${X(x)} ${Yh(half(x))}`;
    for (let x = L + 1.2; x >= -2.6; x -= L / 140) d += ` L ${X(x)} ${Yh(-half(x))}`;
    d += ' Z';   // замыкание по транцу — обе ветви симметричны относительно ЦЛ
    mk('path', { d, fill: '#f6f8fc', stroke: '#16161a', 'stroke-width': 1.6 }, g);
    /* ЦЛ */
    mk('line', { x1: X(-6), y1: cy, x2: X(L + 6), y2: cy, stroke: '#6b6b74', 'stroke-width': .7, 'stroke-dasharray': '12 4 2 4' }, g);

    /* двойной борт (от переборки форпика до носовой переборки МО) */
    const xfp = L - p.lfp, xmoN = p.lap + p.lmo;
    [1, -1].forEach(sg => mk('line', {
      x1: X(xmoN), y1: Yh(sg * (B / 2 - p.bdb)), x2: X(xfp), y2: Yh(sg * (B / 2 - p.bdb)),
      stroke: '#2b4fa0', 'stroke-width': 1, 'stroke-dasharray': '6 4'
    }, g));

    /* переборки */
    const bh = [p.lap, xmoN];
    let xc = xmoN;
    (p.holds || []).slice().reverse().slice(0, -1).forEach(lh => { xc += lh; bh.push(xc); });
    bh.push(xfp);
    bh.forEach(x => mk('line', { x1: X(x), y1: Yh(half(x)), x2: X(x), y2: Yh(-half(x)), stroke: '#9c2b22', 'stroke-width': 1.1, 'stroke-dasharray': '4 3' }, g));

    /* грузовая зона: у танкера — танки с продольной переборкой по ДП и
       небольшими горловинами, у сухогруза — грузовые люки по обводам */
    let xn = xfp;
    const gap = Math.max(0.8, p.bdb || 1.6);        // проход между комингсом и бортом
    const isTank = p.type === 'tank';
    if (isTank) {
      // продольная переборка по диаметральной плоскости грузовой зоны
      mk('line', { x1: X(xmoN), y1: cy, x2: X(xfp), y2: cy, stroke: '#9c2b22', 'stroke-width': 1.6 }, g);
      txt(g, X((xmoN + xfp) / 2), cy - 6, 'продольная переборка', { 'font-size': 10, 'text-anchor': 'middle', fill: '#9c2b22' });
    }
    (p.holds || []).forEach((lh, i) => {
      const xk = xn - lh, c0 = xk + 0.1 * lh, cw = 0.8 * lh;
      const halfHatch = x => Math.max(0.6, Math.min(p.bk / 2, half(x) - gap));
      if (isTank) {
        // два танка (левый и правый борт) в пределах обводов
        [1, -1].forEach(sg => {
          const pts = [];
          for (let x = xk + 0.04 * lh; x <= xk + 0.96 * lh; x += lh / 24)
            pts.push([x, Math.max(0.5, half(x) - (p.bdb || 1.6) * 0.5)]);
          let d3 = `M ${X(pts[0][0])} ${Yh(sg * 0.6)}`;
          for (const [x, h] of pts) d3 += ` L ${X(x)} ${Yh(sg * h)}`;
          d3 += ` L ${X(pts[pts.length - 1][0])} ${Yh(sg * 0.6)} Z`;
          mk('path', { d: d3, fill: 'rgba(21,94,117,.07)', stroke: '#16161a', 'stroke-width': 1 }, g);
          txt(g, X(xk + lh / 2), cy + sg * (half(xk + lh / 2) * 0.5) * s + 4,
            `танк ${i + 1} ${sg > 0 ? 'лв' : 'пр'}`, { 'font-size': 10, 'text-anchor': 'middle', fill: '#3a3a42', 'font-style': 'italic' });
          // горловина — ближе к переборке, чтобы не перекрывать подпись
          mk('circle', { cx: X(xk + 0.18 * lh), cy: cy + sg * half(xk + 0.18 * lh) * 0.45 * s, r: 3.4,
            fill: '#fff', stroke: '#16161a', 'stroke-width': 1 }, g);
        });
        xn = xk;
        return;
      }
      const pts = [];
      for (let x = c0; x <= c0 + cw + 1e-9; x += cw / 24) pts.push([x, halfHatch(x)]);
      let d2 = `M ${X(pts[0][0])} ${Yh(pts[0][1])}`;
      for (const [x, h] of pts) d2 += ` L ${X(x)} ${Yh(h)}`;
      for (let k = pts.length - 1; k >= 0; k--) d2 += ` L ${X(pts[k][0])} ${Yh(-pts[k][1])}`;
      d2 += ' Z';
      mk('path', { d: d2, fill: '#fff', stroke: '#16161a', 'stroke-width': 1.15 }, g);
      txt(g, X(c0 + cw / 2), cy + 4, `трюм ${i + 1}`, { 'font-size': 11, 'text-anchor': 'middle', fill: '#3a3a42', 'font-style': 'italic' });
      xn = xk;
    });

    /* надстройка и шахта МО: симметрично относительно диаметральной плоскости
       и в пределах корпуса (ширина по палубе в этом сечении) */
    const supL = p.lyut ? p.lyut * 0.82 : 20;
    const supX0 = Math.max(2.5, p.lap * 0.6);           // от кормового контура в нос
    // полуширина надстройки — по фактической ширине палубы в её кормовом сечении
    const supHalf = Math.min(0.36 * B, half(supX0) * 0.88);
    mk('rect', {
      x: X(supX0), y: Yh(supHalf), width: supL * s, height: 2 * supHalf * s,
      rx: 7, fill: '#eef3ff', stroke: '#16161a', 'stroke-width': 1.2
    }, g);
    txt(g, X(supX0 + supL / 2), cy - supHalf * s * 0.45, 'надстройка', { 'font-size': 10.5, 'text-anchor': 'middle', fill: '#3a3a42', 'font-style': 'italic' });
    // труба — на диаметральной плоскости, над машинным отделением
    const fx = supX0 + supL * 0.62;
    mk('ellipse', { cx: X(fx), cy: cy, rx: 2.3 * s, ry: 1.5 * s, fill: '#d9e2f4', stroke: '#16161a', 'stroke-width': 1.1 }, g);
    txt(g, X(fx) + 2.6 * s + 6, cy + 4, 'труба', { 'font-size': 9.5, 'text-anchor': 'start', fill: '#6b6b74' });
    txt(g, X(supX0 + supL / 2), cy + supHalf * s * 0.62, 'МО', { 'font-size': 10.5, 'text-anchor': 'middle', fill: '#3a3a42', 'font-style': 'italic' });

    /* перпендикуляры и ширина */
    [[0, 'КП'], [L, 'НП']].forEach(([x, t]) => {
      mk('line', { x1: X(x), y1: Yh(B / 2 + 2.2), x2: X(x), y2: Yh(-B / 2 - 2.2), stroke: '#6b6b74', 'stroke-width': .7, 'stroke-dasharray': '10 4 2 4' }, g);
      txt(g, X(x) + 2, Yh(B / 2 + 2.2) + 8, t, { 'font-size': 9.5, fill: '#6b6b74' });
    });
    const xd = X(L * 0.47);
    mk('line', { x1: xd, y1: Yh(B / 2), x2: xd, y2: Yh(-B / 2), stroke: '#16161a', 'stroke-width': .9 }, g);
    [Yh(B / 2), Yh(-B / 2)].forEach(y => mk('line', { x1: xd - 4, y1: y, x2: xd + 4, y2: y, stroke: '#16161a', 'stroke-width': .9 }, g));
    txt(g, xd, Yh(B / 2) - 6, `B = ${fmt1(B)} м`, { 'font-size': 10, fill: '#16161a', 'font-weight': 600, 'text-anchor': 'middle' });
  }

  return { drawSide, drawPlan, mk, txt };
})();
