/* =====================================================================
   app.js — frontend renderer
   Fetches the precomputed dataset (docs/data/concert.json, also served
   by the backend) and renders it. Handles theme switching and search.
   ===================================================================== */
(function () {
  "use strict";

  var Charts = window.ConcertCharts;
  var I18n = window.ConcertI18n;
  var esc = Charts.esc;
  var DATA_URL = "data/concert.json";
  var THEME_KEY = "concert-theme";
  var LANG_KEY = "concert-lang";
  var DEFAULT_THEME = "everforest";

  var dataset = null;
  var concertById = {};
  var sort = { key: "date", dir: "asc" };
  var filterType = "";
  var showEncores = true;
  var ENCORE_KEY = "concert-show-encores";
  var composerOpera = true;
  var COMPOSER_OPERA_KEY = "concert-composer-opera";
  var avgOpera = true;
  var AVG_OPERA_KEY = "concert-avg-opera";

  var FILTERS = [
    { type: "", label: "filter.all" },
    { type: "Concert", label: "filter.concerts" },
    { type: "Opera", label: "filter.operas" },
    { type: "Ballet", label: "filter.ballets" }
  ];

  var STAT_KEYS = {
    "Events": "stat.events",
    "Pieces heard": "stat.pieces",
    "Avg rating": "stat.avgRating",
    "Composers": "stat.composers",
    "Unique works": "stat.works",
    "Orchestras": "stat.orchestras",
    "Years": "stat.years"
  };

  var BADGE_KEYS = { "Opera": "badge.opera", "Ballet": "badge.ballet", "Encore": "badge.encore" };

  // ---------------------------------------------------------------- theme
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    var sel = document.getElementById("themeSelect");
    if (sel && sel.value !== theme) sel.value = theme;
    try { localStorage.setItem(THEME_KEY, theme); } catch (e) { /* ignore */ }
  }

  function initTheme() {
    var theme = DEFAULT_THEME;
    try { theme = localStorage.getItem(THEME_KEY) || DEFAULT_THEME; } catch (e) { /* ignore */ }
    var sel = document.getElementById("themeSelect");
    if (sel && !Array.prototype.some.call(sel.options, function (o) { return o.value === theme; })) {
      theme = DEFAULT_THEME;
    }
    applyTheme(theme);
  }

  // --------------------------------------------------------------- render
  function renderSubtitle() {
    var c = dataset.counts;
    var r = dataset.dateRange;
    var range = r ? (" \u00b7 " + r.from + " \u2192 " + r.to) : "";
    document.getElementById("subtitle").textContent =
      c.events + " " + I18n.t("unit.events") + " \u00b7 " + c.programmes + " " + I18n.t("unit.pieces") + range;
  }

  function renderFilters() {
    var counts = dataset.byType || {};
    var el = document.getElementById("filters");
    el.innerHTML = FILTERS.map(function (f) {
      var n = f.type === "" ? dataset.counts.events : (counts[f.type] || 0);
      var cls = "filter" + (f.type === filterType ? " active" : "") + (n === 0 && f.type !== "" ? " empty" : "");
      return '<button class="' + cls + '" data-type="' + f.type + '" type="button">' +
        esc(I18n.t(f.label)) + ' <span class="count">' + n + '</span></button>';
    }).join("");
    Array.prototype.forEach.call(el.querySelectorAll("button"), function (b) {
      b.addEventListener("click", function () {
        filterType = b.getAttribute("data-type");
        renderFilters();
        renderTable(document.getElementById("search").value);
      });
    });
  }

  function renderStats() {
    var r = dataset.ratings || {};
    document.getElementById("stats").innerHTML = dataset.stats.map(function (s) {
      var label = STAT_KEYS[s.label] ? I18n.t(STAT_KEYS[s.label]) : s.label;
      if (s.label === "Avg rating") {
        var v = avgOpera ? r.avg : r.avgNoOpera;
        var txt = v == null ? "\u2014" : v.toFixed(1);
        return '<div class="stat"><div class="n">' + esc(txt) + '</div>' +
          '<div class="l">' + esc(label) +
          ' <label class="stat-toggle" title="' + esc(I18n.t("title.includeOpera")) + '"><input type="checkbox" id="avgOpera"' + (avgOpera ? ' checked' : '') + '> ' + esc(I18n.t("badge.opera")) + '</label></div></div>';
      }
      return '<div class="stat"><div class="n">' + esc(s.value) + '</div><div class="l">' + esc(label) + '</div></div>';
    }).join("");

    var cb = document.getElementById("avgOpera");
    if (cb) {
      cb.addEventListener("change", function (e) {
        avgOpera = e.target.checked;
        try { localStorage.setItem(AVG_OPERA_KEY, avgOpera ? "1" : "0"); } catch (err) { /* ignore */ }
        renderStats();
      });
    }
  }

  function periodLabel(p) {
    var k = "period." + p;
    var v = I18n.t(k);
    return v === k ? p : v;
  }

  function localizePeriods(arr) {
    return (arr || []).map(function (d) {
      return { label: periodLabel(d.label), value: d.value, count: d.count };
    });
  }

  function renderComposerRating() {
    if (!dataset) return;
    var data = composerOpera ? dataset.charts.byComposerRating : dataset.charts.byComposerRatingNoOpera;
    document.getElementById("chartComposerRating").innerHTML =
      Charts.hBar(data || [], "var(--chart-6)", 0, 5);
  }

  function renderCharts() {
    var ch = dataset.charts;
    document.getElementById("chartPeriodRating").innerHTML = Charts.hBar(localizePeriods(ch.byPeriodRating), "var(--chart-1)", 0, 5);
    document.getElementById("chartPeriod").innerHTML = Charts.donut(localizePeriods(ch.byPeriod));
    document.getElementById("chartComposer").innerHTML = Charts.hBar(ch.byComposer, "var(--chart-2)", 12);
    renderComposerRating();
    document.getElementById("chartConductor").innerHTML = Charts.hBar(ch.byConductor, "var(--chart-3)", 12);
    document.getElementById("chartVenue").innerHTML = Charts.hBar(ch.byVenue, "var(--chart-4)", 8);
    document.getElementById("chartRating").innerHTML = Charts.vBar(ch.byRating, "var(--chart-5)");
  }

  function renderRepeated() {
    var repeated = dataset.repeatedWorks;
    var el = document.getElementById("repeat");
    if (!repeated.length) {
      el.innerHTML = '<p class="muted">' + esc(I18n.t("repeat.empty")) + '</p>';
      return;
    }
    el.innerHTML = '<ul class="repeat-list">' + repeated.map(function (w) {
      var parts = w.title.split(" \u2014 ");
      var related = w.performances.map(function (p) {
        return p.date + (p.conductor ? " \u00b7 " + p.conductor : "");
      }).join(" | ");
      return '<li><div class="work"><b>' + esc(parts[1] || w.title) + '</b>' +
             '<span>' + esc(parts[0] || "") + '</span>' +
             '<span>' + esc(related) + '</span></div>' +
             '<span class="badge">' + w.count + '\u00d7</span></li>';
    }).join("") + '</ul>';
  }

  function stars(rating) {
    var pct = Math.max(0, Math.min(5, rating)) / 5 * 100;
    return '<span class="stars" style="--pct:' + pct + '%" title="' + esc(rating) + ' / 5">' +
      '<span class="stars-bg">\u2605\u2605\u2605\u2605\u2605</span>' +
      '<span class="stars-fg">\u2605\u2605\u2605\u2605\u2605</span>' +
      '</span>';
  }

  function ratingCell(v) {
    if (v == null) return '<span class="muted">\u2014</span>';
    return '<span class="rating-cell">' + stars(v) +
      '<span class="rating-num">' + esc(v) + '</span></span>';
  }

  function isEncore(p) {
    return !!p.encore;
  }

  function badgeLabel(v) {
    return BADGE_KEYS[v] ? I18n.t(BADGE_KEYS[v]) : v;
  }

  function workBadge(p, c) {
    var parts = [];
    // Per-piece tag wins; otherwise show the event type for opera/ballet events.
    var t = String(p.tag || "").trim();
    if (!t && c.event_type && c.event_type !== "Concert") t = c.event_type;
    if (t) parts.push('<span class="type-badge">' + esc(badgeLabel(t)) + '</span>');
    if (isEncore(p)) parts.push('<span class="type-badge encore-badge">' + esc(I18n.t("badge.encore")) + '</span>');
    return parts.length ? " " + parts.join(" ") : "";
  }

  function compareRows(a, b) {
    if (sort.key === "composer") {
      // `composer` is the surname field; `composer_full` breaks ties.
      var an = a.p.composer || a.p.composer_full || "";
      var bn = b.p.composer || b.p.composer_full || "";
      var dc = an.localeCompare(bn);
      if (dc) return sort.dir === "asc" ? dc : -dc;
      var df = (a.p.composer_full || "").localeCompare(b.p.composer_full || "");
      if (df) return sort.dir === "asc" ? df : -df;
      var dtc = (a.c.date || "").localeCompare(b.c.date || "");
      if (dtc) return dtc;
      return (+a.p.piece_order || 0) - (+b.p.piece_order || 0);
    }
    if (sort.key === "rating") {
      var ra = a.p.rating, rb = b.p.rating;
      if (ra == null && rb == null) return (b.c.date || "").localeCompare(a.c.date || "");
      if (ra == null) return 1;
      if (rb == null) return -1;
      var d = ra - rb;
      if (d) return sort.dir === "asc" ? d : -d;
      return (b.c.date || "").localeCompare(a.c.date || "");
    }
    var dd = (a.c.date || "").localeCompare(b.c.date || "");
    if (dd) return sort.dir === "asc" ? dd : -dd;
    // same date: group by event, then follow piece_order (true performance order,
    // so encores stay where they happened instead of being pushed to the end)
    var ca = +a.c.concert_id || 0, cb = +b.c.concert_id || 0;
    if (ca !== cb) return ca - cb;
    return (+a.p.piece_order || 0) - (+b.p.piece_order || 0);
  }

  function renderTable(query) {
    var q = (query || "").trim().toLowerCase();
    var rows = dataset.programmes.map(function (p) {
      return { p: p, c: concertById[p.concert_id] || {} };
    }).filter(function (r) {
      if (!showEncores && isEncore(r.p)) return false;
      if (filterType && (r.c.event_type || "Concert") !== filterType) return false;
      if (!q) return true;
      var hay = [r.p.composer, r.p.composer_full, r.p.work_title, r.p.opus, r.p.period,
                 r.p.conductor, r.p.soloists, r.p.performers, r.p.rating, r.p.tag, r.p.section,
                 r.c.event_type, r.c.orchestra, r.c.city, r.c.date].join(" ").toLowerCase();
      return hay.indexOf(q) !== -1;
    }).sort(compareRows);

    var html = rows.map(function (r) {
      var p = r.p, c = r.c;
      return "<tr>" +
        "<td>" + esc(c.date || "") + "</td>" +
        "<td>" + esc(p.composer_full || p.composer) + "</td>" +
        "<td>" + esc(p.work_title) + workBadge(p, c) + "</td>" +
        "<td>" + esc(p.opus || "") + "</td>" +
        "<td>" + (p.period ? '<span class="pill">' + esc(p.period) + '</span>' : "") + "</td>" +
        "<td>" + esc(p.conductor || c.conductor || "") + "</td>" +
        "<td>" + esc(p.soloists || "") + "</td>" +
        "<td>" + esc(c.orchestra || "") + "</td>" +
        "<td>" + ratingCell(p.rating) + "</td>" +
        "</tr>";
    });
    document.getElementById("tbody").innerHTML = html.join("");
  }

  function renderAll() {
    concertById = {};
    dataset.concerts.forEach(function (c) { concertById[c.concert_id] = c; });
    renderSubtitle();
    renderStats();
    renderFilters();
    renderCharts();
    renderRepeated();
    renderTable("");
    revealCards();
  }

  // ------------------------------------------------------- reveal on scroll
  var observer = null;
  function revealCards() {
    var els = document.querySelectorAll(".reveal:not(.in)");
    if (!("IntersectionObserver" in window)) {
      els.forEach(function (el) { el.classList.add("in"); });
      return;
    }
    if (!observer) {
      observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            observer.unobserve(entry.target);
          }
        });
      }, { rootMargin: "0px 0px -40px 0px", threshold: 0.05 });
    }
    els.forEach(function (el) { observer.observe(el); });
  }

  // ---------------------------------------------------------- data loading
  function showError(msg) {
    document.getElementById("subtitle").textContent = I18n.t("error.noData");
    document.getElementById("overlayMsg").textContent = msg;
    document.getElementById("overlay").classList.add("show");
  }

  function load() {
    document.getElementById("overlay").classList.remove("show");
    fetch(DATA_URL, { cache: "no-store" })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (data) {
        dataset = data;
        renderAll();
      })
      .catch(function (err) {
        showError(I18n.t("error.fetch") + " (" + err.message + ")");
      });
  }

  // ------------------------------------------------------------- wire up
  function initEncores() {
    try {
      var v = localStorage.getItem(ENCORE_KEY);
      if (v !== null) showEncores = v === "1";
    } catch (e) { /* ignore */ }
    var cb = document.getElementById("showEncores");
    if (cb) cb.checked = showEncores;
  }

  function initComposerOpera() {
    try {
      var v = localStorage.getItem(COMPOSER_OPERA_KEY);
      if (v !== null) composerOpera = v === "1";
    } catch (e) { /* ignore */ }
    var cb = document.getElementById("composerOpera");
    if (cb) cb.checked = composerOpera;
  }

  function initAvgOpera() {
    try {
      var v = localStorage.getItem(AVG_OPERA_KEY);
      if (v !== null) avgOpera = v === "1";
    } catch (e) { /* ignore */ }
  }

  function initLang() {
    var l = "en";
    try { l = localStorage.getItem(LANG_KEY) || "en"; } catch (e) { /* ignore */ }
    I18n.setLang(l);
    I18n.applyStatic();
    var sel = document.getElementById("langSelect");
    if (sel) sel.value = I18n.getLang();
  }

  initLang();
  initTheme();
  initEncores();
  initComposerOpera();
  initAvgOpera();

  document.getElementById("themeSelect").addEventListener("change", function (e) {
    applyTheme(e.target.value);
  });
  document.getElementById("langSelect").addEventListener("change", function (e) {
    var l = e.target.value;
    try { localStorage.setItem(LANG_KEY, l); } catch (err) { /* ignore */ }
    I18n.setLang(l);
    I18n.applyStatic();
    if (dataset) renderAll();
  });

  document.getElementById("reloadBtn").addEventListener("click", load);
  document.getElementById("retryBtn").addEventListener("click", load);
  document.getElementById("search").addEventListener("input", function (e) {
    if (dataset) renderTable(e.target.value);
  });
  document.getElementById("showEncores").addEventListener("change", function (e) {
    showEncores = e.target.checked;
    try { localStorage.setItem(ENCORE_KEY, showEncores ? "1" : "0"); } catch (err) { /* ignore */ }
    if (dataset) renderTable(document.getElementById("search").value);
  });
  document.getElementById("composerOpera").addEventListener("change", function (e) {
    composerOpera = e.target.checked;
    try { localStorage.setItem(COMPOSER_OPERA_KEY, composerOpera ? "1" : "0"); } catch (err) { /* ignore */ }
    renderComposerRating();
  });

  // sortable column headers
  function applySortClasses() {
    Array.prototype.forEach.call(document.querySelectorAll("th[data-sort]"), function (th) {
      th.classList.remove("sorted-asc", "sorted-desc");
      if (th.getAttribute("data-sort") === sort.key) {
        th.classList.add(sort.dir === "asc" ? "sorted-asc" : "sorted-desc");
      }
    });
  }

  Array.prototype.forEach.call(document.querySelectorAll("th[data-sort]"), function (th) {
    th.addEventListener("click", function () {
      var key = th.getAttribute("data-sort");
      if (sort.key === key) {
        sort.dir = sort.dir === "asc" ? "desc" : "asc";
      } else {
        sort.key = key;
        sort.dir = key === "rating" ? "desc" : "asc";
      }
      applySortClasses();
      renderTable(document.getElementById("search").value);
    });
  });
  applySortClasses();

  load();
})();
