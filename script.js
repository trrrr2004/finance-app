(function (root) {
  'use strict';

  var MAX_VALUE = 1e15; // верхняя граница, чтобы избежать потери точности
  var MINUS = '−';

  // Разбор введённой строки. Возвращает {ok, value} или {ok:false, message}
  function parseAmount(raw) {
    var s = String(raw == null ? '' : raw).replace(/[\s ]/g, '');
    if (s === '') return { ok: false, message: 'Заполните поле: пустое значение не считается нулём.' };
    s = s.replace(',', '.');
    if (!/^\d+(\.\d+)?$/.test(s)) {
      return { ok: false, message: 'Введите неотрицательное число цифрами, например 150000 или 150 000,50.' };
    }
    var n = Number(s);
    if (!isFinite(n)) return { ok: false, message: 'Число слишком большое.' };
    if (n > MAX_VALUE) return { ok: false, message: 'Число слишком большое (максимум 1 000 000 000 000 000).' };
    return { ok: true, value: n };
  }

  // Расчёт. margin === null означает «Не определяется»
  function calculate(revenue, variable, fixed) {
    var profit = Math.round((revenue - variable - fixed) * 100) / 100;
    var margin = null;
    if (revenue > 0) margin = (profit / revenue) * 100;
    return { profit: profit, margin: margin };
  }

  function groupDigits(intStr) {
    return intStr.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }

  // Деньги: пробелы между тысячами, знак минус, копейки только если они есть
  function formatMoney(value) {
    var neg = value < 0;
    var abs = Math.abs(value);
    var fixed2 = abs.toFixed(2);
    var parts = fixed2.split('.');
    var res = groupDigits(parts[0]);
    if (parts[1] !== '00') res += ',' + parts[1];
    if (neg && Number(fixed2) !== 0) res = MINUS + res;
    return res + ' ₽';
  }

  // Процент с одним знаком после запятой
  function formatPercent(value) {
    var rounded = Math.round(value * 10) / 10;
    var neg = rounded < 0;
    var res = Math.abs(rounded).toFixed(1).replace('.', ',');
    return (neg ? MINUS : '') + res + '%';
  }

  var api = {
    parseAmount: parseAmount,
    calculate: calculate,
    formatMoney: formatMoney,
    formatPercent: formatPercent
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (typeof document === 'undefined') return;

  // ---------- Интерфейс ----------
  var form = document.getElementById('calcForm');
  if (!form) return;

  var ids = ['revenue', 'variable', 'fixed'];
  var results = document.getElementById('results');
  var profitEl = document.getElementById('profitValue');
  var marginEl = document.getElementById('marginValue');
  var lossEl = document.getElementById('lossMsg');
  var chartEl = document.getElementById('chart');

  function setError(id, msg) {
    document.getElementById(id + 'Error').textContent = msg;
    document.getElementById(id).classList.toggle('invalid', !!msg);
  }

  function svgEl(name, attrs, text) {
    var ns = 'http://www.w3.org/2000/svg';
    var el = document.createElementNS(ns, name);
    for (var k in attrs) el.setAttribute(k, attrs[k]);
    if (text != null) el.textContent = text;
    return el;
  }

  function drawChart(revenue, costs) {
    chartEl.textContent = '';
    var W = 480, H = 240, base = 190, maxH = 140;
    var max = Math.max(revenue, costs);
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, 'aria-hidden': 'true' });
    svg.appendChild(svgEl('line', { x1: 20, y1: base, x2: W - 20, y2: base, stroke: '#b9cde2', 'stroke-width': 1 }));

    var bars = [
      { label: 'Выручка', value: revenue, x: 90, color: '#1f7ae0' },
      { label: 'Затраты', value: costs, x: 290, color: '#7fb2ee' }
    ];
    bars.forEach(function (b) {
      var h = max > 0 ? Math.round((b.value / max) * maxH) : 0;
      if (b.value > 0 && h < 2) h = 2;
      svg.appendChild(svgEl('rect', { x: b.x, y: base - h, width: 100, height: h, rx: 4, fill: b.color }));
      svg.appendChild(svgEl('text', { x: b.x + 50, y: base - h - 8, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 600 }, formatMoney(b.value)));
      svg.appendChild(svgEl('text', { x: b.x + 50, y: base + 22, 'text-anchor': 'middle', 'font-size': 14 }, b.label));
    });
    chartEl.appendChild(svg);
    chartEl.setAttribute('aria-label',
      'Столбчатая диаграмма: выручка ' + formatMoney(revenue) + ', суммарные затраты ' + formatMoney(costs));
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var values = {};
    var ok = true;
    ids.forEach(function (id) {
      var r = parseAmount(document.getElementById(id).value);
      if (r.ok) { values[id] = r.value; setError(id, ''); }
      else { setError(id, r.message); ok = false; }
    });
    if (!ok) { results.hidden = true; return; }

    var res = calculate(values.revenue, values.variable, values.fixed);

    profitEl.textContent = formatMoney(res.profit);
    profitEl.className = res.profit < 0 ? 'neg' : (res.profit > 0 ? 'pos' : '');
    marginEl.textContent = res.margin === null ? 'Не определяется' : formatPercent(res.margin);
    marginEl.className = res.margin === null ? '' : (res.profit < 0 ? 'neg' : (res.profit > 0 ? 'pos' : ''));
    lossEl.hidden = !(res.profit < 0);

    drawChart(values.revenue, values.variable + values.fixed);
    results.hidden = false;
  });

  document.getElementById('resetBtn').addEventListener('click', function () {
    form.reset();
    ids.forEach(function (id) { setError(id, ''); });
    results.hidden = true;
    chartEl.textContent = '';
    document.getElementById('revenue').focus();
  });
})(typeof window !== 'undefined' ? window : this);
