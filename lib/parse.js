"use strict";

// Parses the CSV sources into row objects.
//   parseCSV  -> array of string[] rows
//   toObjects -> array of objects keyed by the header row
//   parse     -> toObjects(parseCSV(text))
//
// Handles quoted fields, escaped quotes (""), CRLF line endings and a UTF-8 BOM.

function parseCSV(text) {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
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
  const header = rows[0].map(function (h) { return h.trim(); });
  return rows.slice(1).map(function (r) {
    const o = {};
    for (let i = 0; i < header.length; i++) {
      o[header[i]] = (r[i] == null ? "" : r[i]).trim();
    }
    return o;
  });
}

function parse(text) {
  return toObjects(parseCSV(text));
}

module.exports = { parseCSV, toObjects, parse };
