/* =====================================================================
   markdown.js — tiny, dependency-free Markdown renderer (safe subset).
   Raw HTML is escaped; links are limited to http(s), mailto and /paths.
   Exposed as window.ConcertMarkdown.
   ===================================================================== */
window.ConcertMarkdown = (function () {
  "use strict";

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function inline(text) {
    var s = esc(text);
    var codes = [];
    s = s.replace(/`([^`]+)`/g, function (_, code) {
      codes.push(code);
      return "\u0000" + (codes.length - 1) + "\u0000";
    });
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (_, label, url) {
      if (!/^(https?:\/\/|mailto:|\/)/i.test(url)) return label;
      return '<a href="' + url.replace(/"/g, "&quot;") + '" target="_blank" rel="noopener noreferrer">' + label + "</a>";
    });
    s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/__([^_]+)__/g, "<strong>$1</strong>");
    s = s.replace(/(^|[^\w])\*([^*\n]+)\*(?=$|[^\w])/g, "$1<em>$2</em>");
    s = s.replace(/(^|[^\w])_([^_\n]+)_(?=$|[^\w])/g, "$1<em>$2</em>");
    s = s.replace(/~~([^~]+)~~/g, "<del>$1</del>");
    s = s.replace(/\u0000(\d+)\u0000/g, function (_, i) {
      return "<code>" + codes[+i] + "</code>";
    });
    return s;
  }

  // Each non-block line is its own paragraph (matches the log's old review
  // layout). Blank lines separate blocks. Lists/quotes/code keep their lines.
  function render(src) {
    var text = String(src == null ? "" : src).replace(/\r\n?/g, "\n").trim();
    if (!text) return "";
    var lines = text.split("\n");
    var out = [];
    var i = 0;

    while (i < lines.length) {
      var line = lines[i];

      var fence = line.match(/^```\s*([\w-]*)\s*$/);
      if (fence) {
        var lang = fence[1];
        var code = [];
        i++;
        while (i < lines.length && !/^```\s*$/.test(lines[i])) { code.push(lines[i]); i++; }
        if (i < lines.length) i++;
        out.push("<pre><code" + (lang ? ' class="language-' + esc(lang) + '"' : "") + ">" + esc(code.join("\n")) + "</code></pre>");
        continue;
      }

      if (/^\s*$/.test(line)) { i++; continue; }

      var h = line.match(/^(#{1,6})\s+(.*)$/);
      if (h) {
        var level = h[1].length;
        out.push("<h" + level + ">" + inline(h[2]) + "</h" + level + ">");
        i++;
        continue;
      }

      if (/^\s*([-*_])\s*(?:\1\s*){2,}$/.test(line)) { out.push("<hr>"); i++; continue; }

      if (/^\s*>\s?/.test(line)) {
        var quote = [];
        while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
          quote.push(lines[i].replace(/^\s*>\s?/, ""));
          i++;
        }
        out.push("<blockquote>" + render(quote.join("\n")) + "</blockquote>");
        continue;
      }

      var ul = /^\s*[-*+]\s+/.test(line);
      var ol = /^\s*\d+[.)]\s+/.test(line);
      if (ul || ol) {
        var re = ol ? /^\s*\d+[.)]\s+(.*)$/ : /^\s*[-*+]\s+(.*)$/;
        var items = [];
        while (i < lines.length) {
          var m = lines[i].match(re);
          if (!m) break;
          items.push("<li>" + inline(m[1]) + "</li>");
          i++;
        }
        out.push((ol ? "<ol>" : "<ul>") + items.join("") + (ol ? "</ol>" : "</ul>"));
        continue;
      }

      out.push("<p>" + inline(line) + "</p>");
      i++;
    }

    return out.join("");
  }

  return { render: render, esc: esc };
})();
