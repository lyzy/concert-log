"use strict";

// Backend: Node.js (built-in http, no dependencies).
//   - serves the public site from docs/
//   - exposes the dataset at /api/*
//   - serves a local-only editor at /admin that writes back to data/*.csv
//
// Run: node server.js   -> http://localhost:3000

const http = require("http");
const fs = require("fs");
const path = require("path");
const { buildDataset } = require("./lib/dataset");
const store = require("./lib/admin-store");

const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, "docs");
const DATA_DIR = path.join(ROOT, "data");
const ADMIN_DIR = path.join(ROOT, "admin");
const OUT_JSON = path.join(PUBLIC_DIR, "data", "concert.json");

// Preferred ports (3000 first; some Windows setups reserve 2948-3047 for
// Hyper-V/WSL, which makes 3000 fail with EACCES). Try each until one binds,
// or honour an explicit PORT from the environment.
const PORTS = process.env.PORT ? [Number(process.env.PORT)] : [3000, 8080, 8081, 5173, 4321, 9000];

let dataset = buildDataset();

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon"
};

function writeDatasetJson() {
  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.writeFileSync(OUT_JSON, JSON.stringify(dataset, null, 2) + "\n");
}

function reloadDataset() {
  dataset = buildDataset();
  writeDatasetJson();
}

function serveFile(res, filePath) {
  fs.readFile(filePath, function (err, data) {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end("Not found");
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(data);
  });
}

function serveStatic(req, res) {
  let urlPath = decodeURIComponent(req.url.split("?")[0]);
  if (urlPath === "/") urlPath = "/index.html";
  const filePath = path.normalize(path.join(PUBLIC_DIR, urlPath));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }
  serveFile(res, filePath);
}

function serveAdmin(req, res) {
  let urlPath = decodeURIComponent(req.url.split("?")[0]);
  if (urlPath === "/admin" || urlPath === "/admin/") urlPath = "/index.html";
  else urlPath = urlPath.slice("/admin".length);
  const filePath = path.normalize(path.join(ADMIN_DIR, urlPath));
  if (!filePath.startsWith(ADMIN_DIR)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }
  serveFile(res, filePath);
}

function sendJson(res, data, status) {
  res.writeHead(status || 200, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*"
  });
  res.end(JSON.stringify(data));
}

function sendLocalJson(res, data, status) {
  res.writeHead(status || 200, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}

function isLocal(req) {
  const ip = req.socket.remoteAddress || "";
  return ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1";
}

// A page on another origin must not be able to POST to this local editor.
function isSameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true; // same-origin fetch or command-line client
  try {
    const u = new URL(origin);
    return u.hostname === "localhost" || u.hostname === "127.0.0.1";
  } catch (e) {
    return false;
  }
}

function readBody(req, cb) {
  let size = 0;
  const chunks = [];
  req.on("data", function (c) {
    size += c.length;
    if (size > 10 * 1024 * 1024) { req.destroy(); return; }
    chunks.push(c);
  });
  req.on("end", function () {
    try {
      const text = Buffer.concat(chunks).toString("utf8");
      cb(null, text ? JSON.parse(text) : {});
    } catch (e) {
      cb(e);
    }
  });
  req.on("error", function (e) { cb(e); });
}

function handle(req, res) {
  const url = req.url.split("?")[0];

  // ---- local admin page + assets -------------------------------------------
  if (url === "/admin" || url.startsWith("/admin/")) {
    if (!isLocal(req)) return sendLocalJson(res, { error: "forbidden" }, 403);
    return serveAdmin(req, res);
  }

  // ---- local admin API -----------------------------------------------------
  if (url.startsWith("/api/admin/")) {
    if (!isLocal(req) || !isSameOrigin(req)) return sendLocalJson(res, { error: "forbidden" }, 403);

    if (url === "/api/admin/csv" && req.method === "GET") {
      const q = new URL(req.url, "http://local").searchParams;
      const name = q.get("file") || "concerts";
      const text = store.csvText(DATA_DIR, name);
      if (text == null) return sendLocalJson(res, { error: "unknown file" }, 404);
      res.writeHead(200, { "Content-Type": "text/csv; charset=utf-8" });
      return res.end(text);
    }

    if (url === "/api/admin/save" && req.method === "POST") {
      return readBody(req, function (err, body) {
        if (err) return sendLocalJson(res, { error: "invalid JSON" }, 400);
        try {
          const result = store.saveEvent(DATA_DIR, body.event || {}, body.pieces || []);
          reloadDataset();
          return sendLocalJson(res, { ok: true, concert_id: result.concert_id });
        } catch (e) {
          return sendLocalJson(res, { error: e.message }, 400);
        }
      });
    }

    if (url === "/api/admin/event" && req.method === "DELETE") {
      const q = new URL(req.url, "http://local").searchParams;
      const id = q.get("id");
      if (!id) return sendLocalJson(res, { error: "id required" }, 400);
      const ok = store.deleteEvent(DATA_DIR, id);
      if (ok) reloadDataset();
      return sendLocalJson(res, { ok: ok });
    }

    return sendLocalJson(res, { error: "not found" }, 404);
  }

  // ---- public API ----------------------------------------------------------
  if (url === "/api/dataset") {
    return sendJson(res, dataset);
  }

  if (url === "/api/concerts") {
    return sendJson(res, dataset.concerts);
  }

  if (url === "/api/programmes") {
    return sendJson(res, dataset.programmes);
  }

  if (url === "/api/stats") {
    return sendJson(res, {
      counts: dataset.counts,
      byType: dataset.byType,
      dateRange: dataset.dateRange,
      stats: dataset.stats,
      charts: dataset.charts,
      repeatedWorks: dataset.repeatedWorks
    });
  }

  if (url === "/api/health") {
    return sendJson(res, { ok: true, concerts: dataset.concerts.length, programmes: dataset.programmes.length });
  }

  if (url.startsWith("/api/")) {
    return sendJson(res, { error: "not found" }, 404);
  }

  serveStatic(req, res);
}

function start(index) {
  if (index >= PORTS.length) {
    console.error("No free port found (tried " + PORTS.join(", ") + "). Set PORT to override.");
    process.exit(1);
  }
  const port = PORTS[index];
  const server = http.createServer(handle);
  server.on("error", function (err) {
    if (err.code === "EADDRINUSE" || err.code === "EACCES") {
      console.log("Port " + port + " unavailable (" + err.code + "), trying next...");
      start(index + 1);
    } else {
      console.error("Could not start server: " + err.message);
      process.exit(1);
    }
  });
  server.listen(port, function () {
    console.log("Concert Record running at http://localhost:" + port);
    console.log("Editor (local only):   http://localhost:" + port + "/admin");
    console.log("Dataset: " + dataset.concerts.length + " events, " + dataset.programmes.length + " pieces.");
    console.log("API: /api/dataset  /api/concerts  /api/programmes  /api/stats  /api/health");
  });
}

start(0);
