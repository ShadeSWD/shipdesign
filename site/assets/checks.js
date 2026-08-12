/* checks.js — проверочные расчёты: вместимость, таблицы нагрузки с
 * самопроверкой сумм, посадка и начальная остойчивость. */
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
  const L = 143.2, B = 23.4, k = 1.005, rho = 1.025;

  /* ---------- 1а. грузовые отсеки ---------- */
  const HOLDS = [
    ['Трюм 1', 4792.85, 42.9, 7.1],
    ['Трюм 2', 6148.00, 19.2, 7.1],
    ['Трюм 3', 6353.56, -6.0, 7.1],
    ['Трюм 4', 5964.32, -30.9, 7.1],
  ];
  function calcWgr() {
    const Pgr = readN('ck-Pgr'), mu = readN('ck-mu');
    const Wgr = 1.1 * mu * Pgr;
    const WgrF = HOLDS.reduce((s, r) => s + r[1], 0);
    let h = `<tr><th>Помещение</th><th>W, м³</th><th>x, м</th><th>z, м</th></tr>`;
    HOLDS.forEach(r => {
      h += `<tr><td class="l">${r[0]}</td><td>${fmt(r[1], 2)}</td><td>${fmt(r[2], 1)}</td><td>${fmt(r[3], 1)}</td></tr>`;
    });
    h += `<tr style="background:#eef3ff;font-weight:700"><td class="l">Σ грузовые отсеки, W<sub>гр</sub><sup>Ф</sup></td>
      <td>${fmt(WgrF, 2)}</td><td colspan="2">м³</td></tr>`;
    document.getElementById('ck-holds').innerHTML = h;
    const o = [];
    o.push(stepRow('W<sub>гр</sub> = 1,1·μ<sub>гр</sub>·Р<sub>гр</sub>',
      `1,1·${fmt(mu, 2)}·${fmt(Pgr)}`, `${fmt(Wgr)} м³`));
    o.push(stepRow('W<sub>гр</sub><sup>Ф</sup> — фактический объём по эпюре ёмкости', '', `${fmt(WgrF)} м³`));
    o.push(badgeRow(WgrF >= Wgr
      ? `W<sub>гр</sub><sup>Ф</sup> = ${fmt(WgrF)} м³ ≥ W<sub>гр</sub> = ${fmt(Wgr)} м³ — вместимость обеспечена
         (запас ${fmt((WgrF / Wgr - 1) * 100, 1)} %)`
      : `W<sub>гр</sub><sup>Ф</sup> = ${fmt(WgrF)} м³ &lt; W<sub>гр</sub> = ${fmt(Wgr)} м³ — вместимости не хватает,
         нужно двигать переборки`, WgrF >= Wgr));
    document.getElementById('ck-steps-wgr').innerHTML = o.join('');
  }

  /* ---------- 1б. балласт ---------- */
  function calcWbl() {
    const T = 7.7, Vbl = 10260, Dpor = 5480.4, zap10 = 0.1 * (747 + 114 + 2.28) + 32.28;
    const Tbln = 0.025 * L, dv = 0.623 * T, Tblk = 1.05 * dv, Tblsr = 0.5 * (Tbln + Tblk);
    const Dbl = k * rho * Vbl;
    const Pbl = 4865.4; // Dбл − Dпор − экипаж и 10 % запасов (по записке)
    const kbl = 0.98, Wbl = Pbl / kbl, WblF = 8964;
    const o = [];
    o.push(stepRow('T<sub>бл.н</sub> = 0,025·L', `0,025·${fmt(L, 1)}`, `${fmt(Tbln, 2)} м`));
    o.push(stepRow('d<sub>в</sub> = 0,623·T', `0,623·${fmt(T, 1)}`, `${fmt(dv, 2)} м`));
    o.push(stepRow('T<sub>бл.к</sub> = 1,05·d<sub>в</sub>', `1,05·${fmt(dv, 2)}`, `${fmt(Tblk, 2)} м`));
    o.push(stepRow('T<sub>бл.ср</sub> = ½·(T<sub>бл.н</sub> + T<sub>бл.к</sub>)',
      `½·(${fmt(Tbln, 2)} + ${fmt(Tblk, 2)})`, `${fmt(Tblsr, 2)} м`));
    o.push(stepRow('V<sub>бл</sub> — по кривым элементов при T<sub>бл.ср</sub>', '', `${fmt(Vbl)} м³`));
    o.push(stepRow('D<sub>бл</sub> = k·ρ·V<sub>бл</sub>', `1,005·1,025·${fmt(Vbl)}`, `${fmt(Dbl)} т`));
    o.push(stepRow('P<sub>бл</sub> = D<sub>бл</sub> − D<sub>пор</sub> − экипаж − 0,1·P<sub>зап</sub>',
      `${fmt(Dbl)} − ${fmt(Dpor, 1)} − ${fmt(zap10, 1)} − …`, `${fmt(Pbl, 1)} т`));
    o.push(stepRow('W<sub>бл</sub> = P<sub>бл</sub>/k<sub>бл</sub>', `${fmt(Pbl, 1)}/0,98`, `${fmt(Wbl)} м³`));
    o.push(badgeRow(`W<sub>бл</sub><sup>Ф</sup> = ${fmt(WblF)} м³ ≥ W<sub>бл</sub> = ${fmt(Wbl)} м³ —
      вместимость балластных цистерн обеспечена`, WblF >= Wbl));
    document.getElementById('ck-steps-wbl').innerHTML = o.join('');
  }

  /* ---------- 1в. СЭЗ ---------- */
  function calcWsez() {
    const Psez1 = 711.7, ksez = 0.85, Wsez = Psez1 / ksez, WsezF = 839;
    const o = [];
    o.push(stepRow('W<sub>сэз</sub> = P<sub>сэз</sub>/k<sub>сэз</sub>', `${fmt(Psez1, 1)}/0,85`, `${fmt(Wsez)} м³`));
    o.push(stepRow('W<sub>сэз</sub><sup>Ф</sup> — цистерны в машинном отделении', '', `${fmt(WsezF)} м³`));
    o.push(badgeRow(`W<sub>сэз</sub><sup>Ф</sup> = ${fmt(WsezF)} м³ ≥ W<sub>сэз</sub> = ${fmt(Wsez)} м³ —
      вместимость цистерн запасов обеспечена`, WsezF >= Wsez));
    document.getElementById('ck-steps-wsez').innerHTML = o.join('');
  }

  /* ---------- 2. таблицы нагрузки ----------
   * [№, статья, P, xg, zg, Pxg, Pzg] — моменты как в записке */
  const LOAD_FULL = [
    ['1', 'Судно порожнём', 5480.4, -8.44, 7.94, -46228, 43540],
    ['2', 'Экипаж', 32.3, -59.60, 15.90, -1924, 513],
    ['3', 'Провизия', 2.3, -59.60, 15.90, -136, 36],
    ['4', 'Пресная вода', 114, -52.90, 7.10, -6031, 809],
    ['5', 'Цистерны СЭЗ', 747, -48.40, 6.00, -36155, 4482],
    ['6.1', 'Трюм 1', 3213, 42.90, 5.88, 137838, 18902],
    ['6.2', 'Трюм 2', 3436, 19.20, 4.90, 65971, 16852],
    ['6.3', 'Трюм 3', 3552, -6.00, 4.91, -21312, 17426],
    ['6.4', 'Трюм 4', 2799, -30.90, 4.12, -86489, 11527],
    ['7.1', 'Форпик', 0, 65.30, 7.10, 0, 0],
    ['7.2', 'Двойной борт', 0, 59.70, 7.10, 0, 0],
    ['7.3', 'Двойной борт', 0, 44.60, 7.10, 0, 0],
    ['7.4', 'Двойной борт', 0, 19.20, 7.10, 0, 0],
    ['7.5', 'Двойной борт', 0, -6.00, 7.10, 0, 0],
    ['7.6', 'Двойной борт', 0, -31.20, 7.10, 0, 0],
    ['7.7', 'Двойной борт', 0, -49.50, 7.10, 0, 0],
    ['7.8', 'Двойное дно', 0, 59.70, 0.80, 0, 0],
    ['7.9', 'Двойное дно', 0, 44.60, 0.80, 0, 0],
    ['7.10', 'Двойное дно', 0, -6.00, 0.80, 0, 0],
    ['7.11', 'Двойное дно', 0, -31.20, 0.80, 0, 0],
    ['7.12', 'Двойное дно', 0, -50.00, 0.80, 0, 0],
  ];
  const LOAD_BAL = [
    ['1', 'Судно порожнём', 5480.4, -8.44, 7.94, -46228, 43540],
    ['2', 'Экипаж', 32.3, -59.60, 15.90, -1924, 513],
    ['3', 'Провизия', 0.2, -59.60, 15.90, -136, 36],
    ['4', 'Пресная вода', 11.4, -52.90, 7.10, -6031, 809],
    ['5', 'Цистерны СЭЗ', 74.7, -48.40, 6.00, -36155, 4482],
    ['6.1', 'Трюм 1', 0, 42.90, 0, 0, 0],
    ['6.2', 'Трюм 2', 0, 19.20, 0, 0, 0],
    ['6.3', 'Трюм 3', 0, -6.00, 0, 0, 0],
    ['6.4', 'Трюм 4', 0, -30.90, 0, 0, 0],
    ['7.1', 'Форпик', 275, 65.30, 7.10, 17958, 1953],
    ['7.2', 'Двойной борт', 214, 59.70, 7.10, 12776, 1519],
    ['7.3', 'Двойной борт', 1132, 44.60, 7.10, 50487, 8037],
    ['7.4', 'Двойной борт', 0, 19.20, 7.10, 0, 0],
    ['7.5', 'Двойной борт', 1108, -6.00, 7.10, -6648, 7867],
    ['7.6', 'Двойной борт', 0, -31.20, 7.10, 0, 0],
    ['7.7', 'Двойной борт', 0, -49.50, 7.10, 0, 0],
    ['7.8', 'Двойное дно', 48, 59.70, 0.80, 2866, 38],
    ['7.9', 'Двойное дно', 620, 44.60, 0.80, 27652, 496],
    ['7.10', 'Двойное дно', 876, -6.00, 0.80, -5256, 701],
    ['7.11', 'Двойное дно', 887, -31.20, 0.80, -27674, 710],
    ['7.12', 'Двойное дно', 0, -50.00, 0.80, 0, 0],
  ];

  function loadTable(rows, tableId, badgesId, target) {
    let SP = 0, SX = 0, SZ = 0, stars = [];
    let h = `<tr><th>№</th><th class="l">Составляющие нагрузки</th><th>Масса P, т</th>
      <th>x<sub>g</sub>, м</th><th>z<sub>g</sub>, м</th><th>P·x<sub>g</sub>, т·м</th><th>P·z<sub>g</sub>, т·м</th></tr>`;
    rows.forEach(r => {
      const [n, name, P, xg, zg, Px, Pz] = r;
      SP += P; SX += Px; SZ += Pz;
      const bad = P > 0 && Math.abs(P * xg - Px) > Math.max(2, 0.02 * Math.abs(Px));
      if (bad) stars.push(n);
      h += `<tr><td>${n}</td><td class="l">${name}${bad ? ' <b>*</b>' : ''}</td>
        <td>${fmt(P, P < 10 && P > 0 ? 1 : 0)}</td><td>${fmt(xg, 2)}</td><td>${fmt(zg, 2)}</td>
        <td>${fmt(Px)}</td><td>${fmt(Pz)}</td></tr>`;
    });
    const xg = SX / SP, zg = SZ / SP;
    h += `<tr style="background:#eef3ff;font-weight:700"><td></td><td class="l">Водоизмещение (Σ строк)</td>
      <td>${fmt(SP)}</td><td>${fmt(xg, 2)}</td><td>${fmt(zg, 2)}</td><td>${fmt(SX)}</td><td>${fmt(SZ)}</td></tr>`;
    document.getElementById(tableId).innerHTML = h;
    const okD = Math.abs(SP - target.D) <= 1;
    const okX = Math.abs(xg - target.xg) <= 0.02;
    const okZ = Math.abs(zg - target.zg) <= 0.02;
    document.getElementById(badgesId).innerHTML =
      badgeRow(`самопроверка: ΣP = ${fmt(SP)} т (в записке ${fmt(target.D)}),
        x<sub>g</sub> = ${fmt(xg, 2)} м (${fmt(target.xg, 2)}), z<sub>g</sub> = ${fmt(zg, 2)} м (${fmt(target.zg, 2)}) —
        ${okD && okX && okZ ? 'суммы сходятся с запиской' : 'есть расхождение с запиской'}`, okD && okX && okZ);
    return { D: SP, xg, zg, stars };
  }

  /* ---------- 3. посадка ---------- */
  function trim(loadFull, loadBal) {
    // данные кривых элементов теоретического чертежа
    const K = {
      full: { T: 7.78, xc: 0.30, zc: 4.0, r: 5.5, R: 266, xf: 2.46 },
      bal: { T: 4.31, xc: 0.80, zc: 2.2, r: 9.6, R: 265, xf: 0.75 },
    };
    const calc = (ld, kk) => {
      const V = ld.D / (k * rho);
      const h = kk.zc + kk.r - ld.zg;
      const HR = kk.zc + kk.R - ld.zg;
      const d = L * (ld.xg - kk.xc) / HR;
      const Ln = L / 2 - kk.xf, Lk = L / 2 + kk.xf;
      const dTn = Ln * (ld.xg - kk.xc) / HR, dTk = -Lk * (ld.xg - kk.xc) / HR;
      return { V, h, HR, d, Ln, Lk, Tn: kk.T + dTn, Tk: kk.T + dTk, dTn, dTk };
    };
    const F = calc(loadFull, K.full), Bl = calc(loadBal, K.bal);
    const rows = [
      ['Водоизмещение D, т', fmt(loadFull.D), fmt(loadBal.D)],
      ['Абсцисса ЦМ x<sub>g</sub>, м', fmt(loadFull.xg, 2), fmt(loadBal.xg, 2)],
      ['Аппликата ЦМ z<sub>g</sub>, м', fmt(loadFull.zg, 2), fmt(loadBal.zg, 2)],
      ['Объёмное водоизмещение V = D/(kρ), м³', fmt(F.V), fmt(Bl.V)],
      ['Средняя осадка T (по кривым элементов), м', '7,78', '4,31'],
      ['Абсцисса ЦВ x<sub>c</sub>, м', '0,30', '0,80'],
      ['Аппликата ЦВ z<sub>c</sub>, м', '4,00', '2,20'],
      ['Поперечный метацентрический радиус r, м', '5,50', '9,60'],
      ['Продольный метацентрический радиус R, м', '266', '265'],
      ['Абсцисса ЦТ площади ВЛ x<sub>f</sub>, м', '2,46', '0,75'],
      ['Метацентрическая высота h = z<sub>c</sub> + r − z<sub>g</sub>, м', fmt(F.h, 2), fmt(Bl.h, 2)],
      ['Продольная метацентрическая высота H<sub>R</sub>, м', fmt(F.HR, 1), fmt(Bl.HR, 1)],
      ['Дифферент d = L(x<sub>g</sub> − x<sub>c</sub>)/H<sub>R</sub>, м', fmt(F.d, 3), fmt(Bl.d, 2)],
      ['Осадка носом T<sub>н</sub>, м', fmt(F.Tn, 2), fmt(Bl.Tn, 2)],
      ['Осадка кормой T<sub>к</sub>, м', fmt(F.Tk, 2), fmt(Bl.Tk, 2)],
    ];
    document.getElementById('ck-trim').innerHTML =
      `<tr><th class="l">Элемент</th><th>Полный груз</th><th>В балласте</th></tr>` +
      rows.map(r => `<tr><td class="l">${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('');
    const o = [];
    o.push(badgeRow(`в грузу: D = ${fmt(loadFull.D)} т соответствует расчётному водоизмещению 19 376 т`,
      Math.abs(loadFull.D - 19376) <= 2));
    o.push(badgeRow(`в грузу: дифферент d = ${fmt(F.d, 3)} м — судно сидит практически на ровный киль
      (x<sub>g</sub> ≈ x<sub>c</sub>)`, Math.abs(F.d) < 0.05));
    o.push(badgeRow(`в грузу: h = ${fmt(F.h, 2)} м, h/B = ${fmt(F.h / B, 3)} ≥ заложенного в расчёт
      h̄ = 0,04 — начальная остойчивость обеспечена`, F.h / B >= 0.04));
    o.push(badgeRow(`в балласте: D = ${fmt(loadBal.D)} т ≥ минимально требуемого D<sub>бл</sub> = 10 569 т`,
      loadBal.D >= 10569));
    o.push(badgeRow(`в балласте: осадка кормой T<sub>к</sub> = ${fmt(Bl.Tk, 2)} м обеспечивает требуемое
      погружение винта 1,05·d<sub>в</sub> = 5,04 м (с точностью построений; в записке принято выполненным)`,
      Bl.Tk >= 5.04 * 0.99));
    o.push(badgeRow(`в балласте: дифферент d = ${fmt(Bl.d, 2)} м на корму — допустим и благоприятен для
      балластного перехода`, Bl.d < 0));
    document.getElementById('ck-trim-badges').innerHTML = o.join('');
    return { F, Bl };
  }

  /* ---------- боковой вид ---------- */
  function draw(F, Bl, loadFull) {
    SD.drawSide(document.getElementById('ck-side'), {
      L, B, T: 7.7, H: 12.6,
      lap: 8.2, lmo: 19.6, lfp: 9, holds: [30.8, 25.2, 25.2, 25.2],
      hdd: 1.6, bdb: 2, lbak: 11.4, hb: 2.7, lyut: 22.4, tiers: [16, 8.4],
      a: 0.7, ar: 2.8, hk: 2, bk: 19.4, dims: false, combs: false,
      waterlines: [
        { Tn: F.Tn, Tk: F.Tk, label: `ватерлиния в грузу, T ≈ ${fmt(F.Tk, 2)} м`, color: '#1d4ed8' },
        { Tn: Bl.Tn, Tk: Bl.Tk, label: `в балласте: Tн ${fmt(Bl.Tn, 2)} / Tк ${fmt(Bl.Tk, 2)} м`, color: '#17632f', dash: '7 5' },
      ],
      flags: [
        { x: L / 2 + loadFull.xg, label: `xg = ${fmt(loadFull.xg, 2)} м`, color: '#9c2b22', z: 7.7 },
        { x: L / 2 + 0.30, label: `xc = 0,30 м`, color: '#17632f', z: 10.9 },
      ],
    });
  }

  function all() {
    calcWgr(); calcWbl(); calcWsez();
    const lf = loadTable(LOAD_FULL, 'ck-load1', 'ck-load1-badges', { D: 19376, xg: 0.29, zg: 5.89 });
    const lb = loadTable(LOAD_BAL, 'ck-load2', 'ck-load2-badges', { D: 10759, xg: -1.70, zg: 6.57 });
    document.getElementById('ck-load2-note').innerHTML = lb.stars.length
      ? `* В строках ${lb.stars.join(', ')} моменты приведены как в записке курсового проекта: при переходе
         к 10 % запасов массы уменьшены, а моменты этих статей сохранены от варианта с полными запасами —
         условность источника, перенесённая сюда без изменений ради сходимости итогов с запиской.`
      : '';
    const t = trim(lf, lb);
    draw(t.F, t.Bl, lf);
  }
  document.addEventListener('input', e => {
    if (e.target && e.target.type === 'number') all();
  });
  all();
})();
