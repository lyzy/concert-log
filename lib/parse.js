"use strict";

// Parses the CSV sources into row objects.
//   parseCSV  -> array of string[] rows
//   toObjects -> array of objects keyed by the header row
//   parse     -> toObjects(parseCSV(text))
//
// Handles quoted fields, escaped quotes (""), CRLF line endings and a UTF-8 BOM.

function parseCSV(text) {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  // Also strip a literal "\uFEFF" string that some editors or tools may
  // write instead of the actual BOM character.
  if (text.charCodeAt(0) === 0x5c && text.slice(0, 6) === "\\uFEFF") text = text.slice(6);
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field); field = "";
    } else if (c === "\n") {
      row.push(field); rows.push(row); row = []; field = "";
    } else if (c !== "\r") {
      field += c;
    }
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }

  return rows.filter(function (r) {
    return r.length > 1 || (r.length === 1 && r[0] !== "");
  });
}

function toObjects(rows) {
  if (!rows.length) return [];
  // Header keys are normalized to lower case so `Ratings`/`Rating`/`rating`
  // all resolve to the same field.
  const header = rows[0].map(function (h) { return h.trim().toLowerCase(); });
  // Ignore a stray trailing empty column (e.g. a trailing comma) so it does
  // not become an unnamed "" key in the output objects.
  while (header.length && header[header.length - 1] === "") header.pop();
  return rows.slice(1).map(function (r) {
    const o = {};
    for (let i = 0; i < header.length; i++) {
      if (header[i] === "") continue;
      o[header[i]] = (r[i] == null ? "" : r[i]).trim();
    }
    return o;
  });
}

// Accepts the date formats spreadsheets produce and normalizes to ISO:
//   2025-05-08, 2025/5/8, 2025-5-8  ->  2025-05-08
function normalizeDate(value) {
  const s = String(value == null ? "" : value).trim();
  const m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (!m) return s;
  return m[1] + "-" + m[2].padStart(2, "0") + "-" + m[3].padStart(2, "0");
}

function parse(text) {
  return toObjects(parseCSV(text));
}

module.exports = { parseCSV, toObjects, parse, normalizeDate };
