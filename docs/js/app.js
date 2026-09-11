/* =====================================================================
   app.js — frontend renderer
   Fetches the precomputed dataset (docs/data/concert.json, also served
   by the backend) and renders it. Handles theme switching and search.
   ===================================================================== */
(function () {
  "use strict";

  var Charts = window.ConcertCharts;
  var esc = Charts.esc;
  var DATA_URL = "data/concert.json";
  var THEME_KEY = "concert-theme";
  var DEFAULT_THEME = "everforest";

  var dataset = null;
  var concertById = {};

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
      c.concerts + " concerts \u00b7 " + c.programmes + " pieces" + range;
  }

  function renderStats() {
    document.getElementById("stats").innerHTML = dataset.stats.map(function (s) {
      return '<div class="stat"><div class="n">' + esc(s.value) + '</div><div class="l">' + esc(s.label) + '</div></div>';
    }).join("");
  }

  function renderCharts() {
    var ch = dataset.charts;
    document.getElementById("chartYear").innerHTML = Charts.vBar(ch.byYear, "var(--chart-1)");
    document.getElementById("chartPeriod").innerHTML = Charts.donut(ch.byPeriod);
    document.getElementById("chartComposer").innerHTML = Charts.hBar(ch.byComposer, "var(--chart-2)", 12);
    document.getElementById("chartConductor").innerHTML = Charts.hBar(ch.byConductor, "var(--chart-3)", 12);
    document.getElementById("chartVenue").innerHTML = Charts.hBar(ch.byVenue, "var(--chart-4)", 8);
  }

  function renderRepeated() {
    var repeated = dataset.repeatedWorks;
    var el = document.getElementById("repeat");
    if (!repeated.length) {
      el.innerHTML = '<p class="muted">No work heard more than once yet.</p>';
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

  function renderTable(query) {
    var q = (query || "").trim().toLowerCase();
    var rows = dataset.programmes.map(function (p) {
      return { p: p, c: concertById[p.concert_id] || {} };
    }).filter(function (r) {
      if (!q) return true;
      var hay = [r.p.composer, r.p.composer_full, r.p.work_title, r.p.opus, r.p.period,
                 r.p.conductor, r.p.soloists, r.p.performers, r.c.venue, r.c.city, r.c.date].join(" ").toLowerCase();
      return hay.indexOf(q) !== -1;
    }).sort(function (a, b) {
      var d = (a.c.date || "").localeCompare(b.c.date || "");
      if (d) return d;
      return (+a.p.piece_order || 0) - (+b.p.piece_order || 0);
    });

    document.getElementById("tbody").innerHTML = rows.map(function (r) {
      var p = r.p, c = r.c;
      return "<tr>" +
        "<td>" + esc(c.date || "") + "</td>" +
        "<td>" + esc(p.composer_full || p.composer) + "</td>" +
        "<td>" + esc(p.work_title) + "</td>" +
        "<td>" + esc(p.opus || "") + "</td>" +
        "<td>" + (p.period ? '<span class="pill">' + esc(p.period) + '</span>' : "") + "</td>" +
        "<td>" + esc(p.conductor || c.conductor || "") + "</td>" +
        "<td>" + esc(p.soloists || "") + "</td>" +
        "<td>" + esc(c.venue || "") + "</td>" +
        "</tr>";
    }).join("");
  }

  function renderAll() {
    concertById = {};
    dataset.concerts.forEach(function (c) { concertById[c.concert_id] = c; });
    renderSubtitle();
    renderStats();
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
    document.getElementById("subtitle").textContent = "No data loaded.";
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
        showError("The dataset could not be fetched (" + err.message + ").");
      });
  }

  // ------------------------------------------------------------- wire up
  initTheme();

  document.getElementById("themeSelect").addEventListener("change", function (e) {
    applyTheme(e.target.value);
  });

  document.getElementById("reloadBtn").addEventListener("click", load);
  document.getElementById("retryBtn").addEventListener("click", load);
  document.getElementById("search").addEventListener("input", function (e) {
    if (dataset) renderTable(e.target.value);
  });

  load();
})();
