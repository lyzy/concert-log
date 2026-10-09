"use strict";

// Backend: Node.js (built-in http, no dependencies).
//   - serves the frontend from docs/
//   - exposes the concert dataset at /api/*
//
// Run: node server.js   -> http://localhost:3000

const http = require("http");
const fs = require("fs");
const path = require("path");
const { buildDataset } = require("./lib/dataset");

const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, "docs");

// Preferred ports (3000 first; some Windows setups reserve 2948-3047 for
// Hyper-V/WSL, which makes 3000 fail with EACCES). Try each until one binds,
// or honour an explicit PORT from the environment.
const PORTS = process.env.PORT ? [Number(process.env.PORT)] : [3000, 8080, 8081, 5173, 4321, 9000];

const dataset = buildDataset();

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon"
};

function serveStatic(req, res) {
  let urlPath = decodeURIComponent(req.url.split("?")[0]);
  if (urlPath === "/") urlPath = "/index.html";

  const filePath = path.normalize(path.join(PUBLIC_DIR, urlPath));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }

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

function sendJson(res, data, status) {
  res.writeHead(status || 200, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*"
  });
  res.end(JSON.stringify(data));
}

function handle(req, res) {
  const url = req.url.split("?")[0];

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
    console.log("Dataset: " + dataset.concerts.length + " events, " + dataset.programmes.length + " pieces.");
    console.log("API: /api/dataset  /api/concerts  /api/programmes  /api/stats  /api/health");
  });
}

start(0);
