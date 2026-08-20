# -*- coding: utf-8 -*-
"""Проверка расчётного ядра site/assets/dcalc.js.

Модуль dcalc.js — единственное место, где живут формулы разборов задач
(p-*.html). Ошибка в нём не поймается ни проверкой ссылок, ни разбором
HTML: страницы останутся валидными, а числа станут неверными. Поэтому
здесь проверяется сама арифметика, причём двумя независимыми способами:

  * встроенная самопроверка DCALC.selftest() — контрольные точки,
    посчитанные аналитически (точность Симпсона на многочленах, обратимость
    адмиралтейского коэффициента и уравнения плавучести, прямоугольная
    ватерлиния с известным моментом инерции, тождества пропульсивного
    расчёта и экономики рейса);
  * пересчёт ключевых величин на Python по формулам, выписанным здесь
    заново, — так опечатка в JS не может «подтвердить сама себя».

Дополнительно проверяется, что числа, напечатанные на страницах разборов,
совпадают с тем, что выдаёт модуль: страница и модуль не должны разъезжаться.
"""
import json
import math
import os
import shutil
import subprocess

import pytest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DCALC_JS = os.path.join(ROOT, 'site', 'assets', 'dcalc.js')
SITE = os.path.join(ROOT, 'site')

pytestmark = [
    pytest.mark.skipif(not os.path.isfile(DCALC_JS), reason='нет site/assets/dcalc.js'),
    pytest.mark.skipif(not shutil.which('node'), reason='node не установлен'),
]

#: постоянные, выписанные здесь заново (сверять с шапкой dcalc.js)
G = 9.81
RHO = 1.025
KN = 0.5144444
NU = 1.1892e-6
RHO_AIR = 1.226

#: судно сквозного примера — те же L, B, H, что на сайте /shiptech/
L, B, H, T, DELTA = 100.0, 15.3, 8.3, 6.60, 0.74
PGR, VKN, RANGE = 4000.0, 12.5, 4000.0
#: полушироты грузовой ватерлинии (11 ординат, от кормового перпендикуляра)
WL = [3.30, 6.00, 7.25, 7.62, 7.65, 7.65, 7.65, 7.50, 6.70, 4.35, 0.45]


def dc(expr):
    """Выполнить выражение в node с загруженным модулем и вернуть результат."""
    src = 'const D = require(%s); console.log(JSON.stringify(%s));' % (
        json.dumps(DCALC_JS), expr)
    r = subprocess.run(['node', '-e', src], capture_output=True, text=True)
    assert r.returncode == 0, 'node упал: %s' % r.stderr.strip()[:400]
    return json.loads(r.stdout.strip())


# ---------------------------------------------------------------- самопроверка

def test_selftest_passes():
    bad = dc('D.selftest()')
    assert bad == [], 'самопроверка модуля нашла расхождения:\n' + '\n'.join(bad)


def test_constants_match():
    """Постоянные модуля не разошлись с выписанными в тесте."""
    got = dc('({G: D.G, RHO: D.RHO, KN: D.KN, NU: D.NU, AIR: D.RHO_AIR})')
    assert got['G'] == G and got['RHO'] == RHO
    assert got['KN'] == pytest.approx(KN) and got['NU'] == pytest.approx(NU)
    assert got['AIR'] == pytest.approx(RHO_AIR)


def test_ship_matches_shiptech():
    """Главные размерения совпадают с судном сквозного примера /shiptech/."""
    s = dc('D.SHIP')
    assert (s['L'], s['B'], s['H']) == (100.0, 15.3, 8.3)
    assert s['T'] == pytest.approx(6.60) and s['delta'] == pytest.approx(0.74)


# ------------------------------------------------- разбор 1: уравнение масс

def py_stores(Ne):
    """Запасы на рейс, выписанные заново."""
    hours = RANGE / VKN
    fuel = (0.85 * Ne * 195 / 1e6 * hours + 120 * 210 / 1e6 * hours) * 1.10
    return fuel + 0.03 * fuel + (14 * 20 * 0.12 + 5.0) + 14 * 20 * 0.005 + 14 * 0.13


def test_stores_recomputed():
    got = dc('D.stores(1764.9)')
    assert got['hours'] == pytest.approx(320.0)
    assert got['total'] == pytest.approx(py_stores(1764.9), rel=1e-9)
    assert got['total'] == pytest.approx(157.0, abs=0.2)


def test_admiralty_power():
    """P = Δ^(2/3)·v³/C — пересчёт вручную."""
    disp = RHO * DELTA * L * B * T
    assert disp == pytest.approx(7659.3, abs=0.5)
    p = dc('D.admiraltyPower(%r, 12.5, 430)' % disp)
    assert p == pytest.approx(disp ** (2 / 3) * 12.5 ** 3 / 430, rel=1e-12)
    assert p == pytest.approx(1764.9, abs=1.0)


def test_mass_equation_closes():
    """Уравнение масс на принятых размерениях сходится с невязкой < 0,5 %."""
    got = dc('D.massCheck(D.SHIP, 1764.9)')
    disp = RHO * DELTA * L * B * T
    # статьи, пересчитанные независимо
    assert got['Pk'] == pytest.approx(0.19 * L * B * H, rel=1e-12)
    assert got['Pm'] == pytest.approx(0.17 * 1764.9, rel=1e-12)
    assert got['Pob'] == pytest.approx(0.42 * L * B, rel=1e-12)
    assert got['reserve'] == pytest.approx(0.02 * disp, rel=1e-9)
    assert got['light'] == pytest.approx(3508.6, abs=1.0)
    assert got['dw'] == pytest.approx(4157.0, abs=1.0)
    assert abs(got['residRel']) < 0.005, 'уравнение масс не сошлось'
    assert got['resid'] == pytest.approx(6.3, abs=1.0)
    assert got['etaDW'] == pytest.approx(0.543, abs=0.002)


def test_mass_iteration_converges():
    """Итерации от заведомо неверного начального Δ сходятся монотонно."""
    steps = dc('D.massIterate(6800, 0.005, 20)')
    resid = [abs(s['resid']) for s in steps]
    assert resid == sorted(resid, reverse=True), 'невязка не убывает монотонно'
    assert resid[-1] < 0.005
    assert len(steps) == 5
    assert steps[-1]['D'] == pytest.approx(7976, abs=5)
    # свободное решение просит осадку, запрещённую заданием
    assert steps[-1]['T'] > 6.7


def test_spiral_turn_fits_in_margin():
    """Прирост масс от выбора двигателя 1980 кВт покрывается запасом."""
    a = dc('D.massCheck(D.SHIP, 1764.9)')
    b = dc('D.massCheck(D.SHIP, 1980)')
    growth = b['sum'] - a['sum']
    assert growth == pytest.approx(49.5, abs=1.0)
    assert growth < a['reserve'], 'второй виток спирали обязателен'


# ------------------------------------------- разбор 2: размерения и борт

def test_froude_and_delta():
    fr = dc('D.froude(12.5, 100)')
    assert fr == pytest.approx(12.5 * KN / math.sqrt(G * 100), rel=1e-12)
    assert fr == pytest.approx(0.2053, abs=0.0002)
    d = dc('D.deltaByFroude(%r)' % fr)
    assert d['alexander'] < DELTA < d['lammeren'], 'δ вне вилки прототипов'


def test_ratios_all_in_range():
    r = dc('D.ratios(D.SHIP)')
    assert all(v['ok'] for v in r.values()), 'соотношение вне диапазона: %s' % r
    assert r['LB']['value'] == pytest.approx(L / B, rel=1e-12)
    assert r['BT']['value'] == pytest.approx(B / T, rel=1e-12)
    assert r['HT']['value'] == pytest.approx(H / T, rel=1e-12)


def test_freeboard_is_the_binding_constraint():
    """Минимальный надводный борт, пересчитанный вручную, ограничивает осадку."""
    fb = dc('D.freeboardMin(100, 8.3, 0.74, 1.271, 0)')
    f1 = 1.271 * (0.74 + 0.68) / 1.36
    f2 = (8.3 - 100 / 15) * (100 / 0.48) / 1000
    assert fb['F'] == pytest.approx(f1 + f2, rel=1e-12)
    assert fb['F'] == pytest.approx(1.667, abs=0.002)
    # фактический борт проходит, но с запасом всего 33 мм
    assert (H - T) - fb['F'] == pytest.approx(0.033, abs=0.003)
    # именно борт, а не глубина портов, задаёт предельную осадку
    assert H - fb['F'] < 6.7


# ------------------------------------------------ гидростатика ватерлинии

def py_simpson(vals, h):
    n = len(vals) - 1
    s = 0.0
    for i, v in enumerate(vals):
        s += (1 if i in (0, n) else (4 if i % 2 else 2)) * v
    return h / 3 * s


def test_waterplane_recomputed():
    """Площадь, моменты инерции и метацентр — пересчёт по Симпсону на Python."""
    V = DELTA * L * B * T
    got = dc('D.waterplane(D.WL, 100, 15.3, %r, 6.6)' % V)
    h = L / (len(WL) - 1)
    x = [i * h for i in range(len(WL))]
    A = 2 * py_simpson(WL, h)
    xf = 2 * py_simpson([y * xi for y, xi in zip(WL, x)], h) / A
    Ix = 2 / 3 * py_simpson([y ** 3 for y in WL], h)
    IL = 2 * py_simpson([y * xi * xi for y, xi in zip(WL, x)], h) - A * xf * xf
    KB = T - (T / 2 + V / A) / 3
    assert got['A'] == pytest.approx(A, rel=1e-12)
    assert got['alpha'] == pytest.approx(A / (L * B), rel=1e-12)
    assert got['xf'] == pytest.approx(xf, rel=1e-12)
    assert got['Ix'] == pytest.approx(Ix, rel=1e-12)
    assert got['IL'] == pytest.approx(IL, rel=1e-9)
    assert got['KB'] == pytest.approx(KB, rel=1e-12)
    # контрольные значения страниц
    assert got['A'] == pytest.approx(1298.2, abs=0.5)
    assert got['alpha'] == pytest.approx(0.8485, abs=0.001)
    assert got['TPC'] == pytest.approx(13.31, abs=0.02)
    assert got['BM'] == pytest.approx(2.864, abs=0.005)
    assert got['KM'] == pytest.approx(6.446, abs=0.005)
    assert got['BML'] == pytest.approx(113.3, abs=0.3)
    assert got['xf'] == pytest.approx(47.69, abs=0.05)


# ---------------------------------------------------- разбор 3: вместимость

HOLD = ('{L:100,B:15.3,H:8.3,Lh:68,hdb:1,side:0.8,k:0.93,'
        'hatches:3,hatchL:15,hatchB:9,hatchH:1.2,kbale:0.95}')


def test_hold_volume_recomputed():
    got = dc('D.holdVolume(%s)' % HOLD)
    box = 0.93 * 68 * (15.3 - 1.6) * (8.3 - 1.0)
    coam = 3 * 15 * 9 * 1.2
    assert got['box'] == pytest.approx(box, rel=1e-12)
    assert got['grain'] == pytest.approx(box + coam, rel=1e-12)
    assert got['grain'] == pytest.approx(6811, abs=2)
    assert got['bale'] == pytest.approx(6470, abs=2)


def test_ship_sinks_by_volume_on_general_cargo():
    """Генеральный груз μ = 1,90 м³/т: судно ограничено объёмом, а не массой."""
    W = dc('D.holdVolume(%s).bale' % HOLD)
    tpc = dc('D.waterplane(D.WL, 100, 15.3, %r, 6.6).TPC' % (DELTA * L * B * T))
    got = dc('D.cargoFit(%r, 1.90, 4000, %r)' % (W, tpc))
    assert got['limitByVolume'] is True
    assert got['Q'] == pytest.approx(W / 1.90, rel=1e-12)
    assert got['Q'] == pytest.approx(3405, abs=3)
    assert got['shortfall'] == pytest.approx(595, abs=3)
    assert got['draftDrop'] == pytest.approx(0.447, abs=0.005)
    # зерно той же массы, наоборот, оставляет пустоту
    grain = dc('D.cargoFit(%r, 1.30, 4000, %r)'
               % (dc('D.holdVolume(%s).grain' % HOLD), tpc))
    assert grain['limitByVolume'] is False
    assert grain['voidVolume'] == pytest.approx(1611, abs=3)


def test_depth_needed_for_general_cargo():
    got = dc('D.depthForStowage(%s, 1.90, 4000)' % HOLD)
    assert got['H'] == pytest.approx(9.67, abs=0.02)
    assert got['dH'] == pytest.approx(1.37, abs=0.02)


# ------------------------------------------------ разбор 4: ходкость

def test_resistance_recomputed():
    """Сопротивление по частям — независимый пересчёт всех слагаемых."""
    V = DELTA * L * B * T
    v = VKN * KN
    S = 1.7 * L * T + V / T
    Re = v * L / NU
    CF = 0.075 / (math.log10(Re) - 2) ** 2
    got = dc('(() => {const V=%r, v=%r, S=D.wettedSurface(100,6.6,V),'
             'Re=D.reynolds(v,100), CF=D.cFriction(Re);'
             'return {S:S, Re:Re, CF:CF, r:D.resistance({v:v,S:S,k1:1.25,CF:CF,'
             'CA:0.0004,CW:0.00045,Cair:0.8,Aair:153,kapp:0.03})};})()'
             % (V, v))
    assert got['S'] == pytest.approx(S, rel=1e-12)
    assert got['S'] == pytest.approx(2254.2, abs=0.5)
    assert got['Re'] == pytest.approx(Re, rel=1e-12)
    assert got['CF'] == pytest.approx(CF, rel=1e-12)
    q = 0.5 * 1025 * v * v * S
    assert got['r']['Rvisc'] == pytest.approx((1.25 * CF + 0.0004) * q / 1000, rel=1e-12)
    assert got['r']['Rw'] == pytest.approx(0.00045 * q / 1000, rel=1e-12)
    assert got['r']['Rair'] == pytest.approx(
        0.5 * RHO_AIR * 0.8 * 153 * v * v / 1000, rel=1e-12)
    assert got['r']['RT'] == pytest.approx(146.0, abs=0.5)
    assert got['r']['PE'] == pytest.approx(939.1, abs=1.0)


def test_propulsion_and_engine_choice():
    got = dc('(() => {const p = D.propulsion(939.1, {delta:0.74,t:0.20,eta0:0.50,'
             'etaR:1.02,etaShaft:0.98,seaMargin:0.15});'
             'return {p:p, e:D.pickEngine(p.required, [{name:"6ц",Ne:1320},'
             '{name:"8ц",Ne:1760},{name:"9ц",Ne:1980}])};})()')
    w = 0.5 * 0.74 - 0.05
    etaH = (1 - 0.20) / (1 - w)
    etaD = etaH * 0.50 * 1.02
    assert got['p']['w'] == pytest.approx(w, rel=1e-12)
    assert got['p']['etaD'] == pytest.approx(etaD, rel=1e-12)
    assert got['p']['PS'] == pytest.approx(939.1 / etaD / 0.98, rel=1e-12)
    assert got['p']['PS'] == pytest.approx(1597, abs=2)
    assert got['p']['required'] == pytest.approx(1837, abs=2)
    assert got['e']['engine']['Ne'] == 1980


def test_two_methods_agree_within_five_percent():
    """Адмиралтейский коэффициент и метод по частям расходятся не более 5 %."""
    disp = RHO * DELTA * L * B * T
    padm = dc('D.admiraltyPower(%r, 12.5, 430)' % disp)
    preq = dc('D.propulsion(939.1, {delta:0.74,t:0.20,eta0:0.50,etaR:1.02,'
              'etaShaft:0.98,seaMargin:0.15}).required')
    assert abs(padm - preq) / preq < 0.05


# ------------------------------------------------ разбор 5: остойчивость

PANT = ('[{theta:10,lf:1.12},{theta:20,lf:2.30},{theta:30,lf:3.44},'
        '{theta:40,lf:4.30},{theta:50,lf:4.80},{theta:60,lf:4.95},'
        '{theta:70,lf:4.80},{theta:80,lf:4.45}]')
TANKS = ('[{name:"т",l:16,b:6,rho:0.90},{name:"б",l:20,b:6.5,rho:1.025},'
         '{name:"в",l:4,b:4,rho:1.0}]')


def test_free_surface_and_gm():
    disp = RHO * DELTA * L * B * T
    fs = dc('D.freeSurface(%s, %r)' % (TANKS, disp))
    manual = (16 * 6 ** 3 / 12 * 0.90 + 20 * 6.5 ** 3 / 12 * 1.025
              + 4 * 4 ** 3 / 12 * 1.0) / disp
    assert fs['total'] == pytest.approx(manual, rel=1e-12)
    assert fs['total'] == pytest.approx(0.098, abs=0.002)
    km = dc('D.waterplane(D.WL, 100, 15.3, %r, 6.6).KM' % (DELTA * L * B * T))
    gm = dc('D.initialGM(%r, %r, %r)' % (km, 0.62 * H, fs['total']))
    assert gm['GM0'] == pytest.approx(1.300, abs=0.005)
    assert gm['GM'] == pytest.approx(1.202, abs=0.005)
    assert gm['KGc'] == pytest.approx(5.244, abs=0.005)


def test_gz_curve_meets_register():
    km = dc('D.waterplane(D.WL, 100, 15.3, %r, 6.6).KM' % (DELTA * L * B * T))
    disp = RHO * DELTA * L * B * T
    fs = dc('D.freeSurface(%s, %r).total' % (TANKS, disp))
    KGc = 0.62 * H + fs
    got = dc('(() => {const c = D.gzCurve(%s, %r);'
             'return {c:c, chk:D.stabilityChecks(%r - %r, c)};})()'
             % (PANT, KGc, km - 0.62 * H, fs))
    # плечи пересчитаны вручную
    for p in got['c']['points']:
        want = p['lf'] - KGc * math.sin(math.radians(p['theta']))
        assert p['l'] == pytest.approx(want, rel=1e-9, abs=1e-9)
    assert got['c']['max']['l'] == pytest.approx(0.929, abs=0.003)
    assert got['c']['max']['theta'] == 40
    assert got['c']['vanish'] == pytest.approx(67.6, abs=0.3)
    assert all(v['ok'] for v in got['chk'].values()), 'проверка РМРС не пройдена'
    # начальный наклон ДСО согласуется с метацентрической высотой
    l10 = got['c']['points'][0]['l']
    assert l10 / math.sin(math.radians(10)) == pytest.approx(km - 0.62 * H - fs,
                                                            abs=0.02)


# ------------------------------------------- разбор 6: непотопляемость

FBASE = ('{B:15.3,T:6.6,TPC:13.31,MCT:85.47,xf:47.69,L:100,H:8.3,'
         'hdb:1.0,kshape:0.90,mu:0.85}')


def test_sheer_standard_ordinates():
    """Стандартная седловатость: 25 и 50·(L/3+10) мм на перпендикулярах."""
    c = (100 / 3 + 10)
    assert dc('D.sheer(0, 100)') == pytest.approx(25 * c / 1000, rel=1e-12)
    assert dc('D.sheer(100, 100)') == pytest.approx(50 * c / 1000, rel=1e-12)
    assert dc('D.sheer(50, 100)') == pytest.approx(0.0, abs=1e-15)
    assert dc('D.sheer(0, 100)') == pytest.approx(1.083, abs=0.002)


def test_engine_room_flooding_is_the_critical_case():
    """Затопление МО проходит только благодаря седловатости палубы."""
    withs = dc('D.flooding(Object.assign(%s, {l:16, xc:17}))' % FBASE)
    without = dc('D.flooding(Object.assign(%s, {l:16, xc:17, sheer:false}))' % FBASE)
    # объём и масса влившейся воды — пересчёт вручную
    Vf = 0.85 * 16 * 15.3 * (6.6 - 1.0) * 0.90
    assert withs['V'] == pytest.approx(Vf, rel=1e-12)
    assert withs['w'] == pytest.approx(RHO * Vf, rel=1e-12)
    assert withs['dT'] == pytest.approx(RHO * Vf / (13.31 * 100), rel=1e-12)
    assert withs['dT'] == pytest.approx(0.808, abs=0.003)
    assert withs['trim'] == pytest.approx(-3.86, abs=0.02)
    assert withs['draftAP'] == pytest.approx(9.249, abs=0.01)
    assert withs['ok'] is True
    assert withs['worst']['gap'] == pytest.approx(0.046, abs=0.005)
    assert without['ok'] is False, 'без седловатости отсек обязан не проходить'


def test_hold_flooding_passes_with_reserve():
    got = dc('D.flooding(Object.assign(%s, {l:22, xc:52, mu:0.60, kshape:0.97}))'
             % FBASE)
    assert got['ok'] is True
    assert got['w'] == pytest.approx(1124, abs=3)
    assert got['worst']['gap'] == pytest.approx(0.759, abs=0.01)


def test_limit_length_curve_is_lowest_at_the_ends():
    lens = {x: dc('D.limitLength(%d, %s)' % (x, FBASE)) for x in (10, 50, 90)}
    assert lens[50] > lens[10] and lens[50] > lens[90], \
        'предельная длина должна быть наибольшей в средней части'
    assert lens[10] == pytest.approx(14.12, abs=0.1)
    assert lens[50] == pytest.approx(31.76, abs=0.1)
    assert lens[90] == pytest.approx(15.22, abs=0.1)
    # машинное отделение длиной 16 м стоит у самой границы
    assert dc('D.limitLength(17, %s)' % FBASE) == pytest.approx(16.4, abs=0.3)


# ------------------------------------------------- разбор 7: экономика

ECON = ('{dist:1100, portDays:3, fixedDaily:415342, fuelPrice:52000, fuelPort:1.2,'
        ' calls:2, portDue:1200000, stevedore:350, Q:4000, yearDays:350,'
        ' freight:4000, kMCR:0.85, Ne:1980, be:195, v0:12.5, Ndg:120, bdg:210}')


def test_daily_fixed_recomputed():
    got = dc('D.dailyFixed({crew:55000, K:1.2e9, life:20, repairRate:0.04,'
             ' insuranceRate:0.012, other:25000})')
    assert got['depreciation'] == pytest.approx(1.2e9 / 20 / 365, rel=1e-12)
    assert got['repair'] == pytest.approx(0.04 * 1.2e9 / 365, rel=1e-12)
    assert got['total'] == pytest.approx(415342, abs=2)


def test_voyage_cost_recomputed():
    got = dc('D.voyage(12.5, %s)' % ECON)
    th = 2 * 1100 / 12.5 / 24
    fd = 0.85 * 1980 * 195 / 1e6 * 24 + 120 * 210 / 1e6 * 24
    C = (th * (415342 + fd * 52000) + 3 * (415342 + 1.2 * 52000)
         + 2 * 1200000 + 350 * 4000)
    assert got['th'] == pytest.approx(th, rel=1e-12)
    assert got['fuelDay'] == pytest.approx(fd, rel=1e-12)
    assert got['C'] == pytest.approx(C, rel=1e-12)
    assert got['perTon'] == pytest.approx(2878, abs=3)
    assert got['tv'] == pytest.approx(10.33, abs=0.02)


def test_break_even_makes_profit_zero():
    got = dc('D.breakEven(12.5, %s)' % ECON)
    assert got['Q'] == pytest.approx(2771, abs=5)
    # выручка в точке безубыточности ровно покрывает расходы
    assert 4000 * got['Q'] - (got['fixedPart'] + 350 * got['Q']) == pytest.approx(0, abs=1)


def test_optimum_speed_shifts_with_freight_rate():
    """Дешевле всего возить медленно, выгоднее всего — быстрее; при падении
    ставки оптимум по прибыли сдвигается в сторону экономичной скорости."""
    speeds = '[8,9,9.5,10,10.5,11,11.5,12,12.5,13,13.5,14,15,16]'
    hi = dc('D.speedSweep(%s, %s)' % (speeds, ECON))
    lo = dc('D.speedSweep(%s, Object.assign(%s, {freight:3400}))' % (speeds, ECON))
    assert hi['cheapest']['v'] < hi['richest']['v'], \
        'минимум себестоимости обязан лежать левее максимума прибыли'
    assert lo['richest']['v'] < hi['richest']['v'], \
        'при низкой ставке выгодная скорость должна падать'
    assert hi['cheapest']['v'] == pytest.approx(10.0, abs=0.6)
    assert hi['richest']['v'] == pytest.approx(13.0, abs=0.6)
    assert lo['richest']['v'] == pytest.approx(11.5, abs=0.6)
    # расход топлива растёт как куб скорости
    row = {r['v']: r for r in hi['rows']}
    aux = 120 * 210 / 1e6 * 24
    assert (row[16]['fuelDay'] - aux) / (row[8]['fuelDay'] - aux) == pytest.approx(8.0, rel=1e-9)


# --------------------------------------- согласование страниц и модуля

#: (файл разбора, строка, которая должна на нём присутствовать)
PAGE_NUMBERS = [
    ('p-mass.html', '7659'), ('p-mass.html', '3509'), ('p-mass.html', '4157'),
    ('p-mass.html', '0,08'),
    ('p-dims.html', '0,2053'), ('p-dims.html', '1,667'), ('p-dims.html', '6,536'),
    ('p-hold.html', '6811'), ('p-hold.html', '3405'), ('p-hold.html', '595'),
    ('p-power.html', '2254'), ('p-power.html', '146,0'), ('p-power.html', '1837'),
    ('p-power.html', '1980'),
    ('p-stab.html', '6,446'), ('p-stab.html', '1,202'), ('p-stab.html', '0,929'),
    ('p-stab.html', '67,6'),
    ('p-flood.html', '1075'), ('p-flood.html', '9,25'), ('p-flood.html', '31,8'),
    ('p-econ.html', '2878'), ('p-econ.html', '2771'), ('p-econ.html', '10,33'),
]


@pytest.mark.parametrize('page,needle', PAGE_NUMBERS,
                         ids=['%s:%s' % (p, n) for p, n in PAGE_NUMBERS])
def test_page_shows_computed_number(page, needle):
    """Числа, полученные модулем, должны стоять и в тексте разбора."""
    path = os.path.join(SITE, page)
    if not os.path.isfile(path):
        pytest.skip('страница %s ещё не создана' % page)
    with open(path, encoding='utf-8') as fh:
        html = fh.read()
    assert needle in html, 'на странице %s нет значения «%s»' % (page, needle)


def test_key_answers_are_reproducible():
    """Ключевые ответы всех семи разборов пересчитываются модулем «с нуля»."""
    got = dc("""(() => {
      const S = D.SHIP, V = S.delta*S.L*S.B*S.T;
      const disp = D.displacement(S.L, S.B, S.T, S.delta);
      const Ne = D.admiraltyPower(disp, 12.5, 430);
      const mc = D.massCheck(S, Ne);
      const wp = D.waterplane(D.WL, S.L, S.B, V, S.T);
      const hv = D.holdVolume(%s);
      const fit = D.cargoFit(hv.bale, 1.90, 4000, wp.TPC);
      const Sw = D.wettedSurface(S.L, S.T, V), v = 12.5*D.KN;
      const r = D.resistance({v:v, S:Sw, k1:1.25, CF:D.cFriction(D.reynolds(v,S.L)),
        CA:0.0004, CW:0.00045, Cair:0.8, Aair:153, kapp:0.03});
      const pr = D.propulsion(r.PE, {delta:S.delta, t:0.20, eta0:0.50, etaR:1.02,
        etaShaft:0.98, seaMargin:0.15});
      const fs = D.freeSurface(%s, disp);
      const gm = D.initialGM(wp.KM, 0.62*S.H, fs.total);
      const gz = D.gzCurve(%s, gm.KGc);
      const MCT = D.mct(disp, wp.BML + wp.KB - gm.KGc, S.L);
      const fl = D.flooding({B:S.B, T:S.T, TPC:wp.TPC, MCT:MCT, xf:wp.xf, L:S.L,
        H:S.H, hdb:1.0, kshape:0.90, mu:0.85, l:16, xc:17});
      const ec = D.voyage(12.5, %s);
      return {disp:disp, light:mc.light, dw:mc.dw, resid:mc.resid,
              alpha:wp.alpha, KM:wp.KM, grain:hv.grain, cargoGen:fit.Q,
              RT:r.RT, PE:r.PE, need:pr.required, GM:gm.GM, lmax:gz.max.l,
              vanish:gz.vanish, floodW:fl.w, floodGap:fl.worst.gap,
              perTon:ec.perTon};
    })()""" % (HOLD, TANKS, PANT, ECON))
    assert got['disp'] == pytest.approx(7659.3, abs=1)
    assert got['light'] == pytest.approx(3508.6, abs=1)
    assert got['dw'] == pytest.approx(4157.0, abs=1)
    assert abs(got['resid']) < 0.005 * got['disp']
    assert got['alpha'] == pytest.approx(0.8485, abs=0.001)
    assert got['KM'] == pytest.approx(6.446, abs=0.005)
    assert got['grain'] == pytest.approx(6811, abs=2)
    assert got['cargoGen'] == pytest.approx(3405, abs=3)
    assert got['RT'] == pytest.approx(146.0, abs=0.5)
    assert got['PE'] == pytest.approx(939.1, abs=1)
    assert got['need'] == pytest.approx(1837, abs=2)
    assert got['GM'] == pytest.approx(1.202, abs=0.005)
    assert got['lmax'] == pytest.approx(0.929, abs=0.003)
    assert got['vanish'] == pytest.approx(67.6, abs=0.3)
    assert got['floodW'] == pytest.approx(1075, abs=3)
    assert got['floodGap'] == pytest.approx(0.046, abs=0.005)
    assert got['perTon'] == pytest.approx(2878, abs=3)
