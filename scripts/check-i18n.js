"use strict";

// Checks that every displayed data value and every UI string has a Chinese
// translation. Run: node scripts/check-i18n.js
//
// Exits non-zero when something is missing, so it can be used before deploying.

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");

// The browser modules expect `window` / `document`; stub them for Node.
global.window = {};
global.document = { documentElement: { setAttribute: function () {} }, title: "" };

require(path.join(ROOT, "docs/js/i18n.js"));
require(path.join(ROOT, "docs/js/i18n-data.js"));

const I18n = global.window.ConcertI18n;
const dataZh = (global.window.ConcertDataI18n || { zh: {} }).zh;

const { buildDataset } = require(path.join(ROOT, "lib/dataset"));
const d = buildDataset();

const uniq = arr => Array.from(new Set(arr.filter(Boolean)));

const dataCats = {
  composers: uniq(d.programmes.map(p => p.composer_full || p.composer)),
  works: uniq(d.programmes.map(p => p.work_title)),
  conductors: uniq(d.concerts.map(c => c.conductor).concat(d.programmes.map(p => p.conductor))),
  orchestras: uniq(d.concerts.map(c => c.orchestra)),
  venues: uniq(d.concerts.map(c => c.venue_display)),
  soloists: uniq(d.programmes.map(p => p.soloists))
};

// UI keys referenced by static markup and by app.js / dynamic maps.
const html = fs.readFileSync(path.join(ROOT, "docs/index.html"), "utf8");
const app = fs.readFileSync(path.join(ROOT, "docs/js/app.js"), "utf8");
const uiKeys = new Set();

["data-i18n", "data-i18n-html", "data-i18n-placeholder", "data-i18n-title"].forEach(function (attr) {
  const re = new RegExp(attr + '="([^"]+)"', "g");
  let m;
  while ((m = re.exec(html))) uiKeys.add(m[1]);
});
{
  const re = /I18n\.t\("([^"]+)"\)/g;
  let m;
  while ((m = re.exec(app))) uiKeys.add(m[1]);
}
[
  "stat.events", "stat.pieces", "stat.avgRating", "stat.composers", "stat.works",
  "stat.orchestras", "stat.years",
  "filter.all", "filter.concerts", "filter.operas", "filter.ballets",
  "badge.opera", "badge.ballet", "badge.encore",
  "period.Classical", "period.Romantic", "period.Post-Romantic",
  "period.20th Century", "period.Contemporary",
  "chart.noData"
].forEach(function (k) { uiKeys.add(k); });

let missing = 0;

console.log("Data translations");
Object.keys(dataCats).forEach(function (cat) {
  const dict = dataZh[cat] || {};
  const miss = dataCats[cat].filter(function (v) { return dict[v] == null; });
  console.log("  " + cat + ": " + dataCats[cat].length + " values, " + miss.length + " missing");
  miss.forEach(function (v) { console.log("    MISSING " + v); });
  missing += miss.length;
});

console.log("\nUI translations");
["en", "zh"].forEach(function (lang) {
  I18n.setLang(lang);
  const miss = Array.from(uiKeys).filter(function (k) { return I18n.t(k) === k; });
  console.log("  " + lang + ": " + uiKeys.size + " keys, " + miss.length + " missing");
  miss.forEach(function (k) { console.log("    MISSING " + k); });
  missing += miss.length;
});

console.log("\n" + (missing ? missing + " missing" : "All translations present."));
process.exit(missing ? 1 : 0);
