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
const dataset = buildDataset();

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(
  path.join(OUT_DIR, "concert.json"),
  JSON.stringify(dataset, null, 2) + "\n"
);

console.log(
  "Wrote docs/data/concert.json (" +
    dataset.concerts.length + " concerts, " +
    dataset.programmes.length + " pieces, " +
    dataset.repeatedWorks.length + " repeated works)."
);
