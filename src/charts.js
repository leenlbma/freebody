/*!
 * charts.js — 零依赖 SVG 图表（时间折线/双轴、柱状/堆叠柱、堆叠面积、环图、横向条、热力日历）
 * - 颜色一律使用 CSS 变量（var(--acc) 等），切换深浅色无需重绘
 * - 带 data-tip 的元素可点按/悬停显示数值 tooltip
 * - 入场动效：折线描绘、柱体生长、面积淡入（尊重 prefers-reduced-motion）
 * - 同一容器数据未变化时不重绘（避免动效反复播放）
 * - 无障碍：SVG 带 role="img" 与文字摘要（标题 + 最新值 / 区间），下方可展开数据表
 */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';

  /* ---------- 工具 ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function r1(v) { return Math.round(v * 10) / 10; }
  function fmt(v) { if (v == null || isNaN(v)) return '-'; var a = Math.abs(v); return a >= 10000 ? r1(v / 1000) + 'k' : a >= 100 ? String(Math.round(v)) : String(r1(v)); }
  function dayN(s) { var a = s.split('-'); return Date.UTC(+a[0], a[1] - 1, +a[2]) / 864e5; }
  function md(s) { return (+s.slice(5, 7)) + '/' + (+s.slice(8, 10)); }
  function nice(min, max, n) {
    if (min === max) { min -= 1; max += 1; }
    var span = max - min, raw = span / n, mag = Math.pow(10, Math.floor(Math.log10(raw))), st = [1, 2, 2.5, 5, 10].map(function (k) { return k * mag; }).find(function (k) { return k >= raw; });
    return { min: Math.floor(min / st) * st, max: Math.ceil(max / st) * st, step: st };
  }
  function width(el) { var w = el.clientWidth || (el.parentNode && el.parentNode.clientWidth) || 340; return Math.max(240, Math.round(w)); }
  function legend(items) {
    return items.length ? '<div class="lg">' + items.map(function (it) { return '<span><i style="background:' + it.color + (it.dash ? ';height:0;border-top:2px dashed ' + it.color + ';background:none' : '') + '"></i>' + esc(it.name) + '</span>'; }).join('') + '</div>' : '';
  }
  /** 空状态 */
  function empty(el, msg, hint) {
    el.__sig = null;
    el.innerHTML = '<div class="empty"><svg class="ic" viewBox="0 0 24 24"><path d="M4 4v16h16M8 15l3.5-4 3 2.5L19 8"/></svg><b>' + esc(msg || '暂无数据') + '</b>' + (hint ? '<span>' + esc(hint) + '</span>' : '') + '</div>';
  }
  /** 签名缓存：数据与宽度未变时跳过重绘 */
  function draw(el, data, fn) {
    if (!el) return;
    var w = width(el), sig = JSON.stringify(data) + '|' + w;
    if (el.__sig === sig) return;
    el.__sig = sig;
    el.innerHTML = fn(w);
    describe(el, data);
  }

  /* ---------- 无障碍：文字摘要 + 可展开的数据表 ---------- */
  function txt(h) { return h.textContent.replace(/\s+/g, ' ').trim(); }
  /** 图表标题：向前找最近的 h2 / h3（同一卡片内多张图各用自己的小标题），找不到用卡片标题 */
  function cardTitle(el) {
    for (var n = el; n && n.nodeType === 1; n = n.parentNode) {
      for (var p = n.previousElementSibling; p; p = p.previousElementSibling) {
        var h = p.matches('h2, h3') ? p : p.querySelector('h2, h3');
        if (h) return txt(h);
      }
      if (n.classList.contains('card')) break;
    }
    var c = el.closest && el.closest('.card'), hh = c && c.querySelector('h2, h3, summary b');
    return hh ? txt(hh) : '';
  }
  /** 每个 data-tip 是一行：第一行为日期或类别，其余为数值 */
  function tipRows(el) {
    return Array.prototype.map.call(el.querySelectorAll('[data-tip]'), function (t) {
      var l = t.getAttribute('data-tip').split('\n');
      return { h: l[0], v: l.slice(1).join('；') };
    }).filter(function (r) { return r.v && r.v !== '无训练'; });
  }
  /** 折线：各系列的最新值与区间变化 */
  function seriesSummary(opt) {
    return (opt.series || []).map(function (s) {
      var p = (s.pts || []).filter(function (q) { return q.y != null && !isNaN(q.y) && (!opt.from || q.d >= opt.from) && (!opt.to || q.d <= opt.to); });
      if (!p.length) return '';
      p = p.slice().sort(function (a, b) { return a.d < b.d ? -1 : 1; });
      var f = s.fmt || fmt, last = p[p.length - 1], first = p[0];
      var t = s.name + '最新 ' + f(last.y) + (s.unit || '') + '（' + md(last.d) + '）';
      if (p.length > 1) { var dv = last.y - first.y; t += '，较 ' + md(first.d) + (dv === 0 ? '持平' : (dv > 0 ? '上升 ' : '下降 ') + fmt(Math.abs(dv)) + (s.unit || '')); }
      return t;
    }).filter(Boolean).join('；');
  }
  function describe(el, opt) {
    var svg = el.querySelector('svg.cv');
    if (!svg) return;
    var rows = tipRows(el), title = opt.title || el.getAttribute('data-title') || cardTitle(el) || '图表';
    var sum = opt.series ? seriesSummary(opt) : '';
    if (!sum && rows.length) sum = '共 ' + rows.length + ' 项' + (rows.length > 1 ? '，' + rows[0].h + ' 至 ' + rows[rows.length - 1].h : '：' + rows[0].h + ' ' + rows[0].v);
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', title + '。' + (sum || '暂无数值') + (rows.length ? '。具体数值见下方数据表。' : ''));
    if (!rows.length || (el.closest && el.closest('[data-go], [data-sub]'))) return; // 可点卡片内的迷你图只给摘要，数据表在详情页
    el.insertAdjacentHTML('beforeend', '<details class="cv-tb"><summary>数据表</summary><div class="cv-tw" tabindex="0" role="region" aria-label="' + esc(title) + ' 数据表"><table><caption class="sr">' + esc(title) + '</caption>' +
      '<thead><tr><th scope="col">日期 / 类别</th><th scope="col">数值</th></tr></thead><tbody>' +
      rows.map(function (r) { return '<tr><th scope="row">' + esc(r.h) + '</th><td>' + esc(r.v) + '</td></tr>'; }).join('') + '</tbody></table></div></details>');
  }

  /**
   * 时间折线（支持左右双轴、面积、虚线、参考线、参考带）
   * opt = { h, from, to, series:[{name,color,pts:[{d,y}],axis:'l'|'r',dash,area,dots,unit,fmt}], refs:[{y,axis,name,color}], band:{lo,hi,axis},
   *         yl:{min,max,unit}, yr:{min,max,unit}, emptyMsg, emptyHint, invert:false }
   */
  function line(el, opt) {
    var series = (opt.series || []).map(function (s) { var p = (s.pts || []).filter(function (q) { return q.y != null && !isNaN(q.y) && (!opt.from || q.d >= opt.from) && (!opt.to || q.d <= opt.to); }).sort(function (a, b) { return a.d < b.d ? -1 : 1; }); return Object.assign({}, s, { pts: p }); });
    if (!series.some(function (s) { return s.pts.length; })) return empty(el, opt.emptyMsg, opt.emptyHint);
    draw(el, opt, function (W) {
      var H = opt.h || 180, hasR = series.some(function (s) { return s.axis === 'r' && s.pts.length; });
      var L = 36, R = hasR ? 36 : 12, T = 12, B = 22, iw = W - L - R, ih = H - T - B;
      var all = []; series.forEach(function (s) { s.pts.forEach(function (p) { all.push(p.d); }); });
      all.sort();
      var x0 = dayN(opt.from && opt.fixedX ? opt.from : all[0]), x1 = dayN(opt.to && opt.fixedX ? opt.to : all[all.length - 1]);
      if (x1 === x0) { x0 -= 1; x1 += 1; }
      function scale(axis) {
        var ys = []; series.forEach(function (s) { if ((s.axis || 'l') === axis) s.pts.forEach(function (p) { ys.push(p.y); }); });
        (opt.refs || []).forEach(function (r) { if ((r.axis || 'l') === axis && r.y != null) ys.push(r.y); });
        if (opt.band && (opt.band.axis || 'l') === axis) { if (opt.band.lo != null) ys.push(opt.band.lo); if (opt.band.hi != null) ys.push(opt.band.hi); }
        var cfg = opt[axis === 'l' ? 'yl' : 'yr'] || {};
        if (!ys.length) ys = [0, 1];
        var mn = cfg.min != null ? cfg.min : Math.min.apply(null, ys), mx = cfg.max != null ? cfg.max : Math.max.apply(null, ys);
        var pad = (mx - mn) * 0.08 || 1; if (cfg.min == null) mn -= pad; if (cfg.max == null) mx += pad;
        var n = nice(mn, mx, 4); if (cfg.min != null) n.min = cfg.min; if (cfg.max != null) n.max = cfg.max;
        return n;
      }
      var sl = scale('l'), sr = hasR ? scale('r') : null;
      var X = function (d) { return L + (dayN(d) - x0) / (x1 - x0) * iw; };
      var Y = function (v, axis) { var s = axis === 'r' ? sr : sl; return T + (s.max - v) / (s.max - s.min) * ih; };
      var o = '<svg class="cv" viewBox="0 0 ' + W + ' ' + H + '" width="100%" height="' + H + '" preserveAspectRatio="xMinYMin meet">';
      // 网格与刻度
      for (var v = sl.min; v <= sl.max + 1e-9; v += sl.step) { var yy = Y(v, 'l'); o += '<line class="gd" x1="' + L + '" x2="' + (W - R) + '" y1="' + yy + '" y2="' + yy + '"/><text class="ax" x="' + (L - 5) + '" y="' + (yy + 3.5) + '" text-anchor="end">' + fmt(v) + '</text>'; }
      if (sr) { var k = 0; for (var v2 = sr.min; v2 <= sr.max + 1e-9 && k < 8; v2 += sr.step, k++) o += '<text class="ax" x="' + (W - R + 5) + '" y="' + (Y(v2, 'r') + 3.5) + '">' + fmt(v2) + '</text>'; }
      var xd = [all[0], all[Math.floor(all.length / 2)], all[all.length - 1]];
      if (opt.fixedX && opt.from) xd = [opt.from, null, opt.to];
      o += '<text class="ax" x="' + L + '" y="' + (H - 6) + '">' + md(xd[0]) + '</text>';
      if (xd[1] && xd[1] !== xd[0] && xd[1] !== xd[2]) o += '<text class="ax" x="' + X(xd[1]) + '" y="' + (H - 6) + '" text-anchor="middle">' + md(xd[1]) + '</text>';
      o += '<text class="ax" x="' + (W - R) + '" y="' + (H - 6) + '" text-anchor="end">' + md(xd[2]) + '</text>';
      if (opt.band && opt.band.lo != null && opt.band.hi != null) { var ba = opt.band.axis || 'l'; o += '<rect class="band" x="' + L + '" width="' + iw + '" y="' + Y(opt.band.hi, ba) + '" height="' + Math.max(0, Y(opt.band.lo, ba) - Y(opt.band.hi, ba)) + '"/>'; }
      (opt.refs || []).forEach(function (r) { if (r.y == null) return; var y = Y(r.y, r.axis || 'l'); o += '<line class="ref" style="stroke:' + r.color + '" x1="' + L + '" x2="' + (W - R) + '" y1="' + y + '" y2="' + y + '"/><text class="ax rl" style="fill:' + r.color + '" x="' + (W - R - 2) + '" y="' + (y - 4) + '" text-anchor="end">' + esc(r.name) + ' ' + fmt(r.y) + '</text>'; });
      // 系列
      series.forEach(function (s, si) {
        if (!s.pts.length) return; var ax = s.axis || 'l';
        var d = s.pts.map(function (p, i) { return (i ? 'L' : 'M') + X(p.d).toFixed(1) + ' ' + Y(p.y, ax).toFixed(1); }).join('');
        if (s.area) { var base = T + ih; o += '<path class="ar" style="fill:' + s.color + '" d="' + d + 'L' + X(s.pts[s.pts.length - 1].d).toFixed(1) + ' ' + base + 'L' + X(s.pts[0].d).toFixed(1) + ' ' + base + 'Z"/>'; }
        if (!s.noline) o += '<path class="ln' + (s.dash ? ' dash' : '') + '" pathLength="1" style="stroke:' + s.color + ';animation-delay:' + (si * 0.12) + 's" d="' + d + '"/>';
        if ((s.dots !== false && s.pts.length <= 60) || s.noline) s.pts.forEach(function (p) { o += '<circle class="dt" r="' + (s.dash ? 0 : s.noline ? 3.5 : 2.6) + '" cx="' + X(p.d).toFixed(1) + '" cy="' + Y(p.y, ax).toFixed(1) + '" style="fill:' + s.color + '"/>'; });
        if (s.pts.length === 1) { var p0 = s.pts[0]; o += '<circle class="dt" r="3.5" cx="' + X(p0.d) + '" cy="' + Y(p0.y, ax) + '" style="fill:' + s.color + '"/>'; }
      });
      // 命中列：同一日期所有系列值
      var dates = all.filter(function (d, i) { return all.indexOf(d) === i; }), step = dates.length > 1 ? iw / (dates.length - 1) : iw;
      dates.forEach(function (d, i) {
        var lines = series.map(function (s) { var p = s.pts.find(function (q) { return q.d === d; }); return p ? esc(s.name) + ' ' + (s.fmt ? s.fmt(p.y) : fmt(p.y)) + (s.unit || '') : null; }).filter(Boolean);
        if (!lines.length) return;
        var cx = X(d), half = Math.max(6, Math.min(step / 2, 30));
        o += '<rect class="hit" x="' + (cx - half).toFixed(1) + '" y="' + T + '" width="' + (half * 2).toFixed(1) + '" height="' + ih + '" data-tip="' + esc(d) + '\n' + lines.join('\n') + '"/>';
      });
      o += '</svg>';
      var lg = series.filter(function (s) { return s.pts.length; }).map(function (s) { return { name: s.name, color: s.color, dash: s.dash }; }).concat((opt.refs || []).filter(function (r) { return r.y != null; }).map(function (r) { return { name: r.name, color: r.color, dash: true }; }));
      return o + (lg.length > 1 || opt.legend ? legend(lg) : '');
    });
  }

  /**
   * 柱状（可堆叠）+ 目标线 + 可选右轴折线
   * opt = { h, cats:[{l, d, v, stack:[{v,color,name}], color, tip}], goal, goalName, unit, emptyMsg, overlay:{name,color,pts:[v|null],max,unit} }
   */
  function bars(el, opt) {
    var cats = opt.cats || [];
    var tot = function (c) { return c.stack ? c.stack.reduce(function (a, s) { return a + (s.v || 0); }, 0) : (c.v || 0); };
    if (!cats.some(function (c) { return tot(c) > 0 || c.has; })) return empty(el, opt.emptyMsg, opt.emptyHint);
    draw(el, opt, function (W) {
      var H = opt.h || 170, ov = opt.overlay, L = 36, R = ov ? 30 : 10, T = 12, B = 22, iw = W - L - R, ih = H - T - B;
      var mx = Math.max.apply(null, cats.map(tot).concat([opt.goal || 0, 0.0001])), sc = nice(0, mx * 1.05, 4);
      var Y = function (v) { return T + (1 - v / sc.max) * ih; }, bw = iw / cats.length, gap = Math.min(bw * 0.28, 8);
      var o = '<svg class="cv" viewBox="0 0 ' + W + ' ' + H + '" width="100%" height="' + H + '" preserveAspectRatio="xMinYMin meet">';
      for (var v = 0; v <= sc.max + 1e-9; v += sc.step) o += '<line class="gd" x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(v) + '" y2="' + Y(v) + '"/><text class="ax" x="' + (L - 5) + '" y="' + (Y(v) + 3.5) + '" text-anchor="end">' + fmt(v) + '</text>';
      var every = Math.ceil(cats.length / 6);
      cats.forEach(function (c, i) {
        var x = L + i * bw + gap / 2, w = Math.max(1.5, bw - gap), acc = 0, delay = (i / cats.length * 0.35).toFixed(2);
        var parts = c.stack || [{ v: c.v || 0, color: c.color || 'var(--acc)' }];
        parts.forEach(function (p) { if (!p.v) return; var y0 = Y(acc), y1 = Y(acc + p.v); o += '<rect class="br" style="fill:' + p.color + ';animation-delay:' + delay + 's" x="' + x.toFixed(1) + '" y="' + y1.toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + Math.max(0.5, y0 - y1).toFixed(1) + '" rx="' + Math.min(3, w / 3) + '"/>'; acc += p.v; });
        if (c.has && !tot(c)) o += '<rect class="br" style="fill:' + (c.color || 'var(--acc)') + '" x="' + x.toFixed(1) + '" y="' + (T + ih - 2) + '" width="' + w.toFixed(1) + '" height="2" rx="1"/>';
        if (c.mark) o += '<circle class="dt" r="2.6" cx="' + (x + w / 2).toFixed(1) + '" cy="' + (T - 4) + '" style="fill:' + c.mark + '"/>';
        if (i % every === 0) o += '<text class="ax" x="' + (L + i * bw + bw / 2).toFixed(1) + '" y="' + (H - 6) + '" text-anchor="middle">' + esc(c.l) + '</text>';
        var tip = c.tip || (esc(c.d || c.l) + '\n' + (c.stack ? c.stack.map(function (p) { return esc(p.name) + ' ' + fmt(p.v) + (opt.unit || ''); }).join('\n') : fmt(c.v) + (opt.unit || '')));
        o += '<rect class="hit" x="' + (L + i * bw).toFixed(1) + '" y="' + T + '" width="' + bw.toFixed(1) + '" height="' + ih + '" data-tip="' + tip + '"/>';
      });
      if (opt.goal) o += '<line class="ref" style="stroke:var(--mut)" x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(opt.goal) + '" y2="' + Y(opt.goal) + '"/><text class="ax rl" style="fill:var(--mut)" x="' + (W - R - 2) + '" y="' + (Y(opt.goal) - 4) + '" text-anchor="end">' + esc(opt.goalName || '目标') + ' ' + fmt(opt.goal) + '</text>';
      if (ov) {
        var OY = function (v) { return T + (1 - v / ov.max) * ih; }, d = '', first = true;
        ov.pts.forEach(function (v, i) { if (v == null) return; d += (first ? 'M' : 'L') + (L + i * bw + bw / 2).toFixed(1) + ' ' + OY(v).toFixed(1); first = false; });
        if (d) o += '<path class="ln" pathLength="1" style="stroke:' + ov.color + '" d="' + d + '"/>' + ov.pts.map(function (v, i) { return v == null ? '' : '<circle class="dt" r="2.6" cx="' + (L + i * bw + bw / 2).toFixed(1) + '" cy="' + OY(v).toFixed(1) + '" style="fill:' + ov.color + '"/>'; }).join('');
        var ost = ov.step || ov.max / 4; for (var k = 0; k <= ov.max + 1e-9; k += ost) o += '<text class="ax" x="' + (W - R + 5) + '" y="' + (OY(k) + 3.5) + '">' + fmt(k) + '</text>';
      }
      o += '</svg>';
      var lg = opt.legend || [];
      return o + legend(lg);
    });
  }

  /** 堆叠面积：opt = { h, from, to, series:[{name,color,pts:[{d,y}]}] }（各系列按日期对齐，缺失日期跳过） */
  function stack(el, opt) {
    var ser = opt.series, map = {};
    ser.forEach(function (s, si) { s.pts.forEach(function (p) { if (p.y == null || (opt.from && p.d < opt.from) || (opt.to && p.d > opt.to)) return; (map[p.d] = map[p.d] || [])[si] = p.y; }); });
    var dates = Object.keys(map).filter(function (d) { return ser.every(function (s, i) { return map[d][i] != null; }); }).sort();
    if (!dates.length) return empty(el, opt.emptyMsg, opt.emptyHint);
    draw(el, opt, function (W) {
      var H = opt.h || 170, L = 36, R = 12, T = 12, B = 22, iw = W - L - R, ih = H - T - B;
      var tots = dates.map(function (d) { return map[d].reduce(function (a, v) { return a + v; }, 0); }), sc = nice(0, Math.max.apply(null, tots) * 1.05, 4);
      var x0 = dayN(dates[0]), x1 = dayN(dates[dates.length - 1]); if (x0 === x1) { x0 -= 1; x1 += 1; }
      var X = function (d) { return L + (dayN(d) - x0) / (x1 - x0) * iw; }, Y = function (v) { return T + (1 - v / sc.max) * ih; };
      var o = '<svg class="cv" viewBox="0 0 ' + W + ' ' + H + '" width="100%" height="' + H + '" preserveAspectRatio="xMinYMin meet">';
      for (var v = 0; v <= sc.max + 1e-9; v += sc.step) o += '<line class="gd" x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(v) + '" y2="' + Y(v) + '"/><text class="ax" x="' + (L - 5) + '" y="' + (Y(v) + 3.5) + '" text-anchor="end">' + fmt(v) + '</text>';
      var lower = dates.map(function () { return 0; });
      ser.forEach(function (s, si) {
        var upper = dates.map(function (d, i) { return lower[i] + map[d][si]; });
        var top = dates.map(function (d, i) { return (i ? 'L' : 'M') + X(d).toFixed(1) + ' ' + Y(upper[i]).toFixed(1); }).join('');
        var bot = dates.slice().reverse().map(function (d, j) { var i = dates.length - 1 - j; return 'L' + X(d).toFixed(1) + ' ' + Y(lower[i]).toFixed(1); }).join('');
        if (dates.length === 1) { var cx = X(dates[0]); top = 'M' + (cx - 8) + ' ' + Y(upper[0]) + 'L' + (cx + 8) + ' ' + Y(upper[0]); bot = 'L' + (cx + 8) + ' ' + Y(lower[0]) + 'L' + (cx - 8) + ' ' + Y(lower[0]); }
        o += '<path class="ar st" style="fill:' + s.color + ';animation-delay:' + (si * 0.15) + 's" d="' + top + bot + 'Z"/>';
        o += '<path class="ln" pathLength="1" style="stroke:' + s.color + '" d="' + top + '"/>';
        lower = upper;
      });
      o += '<text class="ax" x="' + L + '" y="' + (H - 6) + '">' + md(dates[0]) + '</text><text class="ax" x="' + (W - R) + '" y="' + (H - 6) + '" text-anchor="end">' + md(dates[dates.length - 1]) + '</text>';
      var step = dates.length > 1 ? iw / (dates.length - 1) : iw;
      dates.forEach(function (d, i) { var half = Math.max(6, Math.min(step / 2, 30)); o += '<rect class="hit" x="' + (X(d) - half).toFixed(1) + '" y="' + T + '" width="' + (half * 2).toFixed(1) + '" height="' + ih + '" data-tip="' + d + '\n' + ser.map(function (s, si) { return esc(s.name) + ' ' + fmt(map[d][si]) + (opt.unit || ''); }).join('\n') + '"/>'; });
      return o + '</svg>' + legend(ser.map(function (s) { return { name: s.name, color: s.color }; }));
    });
  }

  /** 环图：opt = { parts:[{name,v,color,tip}], center, sub, size } */
  function donut(el, opt) {
    var sum = opt.parts.reduce(function (a, p) { return a + (p.v || 0); }, 0);
    if (!sum) return empty(el, opt.emptyMsg, opt.emptyHint);
    draw(el, opt, function () {
      var S = opt.size || 120, r = S / 2 - 10, C = 2 * Math.PI * r, acc = 0;
      var o = '<div class="dn"><svg class="cv" viewBox="0 0 ' + S + ' ' + S + '" width="' + S + '" height="' + S + '">';
      o += '<circle cx="' + S / 2 + '" cy="' + S / 2 + '" r="' + r + '" style="fill:none;stroke:var(--in);stroke-width:12"/>';
      opt.parts.forEach(function (p, i) {
        if (!p.v) return; var len = p.v / sum * C;
        o += '<circle class="seg" cx="' + S / 2 + '" cy="' + S / 2 + '" r="' + r + '" style="fill:none;stroke:' + p.color + ';stroke-width:12;stroke-dasharray:' + Math.max(0, len - 1.5).toFixed(2) + ' ' + C.toFixed(2) + ';stroke-dashoffset:' + (-acc).toFixed(2) + ';animation-delay:' + (i * 0.1) + 's" transform="rotate(-90 ' + S / 2 + ' ' + S / 2 + ')" data-tip="' + esc(p.tip || p.name + ' ' + Math.round(p.v / sum * 100) + '%') + '"/>';
        acc += len;
      });
      o += '<text x="50%" y="48%" text-anchor="middle" class="dc">' + esc(opt.center || '') + '</text><text x="50%" y="63%" text-anchor="middle" class="ax">' + esc(opt.sub || '') + '</text></svg>';
      o += '<div class="dl">' + opt.parts.map(function (p) { return '<div><i style="background:' + p.color + '"></i>' + esc(p.name) + '<b>' + Math.round(p.v / sum * 100) + '%</b></div>'; }).join('') + '</div></div>';
      return o;
    });
  }

  /** 横向条：opt = { rows:[{l, v, tip, color}], unit } */
  function hbars(el, opt) {
    var rows = opt.rows.filter(function (r) { return r.v > 0; });
    if (!rows.length) return empty(el, opt.emptyMsg, opt.emptyHint);
    draw(el, opt, function () {
      var mx = Math.max.apply(null, rows.map(function (r) { return r.v; }));
      return '<div class="hb">' + rows.map(function (r, i) { return '<div class="hr" data-tip="' + esc(r.tip || r.l + ' ' + fmt(r.v) + (opt.unit || '')) + '"><span>' + esc(r.l) + '</span><div class="hk"><i style="width:' + (r.v / mx * 100).toFixed(1) + '%;background:' + (r.color || 'var(--acc)') + ';animation-delay:' + (i * 0.06) + 's"></i></div><b>' + fmt(r.v) + '</b></div>'; }).join('') + '</div>';
    });
  }

  /** 热力日历（类 GitHub 贡献图）：opt = { to, weeks, val:{date:0-4}, tip:{date:text} } */
  function heat(el, opt) {
    draw(el, opt, function (W) {
      var weeks = opt.weeks || 26, to = opt.to, a = to.split('-'), end = new Date(+a[0], a[1] - 1, +a[2]);
      var dow = (end.getDay() + 6) % 7, start = new Date(end); start.setDate(end.getDate() - dow - (weeks - 1) * 7);
      var L = 18, T = 14, cell = Math.max(8, Math.min(22, Math.floor((W - L - 4) / weeks) - 2)), g = 2, H = T + 7 * (cell + g) + 4;
      var o = '<svg class="cv" viewBox="0 0 ' + (L + weeks * (cell + g)) + ' ' + H + '" width="100%" height="' + H + '" preserveAspectRatio="xMinYMin meet">';
      ['一', '三', '五'].forEach(function (t, i) { o += '<text class="ax" x="0" y="' + (T + (i * 2) * (cell + g) + cell - 1) + '">' + t + '</text>'; });
      var lastM = -1;
      for (var w = 0; w < weeks; w++) for (var d = 0; d < 7; d++) {
        var dt = new Date(start); dt.setDate(start.getDate() + w * 7 + d); if (dt > end) continue;
        var ds = dt.getFullYear() + '-' + ('0' + (dt.getMonth() + 1)).slice(-2) + '-' + ('0' + dt.getDate()).slice(-2), lv = (opt.val || {})[ds] || 0;
        if (d === 0 && dt.getMonth() !== lastM) { lastM = dt.getMonth(); o += '<text class="ax" x="' + (L + w * (cell + g)) + '" y="10">' + (lastM + 1) + '月</text>'; }
        o += '<rect class="hm l' + lv + '" style="animation-delay:' + (w / weeks * 0.4).toFixed(2) + 's" x="' + (L + w * (cell + g)) + '" y="' + (T + d * (cell + g)) + '" width="' + cell + '" height="' + cell + '" rx="2.5" data-tip="' + ds + '\n' + esc((opt.tip || {})[ds] || '无训练') + '"/>';
      }
      return o + '</svg><div class="lg hl"><span>少</span>' + [0, 1, 2, 3, 4].map(function (i) { return '<i class="hm l' + i + '"></i>'; }).join('') + '<span>多</span></div>';
    });
  }

  /* ---------- tooltip（点按 / 悬停） ---------- */
  var tipEl = null, active = null;
  function showTip(t, x, y) {
    if (!tipEl) { tipEl = document.createElement('div'); tipEl.className = 'ftip'; document.body.appendChild(tipEl); }
    if (active) active.classList.remove('on');
    active = t; t.classList.add('on');
    var lines = t.getAttribute('data-tip').split('\n');
    tipEl.innerHTML = '<b>' + esc(lines[0]) + '</b>' + lines.slice(1).map(function (l) { return '<div>' + esc(l) + '</div>'; }).join('');
    tipEl.style.display = 'block';
    var r = t.getBoundingClientRect(), tw = tipEl.offsetWidth, th = tipEl.offsetHeight;
    var cx = x != null ? x : r.left + r.width / 2, top = (y != null ? y : r.top) - th - 12;
    if (top < 8) top = (y != null ? y : r.bottom) + 14;
    tipEl.style.left = Math.max(8, Math.min(window.innerWidth - tw - 8, cx - tw / 2)) + 'px';
    tipEl.style.top = top + 'px';
  }
  function hideTip() { if (tipEl) tipEl.style.display = 'none'; if (active) active.classList.remove('on'); active = null; }
  document.addEventListener('click', function (e) { var t = e.target.closest && e.target.closest('[data-tip]'); if (t) { showTip(t, e.clientX, e.clientY); } else hideTip(); });
  document.addEventListener('mouseover', function (e) { if (!window.matchMedia || !matchMedia('(hover:hover)').matches) return; var t = e.target.closest && e.target.closest('[data-tip]'); if (t) showTip(t, e.clientX, e.clientY); else if (active) hideTip(); });
  window.addEventListener('scroll', hideTip, { passive: true });

  window.FitCharts = { line: line, bars: bars, stack: stack, donut: donut, hbars: hbars, heat: heat, empty: empty, fmt: fmt };
})();
