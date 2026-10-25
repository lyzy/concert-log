"use strict";

// Read/write helpers for the local admin editor.
// Keeps the CSVs as the source of truth: parse -> edit -> serialize with the
// same BOM + LF + quoting rules used everywhere else.

const fs = require("fs");
const path = require("path");
const { parseCSV, normalizeDate, csvEscape } = require("./parse");

const ALLOWED_TYPES = ["Concert", "Opera", "Ballet"];

function readTable(dataDir, name) {
  const p = path.join(dataDir, name);
  let t = fs.readFileSync(p, "utf8");
  if (t.charCodeAt(0) === 0xfeff) t = t.slice(1);
  const rows = parseCSV(t);
  const header = rows[0].map(function (h) { return h.trim().toLowerCase(); });
  return { header: header, rows: rows.slice(1) };
}

function writeTable(dataDir, name, header, rows) {
  const p = path.join(dataDir, name);
  const body = [header]
    .concat(rows)
    .map(function (r) { return r.map(csvEscape).join(","); })
    .join("\n") + "\n";
  fs.writeFileSync(p, "\uFEFF" + body, "utf8");
}

function rowToObject(header, row) {
  const o = {};
  header.forEach(function (h, i) {
    o[h] = (row[i] == null ? "" : String(row[i])).trim();
  });
  return o;
}

function objectToRow(header, obj) {
  return header.map(function (h) {
    const v = obj[h];
    return v == null ? "" : String(v).trim();
  });
}

function backup(dataDir, names) {
  const dir = path.join(dataDir, "..", ".backups");
  fs.mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  names.forEach(function (name) {
    const src = path.join(dataDir, name);
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(dir, stamp + "-" + name));
  });
}

function validateEvent(event) {
  const date = String(event.date || "").trim();
  if (!date) throw new Error("date is required");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizeDate(date))) {
    throw new Error("date '" + date + "' is not a valid date (use YYYY-MM-DD)");
  }
  const type = String(event.event_type || "").trim() || "Concert";
  if (ALLOWED_TYPES.indexOf(type) === -1) {
    throw new Error("event_type must be Concert, Opera or Ballet");
  }
}

function saveEvent(dataDir, event, pieces) {
  validateEvent(event);

  const c = readTable(dataDir, "concerts.csv");
  const p = readTable(dataDir, "programmes.csv");

  let id = String(event.concert_id || "").trim();
  if (!id) {
    const max = c.rows.reduce(function (m, r) { return Math.max(m, parseInt(r[0], 10) || 0); }, 0);
    id = String(max + 1);
  }
  if (!/^\d+$/.test(id)) throw new Error("concert_id must be a number");

  const existingIdx = c.rows.findIndex(function (r) { return r[0] === id; });
  const base = existingIdx >= 0 ? rowToObject(c.header, c.rows[existingIdx]) : {};
  const evObj = Object.assign({}, base, event, {
    concert_id: id,
    date: normalizeDate(event.date),
    event_type: String(event.event_type || "").trim() || "Concert"
  });
  const evRow = objectToRow(c.header, evObj);

  if (existingIdx >= 0) c.rows[existingIdx] = evRow;
  else c.rows.push(evRow);

  const list = (pieces || [])
    .filter(function (piece) { return String(piece.work_title || "").trim() !== ""; })
    .map(function (piece, i) {
      const obj = Object.assign({}, piece, { concert_id: id, piece_order: String(i + 1) });
      obj.rating = String(obj.rating == null ? "" : obj.rating).trim();
      if (obj.rating !== "" && isNaN(parseFloat(obj.rating))) {
        throw new Error("rating '" + obj.rating + "' is not numeric");
      }
      return objectToRow(p.header, obj);
    });

  const firstIdx = p.rows.findIndex(function (r) { return r[0] === id; });
  const filtered = p.rows.filter(function (r) { return r[0] !== id; });
  let insertAt;
  if (firstIdx >= 0) {
    insertAt = 0;
    for (let i = 0; i < firstIdx; i++) if (p.rows[i][0] !== id) insertAt++;
  } else {
    insertAt = filtered.length;
  }
  const newRows = filtered.slice(0, insertAt).concat(list, filtered.slice(insertAt));

  backup(dataDir, ["concerts.csv", "programmes.csv"]);
  writeTable(dataDir, "concerts.csv", c.header, c.rows);
  writeTable(dataDir, "programmes.csv", p.header, newRows);

  return { concert_id: id };
}

function deleteEvent(dataDir, id) {
  const c = readTable(dataDir, "concerts.csv");
  const p = readTable(dataDir, "programmes.csv");
  const before = c.rows.length;
  c.rows = c.rows.filter(function (r) { return r[0] !== String(id); });
  p.rows = p.rows.filter(function (r) { return r[0] !== String(id); });
  if (c.rows.length === before) return false;

  backup(dataDir, ["concerts.csv", "programmes.csv"]);
  writeTable(dataDir, "concerts.csv", c.header, c.rows);
  writeTable(dataDir, "programmes.csv", p.header, p.rows);
  return true;
}

function csvText(dataDir, name) {
  const map = { concerts: "concerts.csv", programmes: "programmes.csv" };
  const file = map[name];
  if (!file) return null;
  return fs.readFileSync(path.join(dataDir, file), "utf8");
}

module.exports = {
  readTable: readTable,
  rowToObject: rowToObject,
  objectToRow: objectToRow,
  saveEvent: saveEvent,
  deleteEvent: deleteEvent,
  csvText: csvText,
  backup: backup
};
