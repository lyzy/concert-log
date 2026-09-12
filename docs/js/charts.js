/* =====================================================================
   charts.js — pure inline SVG chart builders
   Colors reference CSS variables (var(--chart-N)) so charts re-theme
   automatically when the theme changes. Exposed as window.ConcertCharts.
   ===================================================================== */
window.ConcertCharts = (function () {
  "use strict";

  var PALETTE = [
    "var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)",
    "var(--chart-5)", "var(--chart-6)", "var(--chart-7)", "var(--chart-8)"
  ];

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // Vertical bar chart (categorical, e.g. concerts per year).
  function vBar(data, color) {
    if (!data.length) return '<p class="muted">No data.</p>';
    color = color || PALETTE[0];
    var W = 600, H = 240, pad = { l: 34, r: 12, t: 22, b: 38 };
    var iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
    var max = Math.max.apply(null, data.map(function (d) { return d.value; })) || 1;
    var bw = iw / data.length;
    var barW = Math.min(bw * 0.62, 64);
    var s = ['<svg viewBox="0 0 ' + W + ' ' + H + '" role="img">'];
    for (var g = 0; g <= 4; g++) {
      var y = pad.t + ih - (ih * g / 4);
      s.push('<line class="gridline" x1="' + pad.l + '" y1="' + y + '" x2="' + (W - pad.r) + '" y2="' + y + '" stroke-width="0.6" opacity="' + (g === 0 ? 0.9 : 0.4) + '"/>');
      s.push('<text class="axis-text" x="' + (pad.l - 7) + '" y="' + (y + 3.5) + '" text-anchor="end">' + Math.round(max * g / 4) + '</text>');
    }
    data.forEach(function (d, i) {
      var h = ih * d.value / max;
      var x = pad.l + i * bw + (bw - barW) / 2;
      var y = pad.t + ih - h;
      s.push('<rect x="' + x + '" y="' + y + '" width="' + barW + '" height="' + Math.max(h, 1) + '" rx="4" style="fill:' + color + '" opacity="0.9"><title>' + esc(d.label) + ': ' + d.value + '</title></rect>');
      s.push('<text class="bar-value" x="' + (x + barW / 2) + '" y="' + (y - 6) + '" text-anchor="middle">' + d.value + '</text>');
      s.push('<text class="cat-label" x="' + (pad.l + i * bw + bw / 2) + '" y="' + (H - pad.b + 16) + '" text-anchor="middle">' + esc(d.label) + '</text>');
    });
    s.push('</svg>');
    return s.join("");
  }

  // Horizontal bar chart (ranked, e.g. most-heard composers).
  function hBar(data, color, maxRows) {
    if (!data.length) return '<p class="muted">No data.</p>';
    if (maxRows) data = data.slice(0, maxRows);
    // Reserve label space based on the longest label so text never overflows.
    var longest = data.reduce(function (m, d) { return Math.max(m, String(d.label).length); }, 0);
    var padL = Math.min(Math.max(longest * 7.4 + 16, 96), 250);
    var rowH = 32, pad = { l: padL, r: 46, t: 6, b: 6 };
    var W = 600, H = data.length * rowH + pad.t + pad.b;
    var iw = W - pad.l - pad.r;
    var max = Math.max.apply(null, data.map(function (d) { return d.value; })) || 1;
    color = color || PALETTE[1];
    var s = ['<svg viewBox="0 0 ' + W + ' ' + H + '" role="img">'];
    data.forEach(function (d, i) {
      var y = pad.t + i * rowH;
      var barH = 18;
      var w = Math.max(iw * d.value / max, 2);
      s.push('<text class="row-label" x="' + (pad.l - 10) + '" y="' + (y + barH - 2) + '" text-anchor="end">' + esc(d.label) + '</text>');
      s.push('<rect x="' + pad.l + '" y="' + y + '" width="' + w + '" height="' + barH + '" rx="4" style="fill:' + color + '" opacity="0.88"><title>' + esc(d.label) + ': ' + d.value + '</title></rect>');
      s.push('<text class="row-value" x="' + (pad.l + w + 7) + '" y="' + (y + barH - 2) + '">' + d.value + '</text>');
    });
    s.push('</svg>');
    return s.join("");
  }

  // Donut chart with legend (e.g. pieces by period).
  function donut(data) {
    if (!data.length) return '<p class="muted">No data.</p>';
    var size = 220, cx = size / 2, cy = size / 2, rO = 96, rI = 58;
    var total = data.reduce(function (a, d) { return a + d.value; }, 0) || 1;
    function polar(r, deg) {
      var a = (deg - 90) * Math.PI / 180;
      return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
    }
    function arc(rO_, rI_, start, end) {
      var p1 = polar(rO_, start), p2 = polar(rO_, end), p3 = polar(rI_, end), p4 = polar(rI_, start);
      var large = (end - start) > 180 ? 1 : 0;
      return "M" + p1[0] + "," + p1[1] + " A" + rO_ + "," + rO_ + " 0 " + large + " 1 " + p2[0] + "," + p2[1] +
             " L" + p3[0] + "," + p3[1] + " A" + rI_ + "," + rI_ + " 0 " + large + " 0 " + p4[0] + "," + p4[1] + " Z";
    }
    var angle = 0;
    var s = ['<svg viewBox="0 0 ' + size + ' ' + size + '" style="max-width:260px;margin:0 auto" role="img">'];
    data.forEach(function (d, i) {
      var sweep = d.value / total * 360;
      var end = angle + sweep;
      s.push('<path d="' + arc(rO, rI, angle, end) + '" style="fill:' + PALETTE[i % PALETTE.length] + '" opacity="0.9"><title>' + esc(d.label) + ': ' + d.value + '</title></path>');
      angle = end;
    });
    s.push('<text class="donut-total" x="' + cx + '" y="' + (cy - 2) + '" text-anchor="middle">' + total + '</text>');
    s.push('<text class="donut-caption" x="' + cx + '" y="' + (cy + 18) + '" text-anchor="middle">pieces</text>');
    s.push('</svg>');
    s.push('<div class="legend">');
    data.forEach(function (d, i) {
      s.push('<div class="item"><span class="dot" style="background:' + PALETTE[i % PALETTE.length] + '"></span>' +
             esc(d.label) + ' <span class="v">' + d.value + '</span></div>');
    });
    s.push('</div>');
    return s.join("");
  }

  return { vBar: vBar, hBar: hBar, donut: donut, PALETTE: PALETTE, esc: esc };
})();
