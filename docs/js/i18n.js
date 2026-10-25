/* =====================================================================
   i18n.js — EN / 中文 UI strings
   Only the interface is translated; data (composers, works, venues,
   conductors, notes) stays exactly as recorded in the CSVs.
   ===================================================================== */
window.ConcertI18n = (function () {
  "use strict";

  var DICT = {
    en: {
      "app.title": "Concert Record",
      "theme.label": "Theme",
      "lang.label": "Language",
      "btn.reload": "Reload data",
      "title.reload": "Re-fetch the dataset",
      "title.includeOpera": "Include opera works in this calculation",
      "title.encores": "Show or hide encore pieces",
      "sub.loading": "Loading data\u2026",
      "unit.events": "events",
      "unit.pieces": "pieces",

      "chart.composers": "Most-Heard Composers",
      "chart.conductors": "Concerts by Conductor",
      "chart.periodRating": "Average Rating by Period",
      "chart.period": "Pieces by Period",
      "chart.composerRating": "Average Rating by Composer",
      "chart.ratings": "Ratings",
      "chart.venues": "Venues",
      "chart.repeated": "Repeated Works",
      "chart.allPieces": "All Pieces",
      "chart.noData": "No data.",
      "repeat.empty": "No work heard more than once yet.",

      "stat.events": "Events",
      "stat.pieces": "Pieces heard",
      "stat.avgRating": "Avg rating",
      "stat.composers": "Composers",
      "stat.works": "Unique works",
      "stat.orchestras": "Orchestras",
      "stat.years": "Years",

      "filter.all": "All",
      "filter.concerts": "Concerts",
      "filter.operas": "Operas",
      "filter.ballets": "Ballets",

      "badge.opera": "Opera",
      "badge.ballet": "Ballet",
      "badge.encore": "Encore",

      "toggle.includeOpera": "Include opera",
      "toggle.encores": "Encores",

      "th.date": "Date",
      "th.composer": "Composer",
      "th.work": "Work",
      "th.opus": "Opus",
      "th.period": "Period",
      "th.conductor": "Conductor",
      "th.soloists": "Soloists",
      "th.orchestra": "Orchestra",
      "th.rating": "Rating",

      "search.placeholder": "Filter by composer, work, conductor, orchestra, period\u2026",
      "sort.hint": "Click <b>Date</b>, <b>Composer</b> or <b>Rating</b> to sort",

      "period.Classical": "Classical",
      "period.Romantic": "Romantic",
      "period.Post-Romantic": "Post-Romantic",
      "period.20th Century": "20th Century",
      "period.Contemporary": "Contemporary",

      "footer.source": "Source",
      "overlay.title": "Couldn\u2019t load the concert data",
      "overlay.msg": "The dataset could not be fetched.",
      "overlay.retry": "Retry",
      "overlay.hint": "Start the backend with <code>node server.js</code> (or <code>serve.cmd</code>) and open the URL it prints (usually <code>http://localhost:3000</code>).",
      "error.noData": "No data loaded.",
      "error.fetch": "The dataset could not be fetched"
    },
    zh: {
      "app.title": "观演记录",
      "theme.label": "主题",
      "lang.label": "语言",
      "btn.reload": "重新加载",
      "title.reload": "重新获取数据",
      "title.includeOpera": "把歌剧作品计入统计",
      "title.encores": "显示/隐藏加演曲目",
      "sub.loading": "正在加载\u2026",
      "unit.events": "场",
      "unit.pieces": "首",

      "chart.composers": "最常听的作曲家",
      "chart.conductors": "各指挥场次",
      "chart.periodRating": "各时期平均评分",
      "chart.period": "各时期曲目数",
      "chart.composerRating": "各作曲家平均评分",
      "chart.ratings": "评分分布",
      "chart.venues": "场馆",
      "chart.repeated": "重复听过的作品",
      "chart.allPieces": "全部曲目",
      "chart.noData": "暂无数据。",
      "repeat.empty": "还没有重复听过的作品。",

      "stat.events": "场次",
      "stat.pieces": "曲目数",
      "stat.avgRating": "平均评分",
      "stat.composers": "作曲家",
      "stat.works": "作品数",
      "stat.orchestras": "乐团",
      "stat.years": "年份",

      "filter.all": "全部",
      "filter.concerts": "音乐会",
      "filter.operas": "歌剧",
      "filter.ballets": "芭蕾",

      "badge.opera": "歌剧",
      "badge.ballet": "芭蕾",
      "badge.encore": "加演",

      "toggle.includeOpera": "含歌剧",
      "toggle.encores": "加演",

      "th.date": "日期",
      "th.composer": "作曲家",
      "th.work": "作品",
      "th.opus": "作品号",
      "th.period": "时期",
      "th.conductor": "指挥",
      "th.soloists": "独奏/独唱",
      "th.orchestra": "乐团",
      "th.rating": "评分",

      "search.placeholder": "按作曲家、作品、指挥、乐团、时期筛选\u2026",
      "sort.hint": "点击 <b>日期</b>、<b>作曲家</b> 或 <b>评分</b> 排序",

      "period.Classical": "古典",
      "period.Romantic": "浪漫",
      "period.Post-Romantic": "后浪漫",
      "period.20th Century": "20世纪",
      "period.Contemporary": "当代",

      "footer.source": "数据来源",
      "overlay.title": "无法加载演出数据",
      "overlay.msg": "数据集获取失败。",
      "overlay.retry": "重试",
      "overlay.hint": "运行 <code>node server.js</code>（或 <code>serve.cmd</code>），打开它打印的地址（通常是 <code>http://localhost:3000</code>）。",
      "error.noData": "未加载数据。",
      "error.fetch": "数据集获取失败"
    }
  };

  var lang = "en";

  function setLang(l) {
    lang = DICT[l] ? l : "en";
    document.documentElement.setAttribute("lang", lang === "zh" ? "zh-Hant" : "en");
  }

  function getLang() { return lang; }

  function t(key) {
    var v = (DICT[lang] && DICT[lang][key]);
    if (v == null) v = DICT.en[key];
    return v == null ? key : v;
  }

  function each(sel, fn) {
    Array.prototype.forEach.call(document.querySelectorAll(sel), fn);
  }

  // Apply translations to static markup.
  function applyStatic() {
    document.documentElement.setAttribute("lang", lang === "zh" ? "zh-Hant" : "en");
    document.title = t("app.title");
    each("[data-i18n]", function (el) { el.textContent = t(el.getAttribute("data-i18n")); });
    each("[data-i18n-html]", function (el) { el.innerHTML = t(el.getAttribute("data-i18n-html")); });
    each("[data-i18n-placeholder]", function (el) { el.setAttribute("placeholder", t(el.getAttribute("data-i18n-placeholder"))); });
    each("[data-i18n-title]", function (el) { el.setAttribute("title", t(el.getAttribute("data-i18n-title"))); });
  }

  return { setLang: setLang, getLang: getLang, t: t, applyStatic: applyStatic };
})();
