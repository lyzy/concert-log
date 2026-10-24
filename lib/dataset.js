"use strict";

// Builds the concert dataset from the CSV sources in data/.
// Shared by the backend (server.js, /api/*) and the static export
// (scripts/build-data.js -> docs/data/concert.json).
//
// The dataset is precomputed here so the frontend only has to render.

const fs = require("fs");
const path = require("path");
const { parse, normalizeDate } = require("./parse");

const ROOT = path.join(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");

function readCsv(name) {
  return parse(fs.readFileSync(path.join(DATA_DIR, name), "utf8"));
}

// Group items by a key, returning [{label, value}] sorted desc by value.
function countBy(items, keyFn) {
  const m = new Map();
  items.forEach(function (it) {
    const k = keyFn(it);
    if (k == null || k === "") return;
    m.set(k, (m.get(k) || 0) + 1);
  });
  return Array.from(m, function (e) { return { label: e[0], value: e[1] }; })
    .sort(function (a, b) { return b.value - a.value || a.label.localeCompare(b.label); });
}

// "4", "4.5", "" -> 4 / 4.5 / null
function toRating(value) {
  const s = String(value == null ? "" : value).trim();
  if (s === "") return null;
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

function ratingDistribution(items) {
  const m = new Map();
  items.forEach(function (it) {
    if (it.rating == null) return;
    const k = String(it.rating);
    m.set(k, (m.get(k) || 0) + 1);
  });
  return Array.from(m, function (e) { return { label: e[0], value: e[1] }; })
    .sort(function (a, b) { return parseFloat(a.label) - parseFloat(b.label); });
}

// Average rating per key, sorted by average (desc). Used for "Average Rating by Period".
function avgRatingBy(items, keyFn) {
  const m = new Map();
  items.forEach(function (it) {
    const k = keyFn(it);
    if (k == null || k === "") return;
    const o = m.get(k) || { n: 0, sum: 0, rated: 0 };
    o.n++;
    if (it.rating != null) { o.sum += it.rating; o.rated++; }
    m.set(k, o);
  });
  return Array.from(m, function (e) {
    return {
      label: e[0],
      value: e[1].rated ? +(e[1].sum / e[1].rated).toFixed(2) : 0,
      count: e[1].n
    };
  }).sort(function (a, b) { return b.value - a.value || a.label.localeCompare(b.label); });
}

// Show the venue exactly as recorded, but abbreviate "Hong Kong" -> "HK".
// "Hong Kong Cultural Centre Concert Hall" -> "HK Cultural Centre Concert Hall"
function venueDisplay(name) {
  return String(name || "").trim().replace(/Hong Kong/g, "HK");
}

// "La Cenerentola: Overture" -> "La Cenerentola". Excerpts from the same work
// (e.g. two numbers from one opera) share a base title so they count as one.
function workBase(title) {
  const s = String(title || "");
  const i = s.indexOf(":");
  return (i >= 0 ? s.slice(0, i) : s).trim();
}

function workGroupKey(p) {
  return (p.composer || p.composer_full || "") + "|" + workBase(p.work_title);
}

// Collapse items from the same work within a single event (two excerpts from
// one opera performed that night count once). Repeats across events still count.
function dedupePerEvent(items, keyFn) {
  const seen = new Set();
  const out = [];
  items.forEach(function (it) {
    const k = it.concert_id + "\u0000" + keyFn(it);
    if (seen.has(k)) return;
    seen.add(k);
    out.push(it);
  });
  return out;
}

// A row belongs to the encore section when `section` starts with "Encore".
function isEncore(p) {
  return /^encore\b/i.test(String(p.section || "").trim());
}

// A piece counts as opera when it is tagged "Opera" or belongs to an Opera event.
function isOperaPiece(p, c) {
  if (/opera/i.test(String(p.tag || ""))) return true;
  return !!(c && c.event_type === "Opera");
}

function buildDataset() {
  const concerts = readCsv("concerts.csv").map(function (c) {
    return Object.assign({}, c, { date: normalizeDate(c.date), venue_display: venueDisplay(c.venue) });
  });
  const programmes = readCsv("programmes.csv").map(function (p) {
    const raw = p.rating != null && p.rating !== "" ? p.rating : p.ratings;
    const r = Object.assign({}, p, { rating: toRating(raw) });
    r.encore = isEncore(r);
    return r;
  });

  // Encores are display-only bonus items: they never enter the statistics.
  const mainProgrammes = programmes.filter(function (p) { return !p.encore; });

  const concertById = {};
  concerts.forEach(function (c) { concertById[c.concert_id] = c; });

  const performedWorks = dedupePerEvent(mainProgrammes, workGroupKey);

  const nonOperaWorks = performedWorks.filter(function (p) {
    return !isOperaPiece(p, concertById[p.concert_id]);
  });

  const composers = new Set(performedWorks.map(function (p) { return p.composer; }).filter(Boolean));
  const works = new Set(performedWorks.map(workGroupKey).filter(Boolean));
  const orchestras = new Set(concerts.map(function (c) { return c.orchestra; }).filter(Boolean));
  const years = new Set(concerts.map(function (c) { return (c.date || "").slice(0, 4); }).filter(Boolean));

  const dates = concerts.map(function (c) { return c.date; }).filter(Boolean).sort();

  const typeCounts = {};
  concerts.forEach(function (c) {
    const t = String(c.event_type || "").trim() || "Concert";
    typeCounts[t] = (typeCounts[t] || 0) + 1;
  });

  const rated = mainProgrammes.map(function (p) { return p.rating; })
    .filter(function (v) { return v != null; });
  const avgRating = rated.length
    ? rated.reduce(function (a, b) { return a + b; }, 0) / rated.length
    : null;

  const stats = [
    { label: "Events", value: concerts.length },
    { label: "Pieces heard", value: performedWorks.length },
    { label: "Avg rating", value: avgRating == null ? "\u2014" : avgRating.toFixed(1) },
    { label: "Composers", value: composers.size },
    { label: "Unique works", value: works.size },
    { label: "Orchestras", value: orchestras.size },
    { label: "Years", value: years.size }
  ];

  const charts = {
    byPeriod: countBy(performedWorks, function (p) { return p.period; }),
    byPeriodRating: avgRatingBy(performedWorks, function (p) { return p.period; }),
    byComposer: countBy(performedWorks, function (p) { return p.composer_full || p.composer; }).slice(0, 12),
    byComposerRating: avgRatingBy(performedWorks, function (p) { return p.composer_full || p.composer; })
      .filter(function (x) { return x.count >= 2; }),
    byComposerRatingNoOpera: avgRatingBy(nonOperaWorks, function (p) { return p.composer_full || p.composer; })
      .filter(function (x) { return x.count >= 2; }),
    byConductor: countBy(concerts, function (c) { return c.conductor; }).slice(0, 12),
    byVenue: countBy(concerts, function (c) { return c.venue_display; }).slice(0, 8),
    byRating: ratingDistribution(mainProgrammes)
  };

  const byWork = new Map();
  performedWorks.forEach(function (p) {
    const k = workGroupKey(p);
    if (!byWork.has(k)) byWork.set(k, []);
    byWork.get(k).push(p);
  });
  const repeatedWorks = Array.from(byWork)
    .filter(function (e) { return e[1].length > 1; })
    .map(function (e) {
      const list = e[1];
      const p0 = list[0];
      return {
        title: (p0.composer_full || p0.composer) + " \u2014 " + workBase(p0.work_title),
        count: list.length,
        performances: list.map(function (p) {
          const c = concertById[p.concert_id] || {};
          return { date: c.date || "", conductor: p.conductor || c.conductor || "" };
        })
      };
    });

  return {
    generatedAt: new Date().toISOString(),
    counts: {
      events: concerts.length,
      programmes: performedWorks.length,
      composers: composers.size,
      works: works.size,
      orchestras: orchestras.size,
      years: years.size
    },
    byType: typeCounts,
    dateRange: dates.length ? { from: dates[0], to: dates[dates.length - 1] } : null,
    stats: stats,
    charts: charts,
    repeatedWorks: repeatedWorks,
    concerts: concerts,
    programmes: programmes
  };
}

module.exports = { buildDataset, countBy };
