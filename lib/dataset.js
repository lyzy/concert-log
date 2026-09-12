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

function formatSpend(spend) {
  const keys = Object.keys(spend);
  if (!keys.length) return "\u2014";
  return keys.map(function (k) {
    return (k ? k + " " : "") + spend[k].toLocaleString("en-US");
  }).join(" + ");
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

// "Hong Kong Cultural Centre Concert Hall" -> "Hong Kong Cultural Centre"
function shortVenue(name) {
  const s = String(name || "").trim();
  return s.replace(/\s+Concert\s+Hall$/i, "").trim() || s;
}

function buildDataset() {
  const concerts = readCsv("concerts.csv").map(function (c) {
    return Object.assign({}, c, { date: normalizeDate(c.date) });
  });
  const programmes = readCsv("programmes.csv").map(function (p) {
    const raw = p.rating != null && p.rating !== "" ? p.rating : p.ratings;
    return Object.assign({}, p, { rating: toRating(raw) });
  });

  const concertById = {};
  concerts.forEach(function (c) { concertById[c.concert_id] = c; });

  const composers = new Set(programmes.map(function (p) { return p.composer; }).filter(Boolean));
  const works = new Set(programmes.map(function (p) { return p.composer + "|" + p.work_title; }).filter(Boolean));
  const orchestras = new Set(concerts.map(function (c) { return c.orchestra; }).filter(Boolean));
  const years = new Set(concerts.map(function (c) { return (c.date || "").slice(0, 4); }).filter(Boolean));

  const spend = {};
  concerts.forEach(function (c) {
    const v = parseFloat(c.ticket_price);
    if (!isNaN(v) && v > 0) spend[c.currency || ""] = (spend[c.currency || ""] || 0) + v;
  });

  const dates = concerts.map(function (c) { return c.date; }).filter(Boolean).sort();

  const rated = programmes.map(function (p) { return p.rating; })
    .filter(function (v) { return v != null; });
  const avgRating = rated.length
    ? rated.reduce(function (a, b) { return a + b; }, 0) / rated.length
    : null;

  const stats = [
    { label: "Concerts", value: concerts.length },
    { label: "Pieces heard", value: programmes.length },
    { label: "Avg rating", value: avgRating == null ? "\u2014" : avgRating.toFixed(1) },
    { label: "Composers", value: composers.size },
    { label: "Unique works", value: works.size },
    { label: "Orchestras", value: orchestras.size },
    { label: "Years", value: years.size },
    { label: "Ticket spend", value: formatSpend(spend) }
  ];

  const charts = {
    byYear: countBy(concerts, function (c) { return (c.date || "").slice(0, 4); })
      .sort(function (a, b) { return a.label.localeCompare(b.label); }),
    byPeriod: countBy(programmes, function (p) { return p.period; }),
    byComposer: countBy(programmes, function (p) { return p.composer_full || p.composer; }).slice(0, 12),
    byConductor: countBy(programmes, function (p) { return p.conductor; }).slice(0, 12),
    byVenue: countBy(concerts, function (c) { return shortVenue(c.venue); }).slice(0, 8),
    byRating: ratingDistribution(programmes)
  };

  const workCounts = countBy(programmes, function (p) {
    return (p.composer_full || p.composer) + " \u2014 " + p.work_title;
  });
  const repeatedWorks = workCounts.filter(function (w) { return w.value > 1; })
    .map(function (w) {
      const performances = programmes
        .filter(function (p) { return ((p.composer_full || p.composer) + " \u2014 " + p.work_title) === w.label; })
        .map(function (p) {
          const c = concertById[p.concert_id] || {};
          return { date: c.date || "", conductor: p.conductor || c.conductor || "" };
        });
      return { title: w.label, count: w.value, performances: performances };
    });

  return {
    generatedAt: new Date().toISOString(),
    counts: {
      concerts: concerts.length,
      programmes: programmes.length,
      composers: composers.size,
      works: works.size,
      orchestras: orchestras.size,
      years: years.size
    },
    dateRange: dates.length ? { from: dates[0], to: dates[dates.length - 1] } : null,
    stats: stats,
    charts: charts,
    repeatedWorks: repeatedWorks,
    concerts: concerts,
    programmes: programmes
  };
}

module.exports = { buildDataset, countBy };
