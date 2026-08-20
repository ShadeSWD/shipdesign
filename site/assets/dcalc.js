/* dcalc.js — расчётное ядро разборов задач сайта «Проектирование судов».
 *
 * Здесь собраны все формулы, которые повторяются на страницах p-*.html
 * сквозного примера: уравнение масс в первом приближении и его итерации,
 * главные размерения и проверка соотношений, минимальный надводный борт,
 * гидростатика ватерлинии по Симпсону, вместимость и удельная погрузочная
 * кубатура, сопротивление по частям и пересчёт в мощность на валу,
 * начальная остойчивость с поправкой на свободные поверхности, диаграмма
 * статической остойчивости, непотопляемость методом приёма груза и
 * экономика рейса. Страницы только подставляют числа и печатают результат —
 * ни одна формула не повторяется в разметке и не дублируется между
 * страницами.
 *
 * Модуль чистый: не трогает DOM, не читает глобальные переменные.
 * В браузере доступен как window.DCALC, в node — как module.exports,
 * поэтому один и тот же код проверяется тестами (tests/test_dcalc.py).
 *
 * Судно сквозного примера — тот же сухогруз 100,0 × 15,3 × 8,3 м, что на
 * сайте кластера «Технология судостроения» (/shiptech/, секция СК-6 и
 * разбор спуска): два курса считают одно и то же судно с разных сторон.
 *
 * Самопроверка: DCALC.selftest() возвращает массив расхождений (пустой —
 * значит все контрольные точки сошлись). Контрольные точки посчитаны
 * независимо от кода: аналитически либо через обращение формулы.
 */
'use strict';
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.DCALC = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {

  var G = 9.81;             // м/с²
  var RHO = 1.025;          // т/м³, забортная вода
  var KN = 0.5144444;       // м/с в одном узле
  var NU = 1.1892e-6;       // м²/с, кинематическая вязкость морской воды, 15 °C
  var RHO_AIR = 1.226;      // кг/м³

  /* ==================================================================
   *  0. ЗАДАНИЕ И ПРОТОТИПНЫЕ КОЭФФИЦИЕНТЫ СКВОЗНОГО ПРИМЕРА
   * ================================================================== */

  /* Техническое задание на сухогруз сквозного примера. */
  var TASK = {
    Pgr: 4000,        // т, масса перевозимого груза
    v: 12.5,          // уз, скорость на тихой воде
    R: 4000,          // миль, дальность плавания
    crew: 14,         // человек
    auto: 20,         // сут, автономность по запасам
    Tmax: 6.7,        // м, ограничение по глубине портов захода
    Lmax: 105,        // м, ограничение по длине причала
    Bmax: 16.0,       // м, ограничение по ширине шлюза
  };

  /* Коэффициенты, снятые с судов-прототипов (см. sources.html). */
  var PROTO = {
    CL: 5.18,         // L / Δ^(1/3)
    LB: 6.54,         // L / B
    BT: 2.318,        // B / T
    HT: 1.258,        // H / T
    delta: 0.74,      // коэффициент общей полноты
    pk: 0.19,         // т/м³, измеритель массы корпуса, P(к)/(L·B·H)
    pm: 0.17,         // т/кВт, измеритель массы механизмов, P(мех)/N(e)
    pob: 0.42,        // т/м², измеритель массы оборудования, P(об)/(L·B)
    Cadm: 430,        // адмиралтейский коэффициент
    be: 195,          // г/(кВт·ч), удельный расход топлива главного двигателя
    bdg: 210,         // г/(кВт·ч), то же для дизель-генератора
    Ndg: 120,         // кВт, средняя нагрузка дизель-генераторов на ходу
    kMCR: 0.85,       // эксплуатационная доля номинальной мощности
    kres: 1.10,       // запас топлива на непредвиденные задержки
    margin: 0.02,     // запас водоизмещения, доля Δ
  };

  /* Принятые главные размерения после округления первого приближения.
     L, B, H — те же, что на сайте технологии судостроения. */
  var SHIP = { L: 100.0, B: 15.3, H: 8.3, T: 6.60, delta: 0.74 };

  /* Полушироты грузовой ватерлинии по десяти теоретическим шпациям,
     от кормового перпендикуляра к носовому (сняты с теоретического
     чертежа сквозного примера, м). */
  var WL = [3.30, 6.00, 7.25, 7.62, 7.65, 7.65, 7.65, 7.50, 6.70, 4.35, 0.45];

  /* ==================================================================
   *  1. УРАВНЕНИЕ МАСС
   * ================================================================== */

  /* Запасы на рейс: топливо главного двигателя и дизель-генераторов с
     запасом kres, масло, пресная вода, провизия, экипаж с багажом.
     Ne — номинальная мощность главного двигателя, кВт. Возвращает статьи
     в тоннах и их сумму. */
  function stores(Ne, task, proto) {
    var t = task || TASK, p = proto || PROTO;
    var hours = t.R / t.v;                                  // ходовое время, ч
    var fuelMain = p.kMCR * Ne * p.be / 1e6 * hours;        // т
    var fuelAux = p.Ndg * p.bdg / 1e6 * hours;
    var fuel = (fuelMain + fuelAux) * p.kres;
    var lube = 0.03 * fuel;
    var water = t.crew * t.auto * 0.12 + 5.0;               // питьевая и мытьевая + котельная
    var prov = t.crew * t.auto * 0.005;
    var people = t.crew * 0.13;                             // экипаж с багажом
    return {
      hours: hours, fuelMain: fuelMain, fuelAux: fuelAux, fuel: fuel,
      lube: lube, water: water, prov: prov, people: people,
      total: fuel + lube + water + prov + people,
    };
  }

  /* Мощность на валу по адмиралтейскому коэффициенту:
     C = Δ^(2/3)·v³/P  ⇒  P = Δ^(2/3)·v³/C   (Δ в т, v в узлах, P в кВт). */
  function admiraltyPower(D, v, C) { return Math.pow(D, 2 / 3) * v * v * v / C; }

  /* Обратная задача: адмиралтейский коэффициент по известной мощности. */
  function admiraltyCoef(D, v, P) { return Math.pow(D, 2 / 3) * v * v * v / P; }

  /* Один шаг метода последовательных приближений: по водоизмещению D
     получаем размерения и мощность, по ним — статьи масс, по статьям —
     новое водоизмещение. Возвращает всё промежуточное, чтобы страница
     могла напечатать каждую подстановку. */
  function massStep(D, task, proto) {
    var t = task || TASK, p = proto || PROTO;
    var L = p.CL * Math.cbrt(D);
    var B = L / p.LB;
    var T = B / p.BT;
    var H = p.HT * T;
    var Ne = admiraltyPower(D, t.v, p.Cadm);
    var Pk = p.pk * L * B * H;
    var Pm = p.pm * Ne;
    var Pob = p.pob * L * B;
    var res = p.margin * D;
    var st = stores(Ne, t, p);
    var Dn = Pk + Pm + Pob + res + st.total + t.Pgr;
    return {
      L: L, B: B, T: T, H: H, Ne: Ne,
      Pk: Pk, Pm: Pm, Pob: Pob, reserve: res, stores: st,
      light: Pk + Pm + Pob + res,
      dw: st.total + t.Pgr,
      D: Dn, resid: (Dn - D) / D,
    };
  }

  /* Итерации до сходимости. tol — допустимая относительная невязка.
     Возвращает массив шагов; последний элемент — принятое приближение. */
  function massIterate(D0, tol, maxIter, task, proto) {
    var eps = tol === undefined ? 0.005 : tol;
    var lim = maxIter || 20;
    var out = [], D = D0;
    for (var i = 0; i < lim; i++) {
      var s = massStep(D, task, proto);
      s.D0 = D;
      out.push(s);
      if (Math.abs(s.resid) < eps) break;
      D = s.D;
    }
    return out;
  }

  /* Водоизмещение по размерениям: Δ = ρ·δ·L·B·T. */
  function displacement(L, B, T, delta, rho) {
    return (rho || RHO) * delta * L * B * T;
  }

  /* Осадка, при которой уравнение плавучести даёт заданное Δ. */
  function draftFor(D, L, B, delta, rho) {
    return D / ((rho || RHO) * delta * L * B);
  }

  /* Проверка статей масс при принятых (округлённых) размерениях: те же
     измерители, но L, B, H уже назначены, а не получены из Δ. */
  function massCheck(ship, Ne, task, proto) {
    var t = task || TASK, p = proto || PROTO;
    var D = displacement(ship.L, ship.B, ship.T, ship.delta);
    var Pk = p.pk * ship.L * ship.B * ship.H;
    var Pm = p.pm * Ne;
    var Pob = p.pob * ship.L * ship.B;
    var res = p.margin * D;
    var st = stores(Ne, t, p);
    var light = Pk + Pm + Pob + res;
    var dw = st.total + t.Pgr;
    return {
      D: D, Pk: Pk, Pm: Pm, Pob: Pob, reserve: res, stores: st,
      light: light, dw: dw, sum: light + dw,
      resid: light + dw - D, residRel: (light + dw - D) / D,
      etaDW: dw / D,
    };
  }

  /* ==================================================================
   *  2. ГЛАВНЫЕ РАЗМЕРЕНИЯ
   * ================================================================== */

  /* Число Фруда по длине. v в узлах. */
  function froude(v, L) { return v * KN / Math.sqrt(G * L); }

  /* Коэффициент общей полноты по числу Фруда.
     Александер: δ = 1,06 − 1,68·Fr (нижняя граница разумного);
     ван Ламмерен: δ = 1,12 − 1,68·Fr (верхняя). */
  function deltaByFroude(Fr) {
    return { alexander: 1.06 - 1.68 * Fr, lammeren: 1.12 - 1.68 * Fr };
  }

  /* Соотношения главных размерений и их проверка по рекомендуемым
     диапазонам для сухогрузных судов. */
  var RATIO_RANGE = {
    LB: [5.5, 7.5], BT: [2.2, 2.7], HT: [1.20, 1.45],
    LH: [10.0, 13.0], BH: [1.6, 2.1],
  };

  function ratios(ship, range) {
    var r = range || RATIO_RANGE;
    var val = {
      LB: ship.L / ship.B, BT: ship.B / ship.T, HT: ship.H / ship.T,
      LH: ship.L / ship.H, BH: ship.B / ship.H,
    };
    var out = {};
    Object.keys(val).forEach(function (k) {
      out[k] = { value: val[k], lo: r[k][0], hi: r[k][1],
                 ok: val[k] >= r[k][0] && val[k] <= r[k][1] };
    });
    return out;
  }

  /* Минимальный надводный борт судна типа «B» по Правилам о грузовой марке.
     Ftab — табличный борт для длины L; поправки:
       * на коэффициент общей полноты при δ > 0,68: ×(δ + 0,68)/1,36;
       * на высоту борта при H > L/15: +(H − L/15)·R, R = L/0,48 при L < 120 м;
       * вычет за надстройки (доля их суммарной длины) — задаётся отдельно.
     Все величины в метрах. */
  function freeboardMin(L, H, delta, Ftab, deductSup) {
    var f1 = Ftab * (delta + 0.68) / 1.36;
    var Lstd = L / 15;
    var R = L < 120 ? L / 0.48 : 250;             // мм на метр превышения
    var fDepth = H > Lstd ? (H - Lstd) * R / 1000 : 0;
    var ded = deductSup || 0;
    return { tab: Ftab, afterDelta: f1, depthCorr: fDepth,
             deduct: ded, F: f1 + fDepth - ded };
  }

  /* ==================================================================
   *  3. ГИДРОСТАТИКА ВАТЕРЛИНИИ (ПРАВИЛО СИМПСОНА)
   * ================================================================== */

  /* Множители Симпсона для n интервалов (n чётное): 1,4,2,…,4,1. */
  function simpsonMult(n) {
    var m = [];
    for (var i = 0; i <= n; i++) m.push(i === 0 || i === n ? 1 : (i % 2 ? 4 : 2));
    return m;
  }

  /* Интеграл f по правилу Симпсона с шагом h. */
  function simpson(vals, h) {
    var m = simpsonMult(vals.length - 1), s = 0;
    for (var i = 0; i < vals.length; i++) s += m[i] * vals[i];
    return h / 3 * s;
  }

  /* Полная гидростатика площади ватерлинии по полуширотам y (от кормового
     перпендикуляра), длине L, ширине B, объёму V и осадке T.
     Возвращает площадь A, коэффициент полноты α, абсциссу центра тяжести
     площади xf (от КП), поперечный и продольный моменты инерции, метацентр. */
  function waterplane(y, L, B, V, T) {
    var n = y.length - 1, h = L / n;
    var x = y.map(function (_, i) { return i * h; });
    var A = 2 * simpson(y, h);
    var Mx = 2 * simpson(y.map(function (yy, i) { return yy * x[i]; }), h);
    var xf = Mx / A;
    var Ix = 2 / 3 * simpson(y.map(function (yy) { return yy * yy * yy; }), h);
    var IL0 = 2 * simpson(y.map(function (yy, i) { return yy * x[i] * x[i]; }), h);
    var IL = IL0 - A * xf * xf;
    /* Морриш: центр величины ниже ватерлинии на (T/2 + V/A)/3. */
    var KB = T - (T / 2 + V / A) / 3;
    return {
      A: A, alpha: A / (L * B), xf: xf, xfMid: xf - L / 2,
      Ix: Ix, IL: IL, BM: Ix / V, BML: IL / V, KB: KB, KM: KB + Ix / V,
      TPC: RHO * A / 100,
    };
  }

  /* Момент, дифферентующий на 1 см: MCT = Δ·GM(L)/(100·L), т·м/см. */
  function mct(D, GML, L) { return D * GML / (100 * L); }

  /* ==================================================================
   *  4. ВМЕСТИМОСТЬ
   * ================================================================== */

  /* Объём грузовых трюмов: коробка «длина × ширина между двойными бортами ×
     высота от второго дна до верхней палубы» с коэффициентом заполнения k,
     плюс объём люковых комингсов (зерновая вместимость). */
  function holdVolume(o) {
    var Bh = o.B - 2 * o.side;
    var box = o.k * o.Lh * Bh * (o.H - o.hdb);
    var coam = (o.hatches || 0) * (o.hatchL || 0) * (o.hatchB || 0) * (o.hatchH || 0);
    var grain = box + coam;
    return { Bh: Bh, box: box, coam: coam, grain: grain,
             bale: (o.kbale === undefined ? 0.95 : o.kbale) * grain };
  }

  /* Удельная погрузочная кубатура судна: сколько кубометров трюма
     приходится на тонну расчётного груза. */
  function stowageShip(W, Pgr) { return W / Pgr; }

  /* Сколько груза удельной кубатуры mu поместится в объём W и чем
     ограничена загрузка — массой или объёмом. */
  function cargoFit(W, mu, Pgr, tpc) {
    var byVolume = W / mu;
    var limitByVolume = byVolume < Pgr;
    var Q = limitByVolume ? byVolume : Pgr;
    var shortfall = Pgr - Q;
    return {
      byVolume: byVolume, Q: Q, limitByVolume: limitByVolume,
      shortfall: shortfall,
      voidVolume: limitByVolume ? 0 : W - Pgr * mu,
      draftDrop: tpc ? shortfall / tpc / 100 : null,   // м
    };
  }

  /* Какая высота борта нужна, чтобы взять полный груз кубатуры mu. */
  function depthForStowage(o, mu, Pgr) {
    var v0 = holdVolume(o);
    var needGrain = Pgr * mu / (o.kbale === undefined ? 0.95 : o.kbale);
    var dBox = needGrain - v0.coam;
    var Bh = o.B - 2 * o.side;
    var Hneed = dBox / (o.k * o.Lh * Bh) + o.hdb;
    return { need: needGrain, H: Hneed, dH: Hneed - o.H };
  }

  /* ==================================================================
   *  5. СОПРОТИВЛЕНИЕ И МОЩНОСТЬ
   * ================================================================== */

  /* Смоченная поверхность по Мамфорду: S = 1,7·L·T + V/T. */
  function wettedSurface(L, T, V) { return 1.7 * L * T + V / T; }

  /* Число Рейнольдса по длине. */
  function reynolds(v, L, nu) { return v * L / (nu || NU); }

  /* Коэффициент трения эквивалентной пластины, ITTC-57:
     C(F) = 0,075/(lg Re − 2)². */
  function cFriction(Re) {
    var d = Math.log(Re) / Math.LN10 - 2;
    return 0.075 / (d * d);
  }

  /* Полное сопротивление по частям (упрощённая схема Холтропа):
     вязкостное (1+k)·C(F) с надбавкой на шероховатость C(A), волновое C(W),
     воздушное и выступающие части. Скорость v в м/с, S в м², результат в кН.
     Возвращает составляющие и буксировочную мощность P(E) в кВт. */
  function resistance(o) {
    var q = 0.5 * (o.rho || 1025) * o.v * o.v * o.S;        // Н, напор × площадь
    var Rvisc = (o.k1 * o.CF + o.CA) * q;
    var Rw = o.CW * q;
    var Rair = 0.5 * (o.rhoAir || RHO_AIR) * o.Cair * o.Aair * o.v * o.v;
    var Rapp = (o.kapp || 0) * Rvisc;
    var RT = Rvisc + Rw + Rair + Rapp;
    return {
      q: q / 1000, Rvisc: Rvisc / 1000, Rw: Rw / 1000, Rair: Rair / 1000,
      Rapp: Rapp / 1000, RT: RT / 1000, PE: RT * o.v / 1000,
      shareWave: Rw / RT,
    };
  }

  /* Пропульсивный коэффициент и мощность на валу.
     Тейлор: w = 0,5·δ − 0,05; коэффициент засасывания t задаётся.
     η(H) = (1 − t)/(1 − w); η(D) = η(H)·η(0)·η(R); P(S) = P(E)/(η(D)·η(в)). */
  function propulsion(PE, o) {
    var w = o.w !== undefined ? o.w : 0.5 * o.delta - 0.05;
    var etaH = (1 - o.t) / (1 - w);
    var etaD = etaH * o.eta0 * o.etaR;
    var PD = PE / etaD;
    var PS = PD / o.etaShaft;
    return {
      w: w, t: o.t, etaH: etaH, etaD: etaD, PD: PD, PS: PS,
      required: PS * (1 + o.seaMargin),
    };
  }

  /* Выбор двигателя из каталога: наименьший, покрывающий требуемую мощность. */
  function pickEngine(required, catalog) {
    var best = null;
    catalog.forEach(function (e) {
      if (e.Ne >= required && (!best || e.Ne < best.Ne)) best = e;
    });
    return best ? { engine: best, spare: (best.Ne - required) / required } : null;
  }

  /* ==================================================================
   *  6. ПЛАВУЧЕСТЬ И ОСТОЙЧИВОСТЬ
   * ================================================================== */

  /* Поправка на свободные поверхности жидких грузов:
     δh = Σ(i·ρ(ж))/Δ, где i — момент инерции свободной поверхности. */
  function freeSurface(tanks, D) {
    var items = tanks.map(function (t) {
      var i = t.i !== undefined ? t.i : t.l * t.b * t.b * t.b / 12;
      return { name: t.name, i: i, rho: t.rho, dh: i * t.rho / D };
    });
    return { items: items, total: items.reduce(function (s, x) { return s + x.dh; }, 0) };
  }

  /* Начальная поперечная метацентрическая высота с поправкой. */
  function initialGM(KM, KG, dhFS) {
    return { GM0: KM - KG, dh: dhFS, GM: KM - KG - dhFS, KGc: KG + dhFS };
  }

  /* Диаграмма статической остойчивости по плечам остойчивости формы:
     l(ст) = l(ф) − KG(испр)·sin θ. Возвращает точки, максимум и угол заката. */
  function gzCurve(pantokarens, KGc) {
    var pts = pantokarens.map(function (p) {
      return { theta: p.theta, lf: p.lf,
               l: p.lf - KGc * Math.sin(p.theta * Math.PI / 180) };
    });
    var max = pts.reduce(function (a, b) { return b.l > a.l ? b : a; }, pts[0]);
    var vanish = null;
    for (var i = 1; i < pts.length; i++) {
      if (pts[i - 1].l > 0 && pts[i].l <= 0) {
        vanish = pts[i - 1].theta + (0 - pts[i - 1].l)
          / (pts[i].l - pts[i - 1].l) * (pts[i].theta - pts[i - 1].theta);
        break;
      }
    }
    return { points: pts, max: max, vanish: vanish };
  }

  /* Кренящее плечо от давления ветра: l(w1) = p(v)·A(v)·z/(Δ·g),
     p(v) в кПа, A(v) в м², z в м, Δ в т — результат в метрах. */
  function windLever(pv, Av, z, D) { return pv * Av * z / (D * G); }

  /* Проверки Правил Регистра для начальной остойчивости и ДСО. */
  function stabilityChecks(gm, curve) {
    return {
      gm: { value: gm, min: 0.15, ok: gm >= 0.15 },
      maxLever: { value: curve.max.l, at: curve.max.theta, min: 0.25,
                  ok: curve.max.l >= 0.25 && curve.max.theta >= 30 },
      vanish: { value: curve.vanish, min: 60, ok: curve.vanish >= 60 },
    };
  }

  /* ==================================================================
   *  7. НЕПОТОПЛЯЕМОСТЬ
   * ================================================================== */

  /* Стандартная седловатость палубы по Правилам о грузовой марке:
     ординаты кормовой ветви 25·(L/3 + 10) мм у КП, носовой 50·(L/3 + 10) мм
     у НП, между ними — парабола. x отсчитывается от кормового перпендикуляра. */
  function sheer(x, L) {
    var c = (L / 3 + 10) / 1000;
    var half = L / 2;
    if (x <= half) return 25 * c * Math.pow((half - x) / half, 2);
    return 50 * c * Math.pow((x - half) / half, 2);
  }

  /* Предельная линия погружения: 76 мм ниже палубы переборок у борта. */
  function marginLine(x, L, H, withSheer) {
    return H - 0.076 + (withSheer === false ? 0 : sheer(x, L));
  }

  /* Затопление отсека методом приёма груза: объём влившейся воды считается
     геометрически (проницаемость μ, второе дно не затапливается), масса
     принимается как груз в центре отсека; посадка — просадка плюс дифферент.
     Возвращает функцию осадки по длине и наименьший запас до предельной
     линии погружения. */
  function flooding(o) {
    var Vf = o.mu * o.l * o.B * (o.T - o.hdb) * o.kshape;
    var w = RHO * Vf;
    var dT = w / (o.TPC * 100);                       // м
    var lever = o.xc - o.xf;                          // м, «+» — в нос
    var trim = w * lever / (o.MCT * 100);             // м, «+» — носом
    var draft = function (x) { return o.T + dT + (x - o.xf) * (trim / o.L); };
    var pts = [], worst = null;
    for (var i = 0; i <= 20; i++) {
      var x = i * o.L / 20;
      var d = draft(x);
      var ml = marginLine(x, o.L, o.H, o.sheer);
      var gap = ml - d;
      pts.push({ x: x, draft: d, margin: ml, gap: gap });
      if (!worst || gap < worst.gap) worst = pts[pts.length - 1];
    }
    return { V: Vf, w: w, dT: dT, trim: trim, lever: lever,
             draftAP: draft(0), draftFP: draft(o.L),
             points: pts, worst: worst, ok: worst.gap > 0 };
  }

  /* Предельная длина отсека с центром в точке xc: наибольшая длина, при
     которой предельная линия погружения не уходит под воду. Делением
     пополам — условие монотонно ухудшается с ростом длины. */
  function limitLength(xc, o) {
    var lo = 0, hi = o.L, mid, i;
    var test = function (l) {
      var p = Object.assign({}, o, { l: l, xc: xc });
      return flooding(p).ok;
    };
    if (!test(0.2)) return 0;
    for (i = 0; i < 60; i++) {
      mid = (lo + hi) / 2;
      if (test(mid)) lo = mid; else hi = mid;
    }
    return lo;
  }

  /* ==================================================================
   *  8. ЭКОНОМИКА РЕЙСА
   * ================================================================== */

  /* Постоянные суточные расходы: экипаж, амортизация, ремонт, страхование,
     прочие. K — строительная стоимость судна. */
  function dailyFixed(o) {
    var items = {
      crew: o.crew,
      depreciation: o.K / o.life / 365,
      repair: o.repairRate * o.K / 365,
      insurance: o.insuranceRate * o.K / 365,
      other: o.other,
    };
    items.total = items.crew + items.depreciation + items.repair
      + items.insurance + items.other;
    return items;
  }

  /* Суточный расход топлива на ходу при скорости v: расход на номинальном
     режиме пересчитывается по кубу скорости (мощность ∝ v³). */
  function fuelPerDay(v, o) {
    var main = o.kMCR * o.Ne * o.be / 1e6 * 24 * Math.pow(v / o.v0, 3);
    var aux = o.Ndg * o.bdg / 1e6 * 24;
    return main + aux;
  }

  /* Круговой рейс: ходовое и стояночное время, расходы, себестоимость
     перевозки тонны, число рейсов в год и годовая прибыль при ставке freight. */
  function voyage(v, o) {
    var th = 2 * o.dist / v / 24;
    var tp = o.portDays;
    var fd = fuelPerDay(v, o);
    var fixed = o.fixedDaily;
    var costRun = th * (fixed + fd * o.fuelPrice);
    var costPort = tp * (fixed + o.fuelPort * o.fuelPrice);
    var costCall = o.calls * o.portDue + o.stevedore * o.Q;
    var C = costRun + costPort + costCall;
    var tv = th + tp;
    var trips = o.yearDays / tv;
    return {
      th: th, tp: tp, tv: tv, fuelDay: fd,
      costRun: costRun, costPort: costPort, costCall: costCall, C: C,
      perTon: C / o.Q, trips: trips, yearCargo: trips * o.Q,
      profit: (o.freight - C / o.Q) * trips * o.Q,
    };
  }

  /* Точка безубыточности по количеству груза: постоянная часть расходов
     рейса делится на маржинальный доход с тонны. */
  function breakEven(v, o) {
    var r = voyage(v, o);
    var fixedPart = r.C - o.stevedore * o.Q;
    var margin = o.freight - o.stevedore;
    return { fixedPart: fixedPart, margin: margin, Q: fixedPart / margin,
             share: fixedPart / margin / o.Q };
  }

  /* Обход по скоростям: где минимальна себестоимость тонны и где
     максимальна годовая прибыль — это разные скорости. */
  function speedSweep(speeds, o) {
    var rows = speeds.map(function (v) {
      var r = voyage(v, o); r.v = v; return r;
    });
    var cheapest = rows.reduce(function (a, b) { return b.perTon < a.perTon ? b : a; });
    var richest = rows.reduce(function (a, b) { return b.profit > a.profit ? b : a; });
    return { rows: rows, cheapest: cheapest, richest: richest };
  }

  /* ==================================================================
   *  САМОПРОВЕРКА
   * ================================================================== */
  function selftest() {
    var bad = [];
    function near(name, got, want, tol) {
      if (!(Math.abs(got - want) <= tol)) {
        bad.push(name + ': получено ' + got + ', ожидалось ' + want);
      }
    }
    function ok(name, cond) { if (!cond) bad.push(name); }

    /* Симпсон точен на многочленах до третьей степени: интеграл x³ на
       [0, 4] равен 64 при любом чётном числе интервалов. */
    var cube = [0, 1, 8, 27, 64];
    near('Симпсон точен на x³', simpson(cube, 1), 64, 1e-9);
    /* Площадь полуокружности радиуса 5 (10 интервалов, оценка сверху). */
    var semi = [];
    for (var i = 0; i <= 10; i++) semi.push(Math.sqrt(Math.max(0, 25 - Math.pow(i - 5, 2))));
    ok('полуокружность в пределах 2 %', Math.abs(simpson(semi, 1) - Math.PI * 12.5) < 0.02 * Math.PI * 12.5);

    /* Адмиралтейский коэффициент обратим. */
    near('адмиралтейский коэффициент обратим',
         admiraltyCoef(7000, 13, admiraltyPower(7000, 13, 400)), 400, 1e-9);

    /* Уравнение плавучести обратимо. */
    near('draftFor обращает displacement',
         draftFor(displacement(120, 17, 7, 0.72), 120, 17, 0.72), 7, 1e-12);

    /* Итерации уравнения масс сходятся к неподвижной точке: невязка
       последнего шага меньше допуска, а сам шаг воспроизводит себя. */
    var it = massIterate(6000, 0.002, 40);
    ok('итерации сошлись', Math.abs(it[it.length - 1].resid) < 0.002);
    var fix = it[it.length - 1].D;
    near('неподвижная точка воспроизводит себя', massStep(fix).D, fix,
         0.003 * fix);

    /* Ватерлиния: для прямоугольника α = 1, I(x) = L·B³/12, x(f) = L/2. */
    var rect = [];
    for (i = 0; i <= 10; i++) rect.push(4);
    var wr = waterplane(rect, 100, 8, 100 * 8 * 5, 5);
    near('прямоугольная ВЛ: α = 1', wr.alpha, 1, 1e-9);
    near('прямоугольная ВЛ: Ix = LB³/12', wr.Ix, 100 * 512 / 12, 1e-6);
    near('прямоугольная ВЛ: xf на миделе', wr.xf, 50, 1e-9);
    near('прямоугольная ВЛ: IL = BL³/12', wr.IL, 8 * 1e6 / 12, 1e-3);

    /* Число Фруда безразмерно и совпадает с ручным пересчётом. */
    near('число Фруда', froude(12.5, 100), 12.5 * KN / Math.sqrt(G * 100), 1e-15);

    /* Сопротивление: при нулевых коэффициентах остаётся только воздушное. */
    var r0 = resistance({ v: 6, S: 2000, k1: 0, CF: 0, CA: 0, CW: 0,
                          Cair: 0.8, Aair: 150, kapp: 0 });
    near('только воздушное сопротивление', r0.RT,
         0.5 * RHO_AIR * 0.8 * 150 * 36 / 1000, 1e-9);
    /* P(E) = R·v по определению. */
    var r1 = resistance({ v: 6.43, S: 2100, k1: 1.25, CF: 0.00165, CA: 0.0004,
                          CW: 0.00045, Cair: 0.8, Aair: 153, kapp: 0.03 });
    near('PE = RT·v', r1.PE, r1.RT * 6.43, 1e-9);

    /* Пропульсивный коэффициент: при w = t и η(0) = η(R) = η(в) = 1
       мощность на валу равна буксировочной. */
    var pr = propulsion(1000, { delta: 0.74, w: 0.2, t: 0.2, eta0: 1,
                                etaR: 1, etaShaft: 1, seaMargin: 0 });
    near('η(H) = 1 при w = t', pr.etaH, 1, 1e-12);
    near('P(S) = P(E) при единичных КПД', pr.PS, 1000, 1e-9);

    /* Свободные поверхности: удвоение ширины танка даёт восьмикратный момент. */
    var f1 = freeSurface([{ name: 'a', l: 10, b: 5, rho: 1 }], 1000).total;
    var f2 = freeSurface([{ name: 'a', l: 10, b: 10, rho: 1 }], 1000).total;
    near('момент инерции ∝ b³', f2, 8 * f1, 1e-12);

    /* ДСО: при KG = KM начальный участок плоский — плечи почти нулевые. */
    var pk = [{ theta: 10, lf: 1.0 }, { theta: 20, lf: 2.0 }, { theta: 30, lf: 3.0 }];
    var gz = gzCurve(pk, 0);
    near('без поправки l(ст) = l(ф)', gz.points[2].l, 3.0, 1e-12);

    /* Седловатость: у миделя ноль, у носового перпендикуляра вдвое больше,
       чем у кормового. */
    near('седловатость на миделе', sheer(50, 100), 0, 1e-12);
    near('седловатость: нос вдвое выше кормы', sheer(100, 100), 2 * sheer(0, 100), 1e-12);

    /* Затопление: посадка на ровный киль, когда отсек центрован в центре
       тяжести площади ватерлинии, и просадка равна w/(TPC·100). */
    var fl = flooding({ mu: 0.8, l: 10, B: 15, T: 6, hdb: 1, kshape: 0.9,
                        TPC: 13, MCT: 85, xc: 50, xf: 50, L: 100, H: 8 });
    near('без плеча дифферента нет', fl.trim, 0, 1e-12);
    near('просадка = w/(TPC·100)', fl.dT, fl.w / 1300, 1e-12);
    near('осадки в носу и корме равны', fl.draftAP, fl.draftFP, 1e-9);

    /* Предельная длина: отсек этой длины проходит, а на 5 % длиннее — нет. */
    var base = { mu: 0.85, B: 15.3, T: 6.6, hdb: 1.0, kshape: 0.9, TPC: 13.3,
                 MCT: 90, xf: 48, L: 100, H: 8.3 };
    var lim = limitLength(20, base);
    ok('предельная длина найдена', lim > 1 && lim < 100);
    ok('на предельной длине проходит',
       flooding(Object.assign({}, base, { l: lim * 0.99, xc: 20 })).ok);
    ok('на 5 % длиннее не проходит',
       !flooding(Object.assign({}, base, { l: lim * 1.05, xc: 20 })).ok);

    /* Экономика: расход топлива растёт как куб скорости. */
    var eo = { kMCR: 0.85, Ne: 1800, be: 195, v0: 12.5, Ndg: 120, bdg: 210 };
    var d1 = fuelPerDay(12.5, eo) - eo.Ndg * eo.bdg / 1e6 * 24;
    var d2 = fuelPerDay(25.0, eo) - eo.Ndg * eo.bdg / 1e6 * 24;
    near('расход ∝ v³', d2, 8 * d1, 1e-9);
    /* Себестоимость тонны = расходы рейса, делённые на груз. */
    var vo = { dist: 1100, portDays: 3, fixedDaily: 4e5, fuelPrice: 5.2e4,
               fuelPort: 1.2, calls: 2, portDue: 1.2e6, stevedore: 350,
               Q: 4000, yearDays: 350, freight: 4000,
               kMCR: 0.85, Ne: 1800, be: 195, v0: 12.5, Ndg: 120, bdg: 210 };
    var vr = voyage(12.5, vo);
    near('себестоимость тонны', vr.perTon, vr.C / 4000, 1e-9);
    near('расходы рейса складываются из трёх частей',
         vr.C, vr.costRun + vr.costPort + vr.costCall, 1e-6);
    /* В точке безубыточности прибыль ровно ноль. */
    var be = breakEven(12.5, vo);
    near('в точке безубыточности прибыль нулевая',
         vo.freight * be.Q - (be.fixedPart + vo.stevedore * be.Q), 0, 1e-6);

    return bad;
  }

  return {
    G: G, RHO: RHO, KN: KN, NU: NU, RHO_AIR: RHO_AIR,
    TASK: TASK, PROTO: PROTO, SHIP: SHIP, WL: WL, RATIO_RANGE: RATIO_RANGE,
    // уравнение масс
    stores: stores, admiraltyPower: admiraltyPower, admiraltyCoef: admiraltyCoef,
    massStep: massStep, massIterate: massIterate, massCheck: massCheck,
    displacement: displacement, draftFor: draftFor,
    // размерения
    froude: froude, deltaByFroude: deltaByFroude, ratios: ratios,
    freeboardMin: freeboardMin,
    // гидростатика
    simpsonMult: simpsonMult, simpson: simpson, waterplane: waterplane, mct: mct,
    // вместимость
    holdVolume: holdVolume, stowageShip: stowageShip, cargoFit: cargoFit,
    depthForStowage: depthForStowage,
    // ходкость
    wettedSurface: wettedSurface, reynolds: reynolds, cFriction: cFriction,
    resistance: resistance, propulsion: propulsion, pickEngine: pickEngine,
    // остойчивость
    freeSurface: freeSurface, initialGM: initialGM, gzCurve: gzCurve,
    windLever: windLever, stabilityChecks: stabilityChecks,
    // непотопляемость
    sheer: sheer, marginLine: marginLine, flooding: flooding,
    limitLength: limitLength,
    // экономика
    dailyFixed: dailyFixed, fuelPerDay: fuelPerDay, voyage: voyage,
    breakEven: breakEven, speedSweep: speedSweep,
    selftest: selftest,
  };
}));
