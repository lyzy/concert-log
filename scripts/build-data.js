"use strict";

// Builds the static data used by the frontend:
//   docs/data/concert.json — the full precomputed dataset (concerts,
//   programmes, stats, charts, repeated works).
//
// Run this before publishing to a static host (e.g. GitHub Pages):
//   node scripts/build-data.js

const fs = require("fs");
const path = require("path");
const { buildDataset } = require("../lib/dataset");

const OUT_DIR = path.join(__dirname, "..", "docs", "data");

// The JSON keeps the full "All Pieces" table at the top level, plus one
// precomputed statistics view for each combination of the two switches.
const all = buildDataset({ includeWorld: true, includeOpera: true });
const noWorld = buildDataset({ includeWorld: false, includeOpera: true });
const noOpera = buildDataset({ includeWorld: true, includeOpera: false });
const none = buildDataset({ includeWorld: false, includeOpera: false });

function view(d) {
  return {
    counts: d.counts,
    dateRange: d.dateRange,
    stats: d.stats,
    ratings: d.ratings,
    charts: d.charts,
    repeatedWorks: d.repeatedWorks
  };
}

const dataset = Object.assign({}, all, {
  views: {
    all: view(all),
    noWorld: view(noWorld),
    noOpera: view(noOpera),
    none: view(none)
  }
});

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(
  path.join(OUT_DIR, "concert.json"),
  JSON.stringify(dataset, null, 2) + "\n"
);

console.log(
  "Wrote docs/data/concert.json (" +
    all.concerts.length + " concerts, " +
    all.programmes.length + " pieces; stats views: all " +
    all.counts.events + "/" + all.counts.programmes + ", noWorld " +
    noWorld.counts.events + "/" + noWorld.counts.programmes + ", noOpera " +
    noOpera.counts.events + "/" + noOpera.counts.programmes + ", none " +
    none.counts.events + "/" + none.counts.programmes + ")."
);
