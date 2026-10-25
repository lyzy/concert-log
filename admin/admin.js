/* Local editor for data/*.csv. Served at /admin by server.js (localhost only). */
(function () {
  "use strict";

  var EVENT_FIELDS = [
    { key: "date", label: "Date (YYYY-MM-DD)", placeholder: "2026-10-23" },
    { key: "event_type", label: "Type", type: "select", options: ["Concert", "Opera", "Ballet"] },
    { key: "venue", label: "Venue" },
    { key: "city", label: "City" },
    { key: "orchestra", label: "Orchestra" },
    { key: "conductor", label: "Conductor" },
    { key: "soloists", label: "Soloists" },
    { key: "ticket_price", label: "Ticket price" },
    { key: "currency", label: "Currency" },
    { key: "companion", label: "Companion" },
    { key: "notes", label: "Notes" },
    { key: "review", label: "My review", type: "textarea", wide: true }
  ];

  var PIECE_FIELDS = [
    { key: "composer", label: "Composer (surname)" },
    { key: "composer_full", label: "Composer full name" },
    { key: "work_title", label: "Work title", wide: true },
    { key: "opus", label: "Opus" },
    { key: "catalog", label: "Catalog" },
    { key: "period", label: "Period", type: "select", options: ["", "Classical", "Romantic", "Post-Romantic", "20th Century", "Contemporary"] },
    { key: "conductor", label: "Conductor" },
    { key: "soloists", label: "Soloists" },
    { key: "performers", label: "Performers" },
    { key: "rating", label: "Rating (0–5)" },
    { key: "tag", label: "Tag (e.g. Opera)" },
    { key: "section", label: "Section", type: "select", options: ["", "encore", "encore 1", "encore 2"] },
    { key: "notes", label: "Notes", wide: true }
  ];

  var state = { events: [], programmes: [], id: null, event: {}, pieces: [] };
  var els = {};

  function $(id) { return document.getElementById(id); }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function setStatus(msg, isErr) {
    els.status.textContent = msg || "";
    els.status.className = "status" + (isErr ? " err" : "");
  }

  function emptyPiece() {
    return {
      composer: "", composer_full: "", work_title: "", opus: "", catalog: "",
      period: "", conductor: "", soloists: "", performers: "", rating: "",
      tag: "", section: "", notes: ""
    };
  }

  function load() {
    setStatus("Loading\u2026");
    fetch("/api/dataset", { cache: "no-store" })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        state.events = d.concerts.slice();
        state.programmes = d.programmes.slice();
        renderList();
        if (state.events.length) {
          var latest = state.events.slice().sort(function (a, b) {
            return (b.date || "").localeCompare(a.date || "");
          })[0];
          selectEvent(latest.concert_id);
        } else {
          newEvent();
        }
        setStatus("");
      })
      .catch(function (e) { setStatus("Load failed: " + e.message, true); });
  }

  function renderList() {
    els.eventList.innerHTML = state.events.slice()
      .sort(function (a, b) { return (b.date || "").localeCompare(a.date || ""); })
      .map(function (c) {
        var active = c.concert_id === state.id ? ' class="active"' : "";
        var bits = [c.date, c.orchestra || c.venue].filter(Boolean).join(" \u00b7 ");
        return "<li" + active + ' data-id="' + esc(c.concert_id) + '">' +
          "<b>" + esc(c.conductor || c.orchestra || "\u2014") + "</b>" +
          '<span class="meta">' + esc(bits) + "</span></li>";
      }).join("");
  }

  function selectEvent(id) {
    var c = state.events.filter(function (x) { return x.concert_id === id; })[0];
    if (!c) return;
    state.id = id;
    state.event = Object.assign({}, c);
    state.pieces = state.programmes
      .filter(function (p) { return p.concert_id === id; })
      .slice()
      .sort(function (a, b) { return (+a.piece_order || 0) - (+b.piece_order || 0); })
      .map(function (p) { return Object.assign({}, p); });
    renderList();
    renderForm();
  }

  function newEvent() {
    state.id = null;
    state.event = { event_type: "Concert" };
    state.pieces = [emptyPiece()];
    renderList();
    renderForm();
  }

  function fieldHtml(prefix, key, label, value, f) {
    var id = prefix + "-" + key;
    var wide = f.wide ? " wide" : "";
    var input;
    if (f.type === "textarea") {
      input = '<textarea id="' + id + '" data-key="' + key + '">' + esc(value) + "</textarea>";
    } else if (f.type === "select") {
      input = '<select id="' + id + '" data-key="' + key + '">' +
        (f.options || []).map(function (o) {
          return '<option value="' + esc(o) + '"' + (String(value || "").toLowerCase() === String(o).toLowerCase() ? " selected" : "") + ">" +
            (o === "" ? "\u2014" : esc(o)) + "</option>";
        }).join("") + "</select>";
    } else {
      input = '<input id="' + id + '" data-key="' + key + '" type="text" value="' + esc(value) +
        '" placeholder="' + esc(f.placeholder || "") + '">';
    }
    return '<div class="field' + wide + '"><label for="' + id + '">' + esc(label) + "</label>" + input + "</div>";
  }

  function renderForm() {
    els.editorTitle.textContent = state.id ? "Event #" + state.id : "New event";
    els.deleteBtn.disabled = !state.id;
    els.eventFields.innerHTML = EVENT_FIELDS.map(function (f) {
      return fieldHtml("ev", f.key, f.label, state.event[f.key], f);
    }).join("");
    renderPieces();
  }

  function renderPieces() {
    els.pieces.innerHTML = state.pieces.map(function (p, i) {
      return '<div class="piece" data-index="' + i + '">' +
        '<div class="piece-head"><strong>#' + (i + 1) + "</strong>" +
        '<div class="piece-actions">' +
        (i > 0 ? '<button type="button" data-move="-1" title="Move up">\u2191</button>' : "") +
        (i < state.pieces.length - 1 ? '<button type="button" data-move="1" title="Move down">\u2193</button>' : "") +
        '<button type="button" class="danger" data-remove="1">Remove</button>' +
        "</div></div>" +
        '<div class="grid">' + PIECE_FIELDS.map(function (f) {
          return fieldHtml("p" + i, f.key, f.label, p[f.key], f);
        }).join("") + "</div></div>";
    }).join("");
  }

  function collectEvent() {
    var e = {};
    Array.prototype.forEach.call(els.eventFields.querySelectorAll("[data-key]"), function (el) {
      e[el.getAttribute("data-key")] = el.value;
    });
    return e;
  }

  function collectPieces() {
    var out = [];
    Array.prototype.forEach.call(els.pieces.querySelectorAll(".piece"), function (row) {
      var p = {};
      Array.prototype.forEach.call(row.querySelectorAll("[data-key]"), function (el) {
        p[el.getAttribute("data-key")] = el.value;
      });
      out.push(p);
    });
    return out;
  }

  function syncFromForm() {
    state.event = collectEvent();
    state.pieces = collectPieces();
  }

  function addPiece() {
    syncFromForm();
    state.pieces.push(emptyPiece());
    renderPieces();
  }

  function removePiece(i) {
    syncFromForm();
    state.pieces.splice(i, 1);
    if (!state.pieces.length) state.pieces.push(emptyPiece());
    renderPieces();
  }

  function movePiece(i, dir) {
    syncFromForm();
    var j = i + dir;
    if (j < 0 || j >= state.pieces.length) return;
    var tmp = state.pieces[i];
    state.pieces[i] = state.pieces[j];
    state.pieces[j] = tmp;
    renderPieces();
  }

  function save() {
    syncFromForm();
    var payload = { event: state.event, pieces: state.pieces };
    if (state.id) payload.event.concert_id = state.id;
    setStatus("Saving\u2026");
    els.saveBtn.disabled = true;
    fetch("/api/admin/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (res) {
        if (!res.ok) throw new Error(res.d.error || "save failed");
        state.id = res.d.concert_id;
        return fetch("/api/dataset", { cache: "no-store" });
      })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        state.events = d.concerts.slice();
        state.programmes = d.programmes.slice();
        selectEvent(state.id);
        setStatus("Saved.");
      })
      .catch(function (e) { setStatus("Error: " + e.message, true); })
      .then(function () { els.saveBtn.disabled = false; });
  }

  function remove() {
    if (!state.id) return;
    if (!confirm("Delete event #" + state.id + " and all its pieces?")) return;
    setStatus("Deleting\u2026");
    fetch("/api/admin/event?id=" + encodeURIComponent(state.id), { method: "DELETE" })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (res) {
        if (!res.ok || !res.d.ok) throw new Error(res.d.error || "delete failed");
        state.id = null;
        state.event = { event_type: "Concert" };
        state.pieces = [emptyPiece()];
        return fetch("/api/dataset", { cache: "no-store" });
      })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        state.events = d.concerts.slice();
        state.programmes = d.programmes.slice();
        renderList();
        renderForm();
        setStatus("Deleted.");
      })
      .catch(function (e) { setStatus("Error: " + e.message, true); });
  }

  document.addEventListener("DOMContentLoaded", function () {
    els = {
      eventList: $("eventList"),
      eventFields: $("eventFields"),
      pieces: $("pieces"),
      editorTitle: $("editorTitle"),
      status: $("status"),
      saveBtn: $("saveBtn"),
      deleteBtn: $("deleteBtn")
    };

    $("newBtn").addEventListener("click", newEvent);
    $("addPiece").addEventListener("click", addPiece);
    els.saveBtn.addEventListener("click", save);
    els.deleteBtn.addEventListener("click", remove);

    els.eventList.addEventListener("click", function (e) {
      var li = e.target.closest ? e.target.closest("li[data-id]") : null;
      if (li) selectEvent(li.getAttribute("data-id"));
    });

    els.pieces.addEventListener("click", function (e) {
      var btn = e.target.closest ? e.target.closest("button") : null;
      if (!btn) return;
      var row = btn.closest(".piece");
      if (!row) return;
      var i = parseInt(row.getAttribute("data-index"), 10);
      if (btn.hasAttribute("data-remove")) removePiece(i);
      else if (btn.hasAttribute("data-move")) movePiece(i, parseInt(btn.getAttribute("data-move"), 10));
    });

    document.addEventListener("keydown", function (e) {
      if ((e.ctrlKey || e.metaKey) && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        save();
      }
    });

    load();
  });
})();
