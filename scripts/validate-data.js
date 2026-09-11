"use strict";

// Validates the CSV sources in data/.
//   node scripts/validate-data.js
//
// Checks encoding (BOM, UTF-8), line endings, column counts, trailing empty
// fields, date format, and referential integrity. Exits non-zero on errors.

const fs = require("fs");
const path = require("path");
const { parseCSV, normalizeDate } = require("../lib/parse");

const DATA_DIR = path.join(__dirname, "..", "data");

let errors = 0;
let warnings = 0;
const err = m => { errors++; console.log("  ERROR  " + m); };
const warn = m => { warnings++; console.log("  WARN   " + m); };
const ok = m => console.log("  ok     " + m);

function checkEncoding(name, buf) {
  console.log("\n" + name);
  const hasBom = buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf;
  if (hasBom) ok("UTF-8 BOM present");
  else err("UTF-8 BOM missing (Excel may misread non-ASCII characters)");

  try {
    new TextDecoder("utf-8", { fatal: true }).decode(buf);
    ok("valid UTF-8");
  } catch (e) {
    err("invalid UTF-8 bytes");
  }

  let crlf = 0, lf = 0;
  for (let i = 0; i < buf.length; i++) {
    if (buf[i] === 10) { if (i > 0 && buf[i - 1] === 13) crlf++; else lf++; }
  }
  if (crlf > 0 && lf > 0) warn("mixed line endings (CRLF=" + crlf + ", LF=" + lf + ")");
  else if (crlf > 0) warn("CRLF line endings (" + crlf + ") - .gitattributes normalizes to LF on commit");
  else ok("LF line endings");
}

function checkStructure(name, rows, expectedCols, uniqueFirst) {
  const header = rows[0].map(h => h.trim());
  if (header[header.length - 1] === "") err("header has a trailing empty column (trailing comma)");
  const named = header.filter(h => h !== "").length;
  if (expectedCols && named !== expectedCols) err("header has " + named + " named columns, expected " + expectedCols);
  else ok(named + " columns");

  const seen = new Set();
  rows.slice(1).forEach((r, idx) => {
    const line = idx + 2;
    if (r.length > header.length) {
      const extra = r.slice(header.length);
      if (extra.some(x => x !== "")) err("line " + line + ": extra non-empty field(s) " + JSON.stringify(extra));
      else warn("line " + line + ": trailing empty field");
    } else if (r.length < header.length) {
      warn("line " + line + ": fewer fields (" + r.length + "/" + header.length + ")");
    }
    if (uniqueFirst) {
      const key = r[0];
      if (seen.has(key)) err("line " + line + ": duplicate " + header[0] + "=" + key);
      seen.add(key);
    }
  });
  return { header, data: rows.slice(1) };
}

function colIndex(header, name) { return header.indexOf(name); }

function main() {
  console.log("Validating CSVs in " + DATA_DIR);

  const cBuf = fs.readFileSync(path.join(DATA_DIR, "concerts.csv"));
  const pBuf = fs.readFileSync(path.join(DATA_DIR, "programmes.csv"));

  checkEncoding("concerts.csv", cBuf);
  checkEncoding("programmes.csv", pBuf);

  console.log("\nconcerts.csv structure");
  const concerts = checkStructure("concerts.csv", parseCSV(cBuf.toString("utf8")), 13, true);
  const dIdx = colIndex(concerts.header, "date");
  concerts.data.forEach((r, i) => {
    const raw = r[dIdx];
    if (raw && normalizeDate(raw) !== raw) err("line " + (i + 2) + ": date '" + raw + "' is not ISO (YYYY-MM-DD)");
  });

  console.log("\nprogrammes.csv structure");
  const programmes = checkStructure("programmes.csv", parseCSV(pBuf.toString("utf8")), 12, false);

  console.log("\nreferential integrity");
  const cIds = new Set(concerts.data.map(r => r[0]));
  programmes.data.forEach((r, i) => {
    if (!cIds.has(r[0])) err("programmes.csv line " + (i + 2) + ": concert_id " + r[0] + " not found in concerts.csv");
  });
  ok(concerts.data.length + " concerts, " + programmes.data.length + " programmes");

  console.log("\n----------------------------------------");
  console.log(errors + " error(s), " + warnings + " warning(s)");
  process.exit(errors ? 1 : 0);
}

main();
