/* Кабинет товароведа — workflow DEMO: tabs / expand / toast / filters */
(function () {
  "use strict";

  var root = document.getElementById("mwd-root");
  if (!root) return;

  var STORAGE_KEY = "mwd_workflow_demo_state_v1";
  var VALID_SCREENS = ["sales", "assembly", "purchase", "passport", "problems"];
  var VALID_SUBS = ["vedomost", "pass", "cards", "archive"];
  var VALID_PASS_MODES = ["new", "edit"];

  // Моки паспорта по артикулу 1С (демо). Полный — «мочалка овал».
  // weight — кг; pack_* — см / гр; volume считается из pack_len×wid×hei / 1000.
  var PASSPORT_MOCKS = {
    "401084": {
      art: "401084",
      name: "Мочалка овал",
      brand: "HomeClean",
      tnved: "9603901000",
      honest: "нет",
      honest_category: "",
      supplier_art: "HC-MOCH-OVAL-01",
      country: "Китай",
      len: "12",
      wid: "9",
      hei: "4",
      weight: "0,045",
      pack_len: "13",
      pack_wid: "10",
      pack_hei: "4,5",
      pack_weight: "52",
      volume: "0,59",
      pack_qty: "50",
      nds: "22",
      docs: { cert: "нет", decl: "есть", refusal: "запрос" },
      utp: "Овальная форма лучше держит пену и дольше служит, чем плоская мочалка.",
      pros:
        "• Плотное плетение — не расползается после стирок\n• Овал удобно лежит в руке\n• Быстро сохнет, меньше запаха\n• Нейтральный цвет под любой интерьер",
      focus: "На карточках акцент на «овал + пена». Сравнить с 401080 (прямоугольная).",
      photos: ["фото 1 · лицо", "фото 2 · в руке", "фото 3 · макро"],
      video: "ролик 12 сек · пена",
      pack_photo: "пакет + линейка 13×10",
      cost: "18,50",
      logistics: "36",
    },
  };

  function emptyPassport() {
    return {
      art: "",
      name: "",
      brand: "",
      tnved: "",
      honest: "нет",
      honest_category: "",
      supplier_art: "",
      country: "",
      len: "",
      wid: "",
      hei: "",
      weight: "",
      pack_len: "",
      pack_wid: "",
      pack_hei: "",
      pack_weight: "",
      volume: "",
      pack_qty: "",
      nds: "",
      short_base: "",
      docs: { cert: "нет", decl: "нет", refusal: "нет" },
      utp: "",
      pros: "",
      focus: "",
      photos: ["фото 1", "фото 2", "фото 3"],
      video: "видео · плейсхолдер",
      pack_photo: "упаковка · плейсхолдер",
      cost: "",
      logistics: "",
    };
  }

  function stubPassport(art, name) {
    var base = emptyPassport();
    base.art = art || "";
    base.name = name || "";
    base.brand = "—";
    base.tnved = "—";
    base.honest = "нет";
    base.supplier_art = "SUP-" + (art || "???");
    base.country = "—";
    base.len = "10";
    base.wid = "8";
    base.hei = "5";
    base.weight = "0,1";
    base.pack_len = "12";
    base.pack_wid = "10";
    base.pack_hei = "6";
    base.pack_weight = "120";
    base.volume = "0,72";
    base.pack_qty = "20";
    base.nds = "other";
    base.docs = { cert: "запрос", decl: "нет", refusal: "нет" };
    base.utp = "Демо-УТП для «" + (name || art) + "».";
    base.pros = "• Мок-преимущество 1\n• Мок-преимущество 2";
    base.focus = "Заполнить паспорт из 1С / матрицы (демо).";
    base.photos = ["фото 1 · мок", "фото 2 · мок", "фото 3 · мок"];
    base.video = "нет видео";
    base.pack_photo = "нет фото упаковки";
    base.cost = "—";
    base.logistics = "36";
    return base;
  }

  function parseNum(v) {
    if (v == null || v === "") return NaN;
    var s = String(v).replace(/\s+/g, "").replace(",", ".");
    return parseFloat(s);
  }

  function formatVol(n) {
    if (!isFinite(n) || n <= 0) return "";
    return n.toFixed(2).replace(".", ",");
  }

  function isHonestOn(val) {
    var s = String(val || "")
      .trim()
      .toLowerCase();
    if (!s || s === "нет" || s.indexOf("не маркир") >= 0 || s === "false" || s === "0") {
      return false;
    }
    return true;
  }

  // НДС в select: 22 | other | none (старые моки «20» / «0» нормализуем)
  function normalizeNds(val) {
    var s = String(val == null ? "" : val)
      .trim()
      .toLowerCase()
      .replace(",", ".")
      .replace(/\s*%\s*$/, "");
    if (!s) return "";
    if (s === "22" || s === "22.0") return "22";
    if (
      s === "none" ||
      s === "без" ||
      s === "без ндс" ||
      s === "0" ||
      s === "0.0"
    ) {
      return "none";
    }
    if (s === "other" || s === "другой") return "other";
    var n = parseFloat(s);
    if (isFinite(n) && n === 22) return "22";
    if (isFinite(n) && n === 0) return "none";
    if (isFinite(n)) return "other";
    return "other";
  }

  function isMediaFilled(label) {
    var s = String(label || "").trim().toLowerCase();
    if (!s) return false;
    if (s.indexOf("плейсхолдер") >= 0) return false;
    if (s.indexOf("нет ") === 0 || s === "нет") return false;
    if (s.indexOf("пусто") >= 0) return false;
    // пустые демо-плейсхолдеры вида «фото 1», «фото 2»
    if (/^фото\s*\d+$/i.test(s)) return false;
    return true;
  }

  function passportFor(art, name) {
    if (PASSPORT_MOCKS[art]) return PASSPORT_MOCKS[art];
    if (art) return stubPassport(art, name);
    return emptyPassport();
  }

  function loadState() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      var parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (e) {
      return {};
    }
  }

  function saveState(patch) {
    try {
      var cur = loadState();
      Object.keys(patch).forEach(function (k) {
        cur[k] = patch[k];
      });
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cur));
    } catch (e) {}
  }

  var saved = loadState();

  var toastEl = document.getElementById("mwd-toast");
  var toastTimer = null;

  function showToast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg || "демо";
    toastEl.hidden = false;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.hidden = true;
    }, 1600);
  }

  // ── Scrollable areas (сохраняем при уходе со страницы) ──
  function collectScrolls() {
    var out = {};
    root.querySelectorAll(".mwd-sa-wrap, .mwd-table-wrap").forEach(function (el, i) {
      var id = el.id || "wrap-" + i;
      out[id] = { left: el.scrollLeft || 0, top: el.scrollTop || 0 };
    });
    out.__window = { left: window.scrollX || 0, top: window.scrollY || 0 };
    return out;
  }

  function restoreScrolls(map) {
    if (!map || typeof map !== "object") return;
    root.querySelectorAll(".mwd-sa-wrap, .mwd-table-wrap").forEach(function (el, i) {
      var id = el.id || "wrap-" + i;
      var pos = map[id];
      if (!pos) return;
      el.scrollLeft = pos.left || 0;
      el.scrollTop = pos.top || 0;
    });
    var win = map.__window;
    if (win) {
      window.scrollTo(win.left || 0, win.top || 0);
    }
  }

  function persistScrollsSoon() {
    window.requestAnimationFrame(function () {
      saveState({ scrolls: collectScrolls() });
    });
  }

  root.querySelectorAll(".mwd-sa-wrap, .mwd-table-wrap").forEach(function (el) {
    el.addEventListener(
      "scroll",
      function () {
        persistScrollsSoon();
      },
      { passive: true }
    );
  });
  window.addEventListener(
    "scroll",
    function () {
      persistScrollsSoon();
    },
    { passive: true }
  );

  // ── Screen navigation ──
  var navItems = root.querySelectorAll(".mwd-nav-item");
  var screens = root.querySelectorAll(".mwd-screen");

  function activateScreen(key, opts) {
    opts = opts || {};
    if (VALID_SCREENS.indexOf(key) < 0) key = "sales";
    navItems.forEach(function (btn) {
      btn.classList.toggle("is-active", btn.getAttribute("data-screen") === key);
    });
    screens.forEach(function (panel) {
      panel.classList.toggle(
        "is-active",
        panel.getAttribute("data-screen-panel") === key
      );
    });
    if (!opts.skipSave) {
      saveState({ screen: key, scrolls: collectScrolls() });
    }
    if (!opts.skipHash && window.history && window.history.replaceState) {
      try {
        window.history.replaceState(null, "", "#" + key);
      } catch (e) {}
    }
  }

  navItems.forEach(function (btn) {
    btn.addEventListener("click", function () {
      activateScreen(btn.getAttribute("data-screen"));
    });
  });

  // ── Expandable vedomost rows ──
  function setExpandOpen(row, open) {
    var id = row.getAttribute("data-expand");
    var detail = root.querySelector('.mwd-detail[data-detail="' + id + '"]');
    row.classList.toggle("is-open", open);
    var exp = row.querySelector(".mwd-exp");
    if (exp) exp.textContent = open ? "▾" : "▸";
    if (detail) detail.classList.toggle("mwd-collapsed", !open);
  }

  function collectOpenExpands() {
    return Array.prototype.map.call(
      root.querySelectorAll(".mwd-expandable.is-open"),
      function (row) {
        return row.getAttribute("data-expand");
      }
    ).filter(Boolean);
  }

  root.querySelectorAll(".mwd-expandable").forEach(function (row) {
    row.addEventListener("click", function (e) {
      if (e.target.closest("button, a, input, select, textarea, label")) return;
      var open = !row.classList.contains("is-open");
      setExpandOpen(row, open);
      saveState({ expands: collectOpenExpands() });
    });
  });

  if (Array.isArray(saved.expands)) {
    saved.expands.forEach(function (id) {
      var row = root.querySelector('.mwd-expandable[data-expand="' + id + '"]');
      if (row) setExpandOpen(row, true);
    });
  }

  // ── Demo toast buttons ──
  root.querySelectorAll("[data-demo-toast]").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (btn.disabled) return;
      showToast("демо");
    });
  });

  // ── Комплект / комплектующая по названию 1С (без поля «донор») ──
  // Как в marketplaces/nomenclature_assembly.py:
  // «набор»/«комплект»/«сборка»/«в сборе», «А + Б», скобки (920099/921321).
  var KIT_WORD_RE = /(?<!\w)(?:набор|комплект|сборк\w*|в\s+сборе)(?!\w)/i;
  var PLUS_PAIR_RE = /[А-Яа-яA-Za-z]{3,}\s*\+\s*[А-Яа-яA-Za-z]{3,}/;
  var CODE_LIST_PAREN_RE = /\(([^)]*\d{4,6}[^)]*)\)/g;
  var CODE_RE = /(?<![A-Za-z0-9])(\d{4,6})(?!\d)/g;
  var CODE_LIST_SHAPE_RE = /\d{4,6}\s*[+/]\s*(?:\d{4,6}|[A-Za-z]\d{3,})/;

  function normArticle(value) {
    var raw = String(value || "").trim();
    if (!raw) return "";
    if (/^\d+$/.test(raw)) return String(parseInt(raw, 10));
    return raw;
  }

  function codesFromParenBody(body) {
    var out = [];
    var seen = {};
    var m;
    var re = new RegExp(CODE_RE.source, "g");
    while ((m = re.exec(body || ""))) {
      var c = normArticle(m[1]);
      if (c && !seen[c]) {
        seen[c] = true;
        out.push(c);
      }
    }
    return out;
  }

  function extractRelatedCodes(name, selfArticle) {
    var selfNorm = normArticle(selfArticle);
    var related = [];
    var seen = {};
    var m;
    var re = new RegExp(CODE_LIST_PAREN_RE.source, "g");
    while ((m = re.exec(name || ""))) {
      var body = m[1] || "";
      if (/\bуп\.?\s*\d/i.test(body) && !CODE_LIST_SHAPE_RE.test(body)) continue;
      codesFromParenBody(body).forEach(function (c) {
        if (selfNorm && c === selfNorm) return;
        if (!seen[c]) {
          seen[c] = true;
          related.push(c);
        }
      });
    }
    return related;
  }

  function parseNomenclatureAssembly(name, article) {
    var text = String(name || "").trim();
    var art = normArticle(article);
    var markers = [];
    var related = extractRelatedCodes(text, art);
    if (KIT_WORD_RE.test(text)) markers.push("kit_word");
    if (PLUS_PAIR_RE.test(text)) markers.push("plus_pair");
    var parenRe = new RegExp(CODE_LIST_PAREN_RE.source, "g");
    var pm;
    while ((pm = parenRe.exec(text))) {
      if (CODE_LIST_SHAPE_RE.test(pm[1] || "")) {
        markers.push("code_list_paren");
        break;
      }
    }
    if (related.length >= 2) markers.push("multi_codes");
    else if (related.length === 1) markers.push("single_other_code");
    var isKit =
      markers.indexOf("kit_word") >= 0 ||
      markers.indexOf("plus_pair") >= 0 ||
      markers.indexOf("multi_codes") >= 0 ||
      markers.indexOf("code_list_paren") >= 0;
    return {
      role: isKit ? "kit" : "plain",
      related: related,
      markers: markers,
      usedIn: [],
    };
  }

  function linkAssemblyRoles(items) {
    // items: [{article, name, row?}, ...]
    var drafts = {};
    var order = [];
    items.forEach(function (it) {
      var art = normArticle(it.article);
      if (!art) return;
      var info = parseNomenclatureAssembly(it.name, art);
      if (!drafts[art]) {
        order.push(art);
        drafts[art] = {
          article: art,
          name: it.name || "",
          role: "plain",
          related: [],
          markers: [],
          usedIn: [],
          rows: [],
        };
      }
      var d = drafts[art];
      if (it.name) d.name = it.name;
      if (info.role === "kit") d.role = "kit";
      info.related.forEach(function (c) {
        if (d.related.indexOf(c) < 0) d.related.push(c);
      });
      info.markers.forEach(function (m) {
        if (d.markers.indexOf(m) < 0) d.markers.push(m);
      });
      if (it.row) d.rows.push(it.row);
    });

    Object.keys(drafts).forEach(function (art) {
      var d = drafts[art];
      if (d.role !== "kit") return;
      d.related.forEach(function (code) {
        if (code === art) return;
        if (!drafts[code]) {
          order.push(code);
          drafts[code] = {
            article: code,
            name: "",
            role: "component",
            related: [],
            markers: ["from_kit_ref"],
            usedIn: [],
            rows: [],
          };
        }
        var target = drafts[code];
        if (target.usedIn.indexOf(art) < 0) target.usedIn.push(art);
        if (target.role === "plain") {
          target.role = "component";
          if (target.markers.indexOf("from_kit_ref") < 0) {
            target.markers.push("from_kit_ref");
          }
        }
      });
    });

    return drafts;
  }

  function collectDemoNomenclatureItems() {
    var items = [];
    var salesTable = document.getElementById("mwd-sales-table");
    if (salesTable) {
      salesTable.querySelectorAll("tbody tr.mwd-sa-row").forEach(function (row) {
        var art =
          row.getAttribute("data-art") ||
          ((row.querySelector(".mwd-sa-art") || {}).textContent || "");
        var name = ((row.querySelector(".mwd-sa-name") || {}).textContent || "")
          .replace(/\s*·\s*донор\s*$/i, "")
          .replace(/\s*·\s*комплект\s*$/i, "")
          .replace(/\s*·\s*комплектующая\s*$/i, "")
          .trim();
        items.push({ article: art, name: name, row: row });
      });
    }
    if (asmTable) {
      asmMainRows().forEach(function (row) {
        var art =
          row.getAttribute("data-art") ||
          ((row.querySelector(".mwd-art") || {}).textContent || "");
        var name = ((row.querySelector(".mwd-asm-name") || {}).textContent || "").trim();
        items.push({ article: art, name: name, row: row });
      });
    }
    var purTable = document.getElementById("mwd-purchase-table");
    if (purTable) {
      purTable.querySelectorAll("tbody tr.mwd-pur-row").forEach(function (row) {
        var art =
          row.getAttribute("data-art") ||
          ((row.querySelector(".mwd-art") || {}).textContent || "");
        var name = ((row.querySelector(".mwd-pur-name") || {}).textContent || "").trim();
        items.push({ article: art, name: name, row: row });
      });
    }
    return items;
  }

  function makeAsmLinkIcon() {
    // Иконка «связь» (два звена цепи) — товар входит в сборки.
    var ns = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(ns, "svg");
    svg.setAttribute("class", "mwd-sa-link-ico");
    svg.setAttribute("viewBox", "0 0 16 16");
    svg.setAttribute("width", "12");
    svg.setAttribute("height", "12");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    var p1 = document.createElementNS(ns, "path");
    p1.setAttribute(
      "d",
      "M6.5 9.5a2.75 2.75 0 0 0 3.9 0l1.6-1.6a2.75 2.75 0 1 0-3.9-3.9L7.3 4.8"
    );
    p1.setAttribute("fill", "none");
    p1.setAttribute("stroke", "currentColor");
    p1.setAttribute("stroke-width", "1.6");
    p1.setAttribute("stroke-linecap", "round");
    p1.setAttribute("stroke-linejoin", "round");
    var p2 = document.createElementNS(ns, "path");
    p2.setAttribute(
      "d",
      "M9.5 6.5a2.75 2.75 0 0 0-3.9 0L4 8.1a2.75 2.75 0 1 0 3.9 3.9l.8-.8"
    );
    p2.setAttribute("fill", "none");
    p2.setAttribute("stroke", "currentColor");
    p2.setAttribute("stroke-width", "1.6");
    p2.setAttribute("stroke-linecap", "round");
    p2.setAttribute("stroke-linejoin", "round");
    svg.appendChild(p1);
    svg.appendChild(p2);
    return svg;
  }

  function attachAssemblyClickUi(row, nameCell, d) {
    if (!nameCell) return;
    var old = nameCell.querySelector(".mwd-sa-role-tag");
    if (old) old.remove();
    row.classList.remove("mwd-sa-asm-clickable");
    if (d.role !== "kit" && d.role !== "component") return;
    row.classList.add("mwd-sa-asm-clickable");
    if (d.role === "component") {
      var tag = document.createElement("span");
      tag.className = "mwd-sa-role-tag mwd-sa-role-link";
      tag.setAttribute(
        "aria-label",
        d.usedIn.length
          ? "Связь со сборками: " + d.usedIn.join(", ")
          : "Входит в сборку"
      );
      tag.title =
        d.usedIn.length
          ? "Входит в сборки: " +
            d.usedIn.join(", ") +
            " · клик — показать все"
          : "Входит в сборку · клик — показать связанные";
      tag.appendChild(document.createTextNode(" "));
      tag.appendChild(makeAsmLinkIcon());
      nameCell.appendChild(tag);
    }
    if (d.role === "kit") {
      row.setAttribute(
        "title",
        d.related.length
          ? "Комплект. Состав: " +
            d.related.join(", ") +
            ". Клик — фильтр по составу"
          : "Комплект по названию"
      );
    } else {
      row.setAttribute(
        "title",
        d.usedIn.length
          ? "Связь со сборками: " +
            d.usedIn.join(", ") +
            ". Клик — показать все"
          : "Входит в сборку"
      );
    }
  }

  function applyNomenclatureAssemblyMarks() {
    var drafts = linkAssemblyRoles(collectDemoNomenclatureItems());
    Object.keys(drafts).forEach(function (art) {
      var d = drafts[art];
      d.rows.forEach(function (row) {
        row.setAttribute("data-kind", d.role === "component" ? "donor" : d.role);
        row.setAttribute("data-related", d.related.join(","));
        row.setAttribute("data-used-in", d.usedIn.join(","));
        if (row.classList.contains("mwd-sa-row")) {
          attachAssemblyClickUi(row, row.querySelector(".mwd-sa-name"), d);
        }
        if (row.classList.contains("mwd-pur-row")) {
          attachAssemblyClickUi(row, row.querySelector(".mwd-pur-name"), d);
        }
        if (row.classList.contains("mwd-asm-row")) {
          attachAssemblyClickUi(row, row.querySelector(".mwd-asm-name"), d);
          // Статус ≠ тип: тип в data-kind (kit/donor), статус — только
          // остаток/работа: assembly | deficit | ok. Не пишем status=donor.
          if (d.role === "component" && row.getAttribute("data-status") === "donor") {
            var fixed =
              row.getAttribute("data-deficit") === "1" ? "deficit" : "ok";
            row.setAttribute("data-status", fixed);
            var stFix = row.querySelector(".mwd-st");
            if (stFix) {
              stFix.className =
                "mwd-st " + (fixed === "deficit" ? "mwd-st-deficit" : "mwd-st-ok");
              stFix.textContent = fixed === "deficit" ? "дефицит" : "ок";
            }
          }
        }
      });
    });
  }

  // ── Сборка и остаток: фильтры + KPI/итоги по видимым строкам ──
  var asmTable = document.getElementById("mwd-asm-table");
  var asmStatus = document.getElementById("mwd-asm-status");
  var asmMode = document.getElementById("mwd-asm-mode");
  var asmSearch = document.getElementById("mwd-asm-search");
  var asmLinkFilterEl = document.getElementById("mwd-asm-link-filter");
  var asmLinkFilterTitle = document.getElementById("mwd-asm-link-filter-title");
  var asmLinkFilterText = document.getElementById("mwd-asm-link-filter-text");
  var asmLinkFilterClear = document.getElementById("mwd-asm-link-filter-clear");
  var ASM_STATUSES = ["assembly", "deficit", "ok"];
  var ASM_MODES = ["kit", "donor"];
  // { focusArt, arts: string[], mode: "component"|"kit" } | null
  var asmLinkFilter = null;

  function formatRuInt(n) {
    var s = String(Math.round(n || 0));
    return s.replace(/\B(?=(\d{3})+(?!\d))/g, "\u202f");
  }

  function asmMainRows() {
    if (!asmTable) return [];
    return Array.prototype.slice.call(asmTable.querySelectorAll("tbody tr.mwd-asm-row"));
  }

  function asmRowArt(row) {
    if (!row) return "";
    return normArticle(
      row.getAttribute("data-art") ||
        ((row.querySelector(".mwd-art") || {}).textContent || "")
    );
  }

  function asmRowName(row) {
    if (!row) return "";
    var el = row.querySelector(".mwd-asm-name");
    return ((el && el.textContent) || "").trim();
  }

  function shortAsmName(name) {
    var s = String(name || "").trim();
    s = s.replace(/\s*\([^)]*\)\s*(С-Р)?\s*$/i, "").trim();
    if (s.length > 42) s = s.slice(0, 40) + "…";
    return s || "—";
  }

  function clearAsmLinkFilter(opts) {
    opts = opts || {};
    asmLinkFilter = null;
    if (asmLinkFilterEl) asmLinkFilterEl.hidden = true;
    if (asmLinkFilterText) asmLinkFilterText.textContent = "";
    asmMainRows().forEach(function (row) {
      row.classList.remove("is-asm-focus", "is-asm-related");
    });
    if (!opts.skipApply) applyAsmFilters(opts);
  }

  function buildAsmLinkFilterBanner(focusArt, relatedArts, mode) {
    var focusRow = null;
    asmMainRows().forEach(function (row) {
      if (asmRowArt(row) === focusArt) focusRow = row;
    });
    var focusName = shortAsmName(asmRowName(focusRow));
    if (mode === "component") {
      var needQty = focusRow
        ? parseFloat(focusRow.getAttribute("data-in-asm")) || 0
        : 0;
      var parts = [];
      relatedArts.forEach(function (art) {
        if (art === focusArt) return;
        var kitRow = null;
        asmMainRows().forEach(function (row) {
          if (asmRowArt(row) === art) kitRow = row;
        });
        if (!kitRow) return;
        var kitIn = parseFloat(kitRow.getAttribute("data-in-asm")) || 0;
        parts.push(
          shortAsmName(asmRowName(kitRow)) + " — " + formatRuInt(kitIn) + " шт"
        );
      });
      return {
        title: "Сборки с этим товаром",
        text:
          focusName +
          (needQty ? " " + formatRuInt(needQty) + " шт" : "") +
          (parts.length ? " = " + parts.join(" + ") : "") ||
          "Показаны комплектующая и связанные сборки",
      };
    }
    var bits = [];
    relatedArts.forEach(function (art) {
      if (art === focusArt) return;
      var partRow = null;
      asmMainRows().forEach(function (row) {
        if (asmRowArt(row) === art) partRow = row;
      });
      if (!partRow) {
        bits.push(art);
        return;
      }
      bits.push(shortAsmName(asmRowName(partRow)) + " (" + art + ")");
    });
    return {
      title: "Состав комплекта",
      text:
        focusName +
        (bits.length ? " → " + bits.join(", ") : " · состав по названию"),
    };
  }

  function setAsmLinkFilterFromRow(row) {
    if (!row) return;
    var art = asmRowArt(row);
    if (!art) return;
    var usedIn = String(row.getAttribute("data-used-in") || "")
      .split(",")
      .map(normArticle)
      .filter(Boolean);
    var related = String(row.getAttribute("data-related") || "")
      .split(",")
      .map(normArticle)
      .filter(Boolean);
    var kind = row.getAttribute("data-kind") || "";
    var mode = "";
    var arts = [art];
    if (kind === "donor" || kind === "component") {
      if (!usedIn.length) {
        showToast("не входит в сборки");
        return;
      }
      mode = "component";
      usedIn.forEach(function (a) {
        if (arts.indexOf(a) < 0) arts.push(a);
      });
    } else if (kind === "kit") {
      if (!related.length) {
        showToast("состав не найден");
        return;
      }
      mode = "kit";
      related.forEach(function (a) {
        if (arts.indexOf(a) < 0) arts.push(a);
      });
    } else {
      showToast("не комплект и не комплектующая");
      return;
    }
    if (
      asmLinkFilter &&
      asmLinkFilter.focusArt === art &&
      asmLinkFilter.mode === mode
    ) {
      clearAsmLinkFilter();
      return;
    }
    // Связанный фильтр показывает и сборки, и детали — сбрасываем тип/статус.
    if (asmStatus) asmStatus.value = "";
    if (asmMode) asmMode.value = "";
    asmLinkFilter = { focusArt: art, arts: arts, mode: mode };
    var banner = buildAsmLinkFilterBanner(art, arts, mode);
    if (asmLinkFilterTitle) asmLinkFilterTitle.textContent = banner.title;
    if (asmLinkFilterText) asmLinkFilterText.textContent = banner.text;
    if (asmLinkFilterEl) asmLinkFilterEl.hidden = false;
    applyAsmFilters();
  }

  function resetAsmFilters(opts) {
    if (asmStatus) asmStatus.value = "";
    if (asmMode) asmMode.value = "";
    if (asmSearch) asmSearch.value = "";
    clearAsmLinkFilter({ skipApply: true });
    applyAsmFilters(opts);
  }

  function applyAsmFilters(opts) {
    opts = opts || {};
    if (!asmTable) return 0;
    var status = asmStatus ? asmStatus.value : "";
    var mode = asmMode ? asmMode.value : "";
    var q = asmSearch ? (asmSearch.value || "").trim().toLowerCase() : "";
    var pos = 0;
    var def = 0;
    var inAsm = 0;
    var stock = 0;
    var money = 0;

    asmMainRows().forEach(function (row) {
      var kind = row.getAttribute("data-kind") || "";
      var rowStatus = row.getAttribute("data-status") || "";
      var artNorm = asmRowArt(row);
      var art = artNorm.toLowerCase();
      var name = asmRowName(row).toLowerCase();
      var okStatus = !status || rowStatus === status;
      var okMode = !mode || kind === mode;
      var okSearch = !q || art.indexOf(q) >= 0 || name.indexOf(q) >= 0;
      var okLink =
        !asmLinkFilter || asmLinkFilter.arts.indexOf(artNorm) >= 0;
      var visible = okStatus && okMode && okSearch && okLink;
      row.classList.toggle("mwd-row-hidden", !visible);
      row.classList.toggle(
        "is-asm-focus",
        !!(asmLinkFilter && asmLinkFilter.focusArt === artNorm)
      );
      row.classList.toggle(
        "is-asm-related",
        !!(
          asmLinkFilter &&
          asmLinkFilter.focusArt !== artNorm &&
          asmLinkFilter.arts.indexOf(artNorm) >= 0
        )
      );
      var expandId = row.getAttribute("data-expand");
      if (expandId) {
        var detail = asmTable.querySelector('.mwd-detail[data-detail="' + expandId + '"]');
        if (detail) detail.classList.toggle("mwd-row-hidden", !visible);
      }
      if (!visible) return;
      pos += 1;
      if (row.getAttribute("data-deficit") === "1") def += 1;
      inAsm += parseFloat(row.getAttribute("data-in-asm")) || 0;
      var st = parseFloat(row.getAttribute("data-stock")) || 0;
      var price = parseFloat(row.getAttribute("data-price")) || 0;
      stock += st;
      money += st * price;
    });

    function setText(id, val) {
      var el = document.getElementById(id);
      if (el) el.textContent = val;
    }
    setText("mwd-asm-kpi-pos", formatRuInt(pos));
    setText("mwd-asm-kpi-def", formatRuInt(def));
    setText("mwd-asm-kpi-stock", formatRuInt(stock));
    setText("mwd-asm-kpi-money", formatRuInt(money));
    setText("mwd-asm-tot-in", formatRuInt(inAsm));
    setText("mwd-asm-tot-stock", formatRuInt(stock));
    setText("mwd-asm-tot-money", formatRuInt(money));

    if (!opts.skipSave) {
      saveState({
        asmStatus: status,
        asmMode: mode,
        asmSearch: asmSearch ? asmSearch.value : "",
      });
    }
    return pos;
  }

  if (asmTable) {
    if (asmStatus && ASM_STATUSES.indexOf(saved.asmStatus) >= 0) {
      asmStatus.value = saved.asmStatus;
    }
    if (asmSearch && typeof saved.asmSearch === "string") asmSearch.value = saved.asmSearch;
    if (asmMode) {
      if (saved.asmMode === "all") asmMode.value = "";
      else if (ASM_MODES.indexOf(saved.asmMode) >= 0) asmMode.value = saved.asmMode;
    }
    if (asmStatus) {
      asmStatus.addEventListener("change", function () {
        applyAsmFilters();
      });
    }
    if (asmMode) {
      asmMode.addEventListener("change", function () {
        applyAsmFilters();
      });
    }
    if (asmSearch) {
      asmSearch.addEventListener("input", function () {
        applyAsmFilters();
      });
    }
    if (asmLinkFilterClear) {
      asmLinkFilterClear.addEventListener("click", function () {
        clearAsmLinkFilter();
      });
    }
    asmTable.addEventListener("click", function (e) {
      var row = e.target.closest("tr.mwd-asm-row");
      if (!row || !row.classList.contains("mwd-sa-asm-clickable")) return;
      setAsmLinkFilterFromRow(row);
    });
    applyNomenclatureAssemblyMarks();
    var visible = applyAsmFilters({ skipSave: true });
    // Сохранённый/подставленный поиск вроде «115001» прячет все моки — на входе сбрасываем.
    if (visible === 0 && asmMainRows().length) {
      resetAsmFilters({ skipSave: false });
    }
    // Автозаполнение браузера может вписать поиск уже после скрипта.
    window.setTimeout(function () {
      if (applyAsmFilters({ skipSave: true }) === 0 && asmMainRows().length) {
        resetAsmFilters({ skipSave: false });
      }
    }, 400);
  }

  // ── Passport subtabs ──
  var subtabs = root.querySelectorAll("#mwd-passport-tabs .mwd-subtab");
  var subpanels = root.querySelectorAll("[data-sub-panel]");
  var passportFilledFromVed = false;
  var currentPassMode = "new";
  var editQueue = [];
  var editQueueIndex = 0;
  var editQueueDrafts = {};
  var lastVedClickIndex = -1;
  var queueDoneToastShown = false;

  function activateSub(key, opts) {
    opts = opts || {};
    if (VALID_SUBS.indexOf(key) < 0) key = "vedomost";
    subtabs.forEach(function (t) {
      t.classList.toggle("is-active", t.getAttribute("data-sub") === key);
    });
    subpanels.forEach(function (p) {
      p.classList.toggle("is-active", p.getAttribute("data-sub-panel") === key);
    });
    if (!opts.skipSave) saveState({ passportSub: key });
  }

  subtabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      var key = tab.getAttribute("data-sub");
      activateSub(key);
      if (key !== "pass") return;
      // Очередь из ведомости уже собрана — не стираем форму
      if (editQueue.length) {
        activatePassMode("edit");
        if (!currentPassArt) {
          showQueueItem(editQueueIndex, { skipSave: true });
        } else {
          renderQueueStrip();
        }
        return;
      }
      fillPassport(emptyPassport(), { context: "manual" });
      activatePassMode("new");
      activatePassTab("main");
    });
  });

  if (saved.passportSub) activateSub(saved.passportSub, { skipSave: true });
  else activateSub("vedomost", { skipSave: true });

  // ── Passport form fill / inner tabs / validation ──
  var passContext = document.getElementById("mwd-pass-context");
  var createArtPreview = document.getElementById("mwd-create-art-preview");
  var createArtSeller = document.getElementById("mwd-create-art-seller");
  var createArtBtn = document.getElementById("mwd-pass-create-art");
  var passReqHint = document.getElementById("mwd-pass-req-hint");
  var honestToggle = document.getElementById("mwd-pass-honest-toggle");
  var honestWrap = document.getElementById("mwd-pass-honest");
  var honestCatWrap = document.getElementById("mwd-pass-honest-cat");
  var honestLabel = root.querySelector("[data-pass-honest-label]");
  var tariffActiveLabel = document.getElementById("mwd-tariff-active-label");
  var currentPassArt = "";
  var passCreateAttempted = false;
  var VALID_PASS_TABS = ["main", "names", "logistics", "content", "media"];

  function resetDocDropzone(kind) {
    var zone = root.querySelector('[data-doc-drop="' + kind + '"]');
    if (zone) {
      zone.classList.remove("is-filled");
      var txt = zone.querySelector(".mwd-dropzone-txt");
      if (txt) txt.textContent = "Перетащите файл или кликните";
    }
    var fileInput = root.querySelector('[data-doc-file="' + kind + '"]');
    if (fileInput) fileInput.value = "";
    var nameEl = root.querySelector('[data-doc-file-name="' + kind + '"]');
    if (nameEl) nameEl.textContent = "";
    var extEl = root.querySelector('[data-doc-file-ext="' + kind + '"]');
    if (extEl) {
      extEl.textContent = "";
      extEl.hidden = true;
    }
  }

  function setDocFileName(kind, name) {
    var nameEl = root.querySelector('[data-doc-file-name="' + kind + '"]');
    var extEl = root.querySelector('[data-doc-file-ext="' + kind + '"]');
    var ico = root.querySelector('[data-doc-file-row="' + kind + '"] .mwd-doc-file-ico');
    var n = name || "документ.pdf";
    var dot = n.lastIndexOf(".");
    var base = n;
    var ext = "";
    if (dot > 0 && dot < n.length - 1) {
      base = n.slice(0, dot);
      ext = n.slice(dot + 1).toUpperCase();
    }
    if (nameEl) nameEl.textContent = base;
    if (extEl) {
      extEl.textContent = ext;
      extEl.hidden = !ext;
    }
    if (ico) {
      var low = n.toLowerCase();
      ico.textContent = /\.(jpg|jpeg|png|tif|tiff|gif|webp)$/.test(low) ? "🖼" : "📄";
    }
  }

  var DOC_WARN_DAYS = 30;

  function formatDocDate(iso) {
    var p = String(iso || "").split("-");
    if (p.length !== 3) return iso || "";
    return p[2] + "." + p[1] + "." + p[0];
  }

  function daysWord(n) {
    var n10 = n % 10;
    var n100 = n % 100;
    if (n10 === 1 && n100 !== 11) return "день";
    if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return "дня";
    return "дней";
  }

  function daysUntilExpiry(iso) {
    var parts = String(iso || "").split("-");
    if (parts.length !== 3) return null;
    var exp = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    if (isNaN(exp.getTime())) return null;
    var now = new Date();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.round((exp.getTime() - today.getTime()) / 86400000);
  }

  function refreshDocTag(kind) {
    var st = root.querySelector('[data-pass-doc-status="' + kind + '"]');
    var block = root.querySelector('[data-doc-block="' + kind + '"]');
    if (!st) return;
    var added = !!(block && block.classList.contains("is-added"));
    st.classList.remove("is-empty", "is-ok", "is-warn");
    if (!added) {
      st.textContent = "Не загружен";
      st.classList.add("is-empty");
      return;
    }
    var expiry = root.querySelector('[data-doc-expiry="' + kind + '"]');
    var iso = expiry && expiry.value;
    var days = iso ? daysUntilExpiry(iso) : null;
    if (days == null) {
      st.textContent = "Загружен";
      st.classList.add("is-ok");
      return;
    }
    if (days < 0) {
      st.textContent = "Истёк";
      st.classList.add("is-warn");
      return;
    }
    if (days === 0) {
      st.textContent = "Внимание: истекает сегодня";
      st.classList.add("is-warn");
      return;
    }
    if (days === 1) {
      st.textContent = "Внимание: остался 1 день";
      st.classList.add("is-warn");
      return;
    }
    if (days <= DOC_WARN_DAYS) {
      st.textContent = "Внимание: осталось " + days + " " + daysWord(days);
      st.classList.add("is-warn");
      return;
    }
    st.textContent = "Активен до " + formatDocDate(iso);
    st.classList.add("is-ok");
  }

  function closeOtherDocExtras(openKind) {
    root.querySelectorAll("[data-doc-extra]").forEach(function (extra) {
      var block = extra.closest("[data-doc-block]");
      var k = block && block.getAttribute("data-doc-block");
      if (k !== openKind) extra.hidden = true;
    });
  }

  function setDocStatus(kind, status, opts) {
    opts = opts || {};
    var extra = root.querySelector('[data-doc-extra="' + kind + '"]');
    var block = root.querySelector('[data-doc-block="' + kind + '"]');
    var s = (status || "нет").toLowerCase();
    var added = s === "есть";
    if (block) block.classList.toggle("is-added", added);
    if (!added) {
      resetDocDropzone(kind);
      var expiry = root.querySelector('[data-doc-expiry="' + kind + '"]');
      if (expiry) {
        expiry.value = "";
        expiry.classList.remove("is-expired");
      }
      if (extra) extra.hidden = opts.keepOpen ? false : kind !== "cert";
      if (extra && !extra.hidden) closeOtherDocExtras(kind);
    } else {
      var nameEl = root.querySelector('[data-doc-file-name="' + kind + '"]');
      if (nameEl && !String(nameEl.textContent || "").trim()) {
        setDocFileName(kind, "документ.pdf");
      }
    }
    refreshDocTag(kind);
  }

  function setHonestUi(on, category) {
    on = !!on;
    if (honestToggle) honestToggle.checked = on;
    if (honestWrap) {
      honestWrap.classList.toggle("is-on", on);
      honestWrap.setAttribute("data-honest-on", on ? "true" : "false");
    }
    if (honestLabel) honestLabel.textContent = on ? "Вкл" : "Выкл";
    if (honestCatWrap) honestCatWrap.hidden = !on;
    var hidden = root.querySelector('[data-pass-field="honest"]');
    if (hidden) hidden.value = on ? "да" : "нет";
    var cat = root.querySelector('[data-pass-field="honest_category"]');
    if (cat && category != null) cat.value = category;
  }

  function setMediaSlot(slotKey, label) {
    var slot = root.querySelector('[data-pass-media-slot="' + slotKey + '"]');
    if (!slot) return;
    var filled = isMediaFilled(label);
    slot.classList.toggle("is-filled", filled);
    slot.classList.toggle("is-empty", !filled);
    slot.setAttribute("data-filled", filled ? "1" : "0");
    slot.setAttribute("title", label || "");
    var status = slot.querySelector("[data-slot-status]");
    if (status) {
      status.textContent = filled ? label || "загружено" : "+";
    }
  }

  var PHOTO_SLOT_ORDER = ["photo1"];
  var PHOTO_MAX_SLOTS = 20;
  var MEDIA_MAX_BYTES = 10 * 1024 * 1024;
  var mediaSlotStore = {};

  function photoSlotKey(i) {
    return "photo" + i;
  }

  function photoSlotLabel(i) {
    return i <= 1 ? "Фото" : "Фото " + i;
  }

  function rebuildPhotoSlotOrder() {
    PHOTO_SLOT_ORDER = [];
    root.querySelectorAll("[data-pass-media-kind='photo']").forEach(function (slot) {
      PHOTO_SLOT_ORDER.push(slot.getAttribute("data-pass-media-slot"));
    });
    if (!PHOTO_SLOT_ORDER.length) PHOTO_SLOT_ORDER = ["photo1"];
  }

  function makePhotoSlot(i) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "mwd-media-slot";
    btn.setAttribute("data-pass-media-slot", photoSlotKey(i));
    btn.setAttribute("data-pass-media-kind", "photo");
    var lab = document.createElement("span");
    lab.className = "mwd-media-slot-label";
    lab.textContent = photoSlotLabel(i);
    var st = document.createElement("span");
    st.className = "mwd-media-slot-status";
    st.setAttribute("data-slot-status", "");
    st.textContent = "+";
    btn.appendChild(lab);
    btn.appendChild(st);
    return btn;
  }

  function ensurePhotoSlots(count) {
    count = Math.max(1, Math.min(PHOTO_MAX_SLOTS, count | 0));
    var grid = document.getElementById("mwd-pass-media-slots");
    if (!grid) return;
    var videoSlot = grid.querySelector('[data-pass-media-slot="video"]');
    var i;
    var existing = grid.querySelectorAll("[data-pass-media-kind='photo']");
    for (i = existing.length; i > count; i--) {
      var extra = grid.querySelector('[data-pass-media-slot="' + photoSlotKey(i) + '"]');
      if (extra) {
        clearMediaSlotStore(photoSlotKey(i));
        extra.remove();
      }
    }
    existing = grid.querySelectorAll("[data-pass-media-kind='photo']");
    for (i = existing.length + 1; i <= count; i++) {
      var slot = makePhotoSlot(i);
      if (videoSlot) grid.insertBefore(slot, videoSlot);
      else grid.appendChild(slot);
      bindMediaSlot(slot);
    }
    rebuildPhotoSlotOrder();
  }

  function isImageFile(f) {
    if (!f || !f.name) return false;
    if (/\.svg$/i.test(f.name)) return false;
    if (f.type && f.type.indexOf("image/") === 0 && f.type.indexOf("svg") < 0) return true;
    return /\.(jpe?g|png|webp|gif)$/i.test(f.name);
  }

  function isVideoFile(f) {
    if (!f || !f.name) return false;
    if (f.type && f.type.indexOf("video/") === 0) return true;
    return /\.(mp4|mov|webm)$/i.test(f.name);
  }

  function clearMediaSlotStore(key) {
    var prev = mediaSlotStore[key];
    if (prev && prev.url) {
      try {
        URL.revokeObjectURL(prev.url);
      } catch (e) {}
    }
    delete mediaSlotStore[key];
  }

  function resetMediaSlotFiles() {
    Object.keys(mediaSlotStore).forEach(clearMediaSlotStore);
    root.querySelectorAll(".mwd-media-slot-thumb").forEach(function (el) {
      el.remove();
    });
    root.querySelectorAll("[data-pass-media-slot]").forEach(function (slot) {
      slot.removeAttribute("draggable");
    });
  }

  function syncLegacyMediaLabel(key, label, filled) {
    if (key === "video" || key === "pack_photo") {
      var el = root.querySelector('[data-pass-media="' + key + '"]');
      if (el) {
        el.textContent =
          label || (key === "pack_photo" ? "упаковка · плейсхолдер" : "видео · плейсхолдер");
        el.classList.toggle("is-filled", !!filled);
      }
    }
    if (key === "photo1") {
      var ph = root.querySelector('[data-legacy-photo="0"]');
      if (ph) {
        ph.textContent = label || "фото";
        ph.classList.toggle("is-filled", !!filled);
      }
    }
  }

  function paintMediaSlot(key) {
    var slot = root.querySelector('[data-pass-media-slot="' + key + '"]');
    if (!slot) return;
    var rec = mediaSlotStore[key];
    var oldThumb = slot.querySelector(".mwd-media-slot-thumb");
    if (oldThumb) oldThumb.remove();

    if (rec) {
      setMediaSlot(key, rec.name);
      slot.setAttribute("draggable", "true");
      syncLegacyMediaLabel(key, rec.name, true);
      if (isImageFile(rec.file)) {
        var img = document.createElement("img");
        img.className = "mwd-media-slot-thumb";
        img.alt = rec.name;
        img.src = rec.url;
        slot.prepend(img);
      }
    } else {
      var emptyLabel = key === "pack_photo" ? "упаковка · плейсхолдер" : "";
      setMediaSlot(key, emptyLabel);
      slot.removeAttribute("draggable");
      syncLegacyMediaLabel(key, emptyLabel, false);
    }
    updatePassSubmitState();
  }

  function putFileInSlot(key, file) {
    clearMediaSlotStore(key);
    mediaSlotStore[key] = {
      file: file,
      name: file.name,
      url: URL.createObjectURL(file),
    };
    paintMediaSlot(key);
  }

  function moveSlotToSlot(fromKey, toKey) {
    if (!fromKey || !toKey || fromKey === toKey) return;
    if (!mediaSlotStore[fromKey]) return;
    var src = mediaSlotStore[fromKey];
    var dst = mediaSlotStore[toKey];
    mediaSlotStore[toKey] = src;
    if (dst) mediaSlotStore[fromKey] = dst;
    else delete mediaSlotStore[fromKey];
    paintMediaSlot(fromKey);
    paintMediaSlot(toKey);
    showToast("демо · фото переложено");
  }

  function syncMediaFromData(data) {
    resetMediaSlotFiles();
    ensurePhotoSlots(1);
    var photos = data.photos || ["фото"];
    setMediaSlot("photo1", photos[0]);
    setMediaSlot("video", data.video || "");
    setMediaSlot("pack_photo", data.pack_photo || "");

    var photoEls = root.querySelectorAll("#mwd-pass-photos .mwd-photo-ph");
    photoEls.forEach(function (el, i) {
      var label = photos[i] || "фото " + (i + 1);
      el.textContent = label;
      el.classList.toggle("is-filled", isMediaFilled(label));
    });
    var videoEl = root.querySelector('[data-pass-media="video"]');
    if (videoEl) {
      videoEl.textContent = data.video || "видео · плейсхолдер";
      videoEl.classList.toggle("is-filled", isMediaFilled(data.video));
    }
    var packEl = root.querySelector('[data-pass-media="pack_photo"]');
    if (packEl) {
      packEl.textContent = data.pack_photo || "упаковка · плейсхолдер";
      packEl.classList.toggle("is-filled", isMediaFilled(data.pack_photo));
    }
  }

  function highlightTariff(volume) {
    var rows = root.querySelectorAll("#mwd-pass-tariff tbody tr");
    var match = null;
    rows.forEach(function (tr) {
      var min = parseFloat(tr.getAttribute("data-tier-min"));
      var max = parseFloat(tr.getAttribute("data-tier-max"));
      var price = tr.getAttribute("data-tier-price");
      var active = false;
      if (isFinite(volume) && volume >= 0) {
        // 0–0.2 включительно с обеих сторон; дальше (min, max]
        if (min === 0) active = volume <= max;
        else active = volume > min && volume <= max;
      }
      tr.classList.toggle("is-active", active);
      if (active) {
        match = {
          label: ((tr.cells[0] && tr.cells[0].textContent) || "").trim(),
          price: price,
        };
      }
    });
    if (tariffActiveLabel) {
      if (match) {
        tariffActiveLabel.textContent =
          match.label + " → " + match.price + " ₽";
      } else if (isFinite(volume) && volume > 0) {
        tariffActiveLabel.textContent = "вне сетки · " + formatVol(volume) + " л";
      } else {
        tariffActiveLabel.textContent = "—";
      }
    }
    var logistics = root.querySelector('[data-pass-field="logistics"]');
    if (logistics && match) logistics.value = match.price;
    return match;
  }

  function recalcVolume() {
    var len = parseNum(
      (root.querySelector('[data-pass-field="pack_len"]') || {}).value
    );
    var wid = parseNum(
      (root.querySelector('[data-pass-field="pack_wid"]') || {}).value
    );
    var hei = parseNum(
      (root.querySelector('[data-pass-field="pack_hei"]') || {}).value
    );
    var volEl = root.querySelector('[data-pass-field="volume"]');
    var vol = NaN;
    if (isFinite(len) && isFinite(wid) && isFinite(hei) && len > 0 && wid > 0 && hei > 0) {
      vol = (len * wid * hei) / 1000;
    }
    if (volEl) volEl.value = formatVol(vol);
    highlightTariff(vol);
    updatePassSubmitState();
    return vol;
  }

  var REQUIRED_SPECS = [
    {
      key: "art",
      label: "артикул",
      where: "Главное",
      tab: "main",
      selector: '[data-pass-field="art"]',
    },
    {
      key: "nds",
      label: "НДС",
      where: "Главное",
      tab: "main",
      selector: '[data-pass-field="nds"]',
    },
    {
      key: "pack",
      label: "габариты упаковки",
      where: "Логистика",
      tab: "logistics",
      selector: '[data-pass-field="pack_len"]',
      extraSelectors: ['[data-pass-field="pack_wid"]', '[data-pass-field="pack_hei"]'],
    },
    {
      key: "pack_photo",
      label: "фото с линейкой",
      where: "Медиафайлы",
      tab: "media",
      selector: '[data-pass-media-slot="pack_photo"]',
    },
  ];

  function requiredTargets(spec) {
    var els = [];
    var main = root.querySelector(spec.selector);
    if (main) els.push(main);
    (spec.extraSelectors || []).forEach(function (sel) {
      var el = root.querySelector(sel);
      if (el) els.push(el);
    });
    return els;
  }

  function isRequiredMissing(spec) {
    if (spec.key === "art") {
      return !((root.querySelector(spec.selector) || {}).value || "").trim();
    }
    if (spec.key === "nds") {
      return !normalizeNds((root.querySelector(spec.selector) || {}).value);
    }
    if (spec.key === "pack") {
      var plen = parseNum((root.querySelector('[data-pass-field="pack_len"]') || {}).value);
      var pwid = parseNum((root.querySelector('[data-pass-field="pack_wid"]') || {}).value);
      var phei = parseNum((root.querySelector('[data-pass-field="pack_hei"]') || {}).value);
      return !(
        isFinite(plen) &&
        plen > 0 &&
        isFinite(pwid) &&
        pwid > 0 &&
        isFinite(phei) &&
        phei > 0
      );
    }
    if (spec.key === "pack_photo") {
      var packSlot = root.querySelector(spec.selector);
      return !(packSlot && packSlot.getAttribute("data-filled") === "1");
    }
    return false;
  }

  function missingRequired() {
    return REQUIRED_SPECS.filter(isRequiredMissing);
  }

  function isPassportDataComplete(data) {
    if (!data) return false;
    if (!String(data.art || "").trim()) return false;
    if (!normalizeNds(data.nds)) return false;
    var plen = parseNum(data.pack_len);
    var pwid = parseNum(data.pack_wid);
    var phei = parseNum(data.pack_hei);
    if (
      !(
        isFinite(plen) &&
        plen > 0 &&
        isFinite(pwid) &&
        pwid > 0 &&
        isFinite(phei) &&
        phei > 0
      )
    ) {
      return false;
    }
    return isMediaFilled(data.pack_photo);
  }

  function isEditQueueComplete() {
    if (currentPassMode !== "edit" || !editQueue.length) return false;
    return editQueue.every(function (item, i) {
      if (i === editQueueIndex) return missingRequired().length === 0;
      return isPassportDataComplete(
        editQueueDrafts[item.art] || passportFor(item.art, item.name)
      );
    });
  }

  function updatePassContext() {
    if (!passContext) return;
    if (currentPassMode !== "edit") {
      passContext.hidden = true;
      passContext.classList.remove("is-queue-done");
      return;
    }
    passContext.hidden = false;
    if (!editQueue.length) {
      passContext.classList.remove("is-queue-done");
      return;
    }
    if (isEditQueueComplete()) {
      passContext.textContent = "Готово! Отлично поработал.";
      passContext.classList.add("is-queue-done");
      if (!queueDoneToastShown) {
        queueDoneToastShown = true;
        showToast("Готово! Отлично поработал.");
      }
      return;
    }
    queueDoneToastShown = false;
    passContext.classList.remove("is-queue-done");
    var item = editQueue[editQueueIndex] || {};
    passContext.textContent =
      "К правке (" +
      editQueue.length +
      ") · " +
      (editQueueIndex + 1) +
      " из " +
      editQueue.length +
      " · арт. " +
      (item.art || "") +
      " · " +
      (item.name || "");
  }

  function markRequiredGaps(missing) {
    root.querySelectorAll(".is-req-missing").forEach(function (el) {
      el.classList.remove("is-req-missing");
    });

    var byKey = {};
    missing.forEach(function (m) {
      byKey[m.key] = m;
    });

    REQUIRED_SPECS.forEach(function (spec) {
      var gap = !!byKey[spec.key];
      requiredTargets(spec).forEach(function (el) {
        var wrap = el.closest(".mwd-field") || el;
        wrap.classList.toggle("is-req-missing", gap);
        if (gap) el.setAttribute("aria-invalid", "true");
        else el.removeAttribute("aria-invalid");
      });
    });

    var packBlock = root.querySelector(".mwd-dims-card-pack");
    if (packBlock) packBlock.classList.toggle("is-req-missing", !!byKey.pack);

    root.querySelectorAll(".mwd-pass-innertab").forEach(function (btn) {
      var tab = btn.getAttribute("data-pass-tab");
      var n = missing.filter(function (m) {
        return m.tab === tab;
      }).length;
      btn.classList.toggle("has-missing", n > 0);
      var badge = btn.querySelector("[data-pass-tab-miss]");
      if (badge) {
        badge.hidden = n === 0;
        badge.textContent = n ? String(n) : "";
      }
    });
  }

  function flashRequired(el) {
    if (!el) return;
    var wrap = el.closest(".mwd-field") || el;
    wrap.classList.remove("is-req-flash");
    void wrap.offsetWidth;
    wrap.classList.add("is-req-flash");
    window.setTimeout(function () {
      wrap.classList.remove("is-req-flash");
    }, 1200);
  }

  function jumpToRequired(key) {
    var spec = null;
    REQUIRED_SPECS.forEach(function (s) {
      if (s.key === key) spec = s;
    });
    if (!spec) return;
    activatePassTab(spec.tab);
    window.requestAnimationFrame(function () {
      var els = requiredTargets(spec);
      var first = els[0];
      if (!first) return;
      first.scrollIntoView({ behavior: "smooth", block: "center" });
      if (typeof first.focus === "function") first.focus();
      els.forEach(flashRequired);
    });
  }

  // Префиксы по группе кабинета (АА/МА/ИА/ООО), не «A=ЧМА».
  // Формат авто-имени: {prefix}{code6} {short_base}, итог ≤40.
  var NAME_MAX = 40;
  var CABINET_PREFIX_BY_GROUP = {
    AA: "",
    MA: "М ",
    IA: "И ",
    OOO: "О ",
  };
  var NAME_CABINETS = [
    { label: "Озон ГАА", group: "AA", kind: "ip" },
    { label: "Озон ЧМА", group: "MA", kind: "ip" },
    { label: "Озон ЧИА", group: "IA", kind: "ip" },
    { label: "Озон ООО", group: "OOO", kind: "ooo" },
    { label: "ВБ ГАА", group: "AA", kind: "ip" },
    { label: "ВБ ЧМА", group: "MA", kind: "ip" },
    { label: "ВБ ЧИА", group: "IA", kind: "ip" },
    { label: "ВБ ООО", group: "OOO", kind: "ooo" },
  ];

  /** Числовой код 1С без ведущих нулей. */
  function articleCode(value) {
    var m = String(value == null ? "" : value).match(/\d{3,}/);
    if (!m) return "";
    return String(parseInt(m[0], 10));
  }

  /** Код, дополненный нулями слева до 6 цифр (для авто-имени). */
  function code6(value) {
    var c = articleCode(value);
    if (!c) return "";
    return c.length >= 6 ? c : ("000000" + c).slice(-6);
  }

  /**
   * Сокращение полного имени → база для кабинетов.
   * Стоп-слова / типичные замены как в Excel-калькуляторе товароведа.
   */
  function shortenProductName(fullName) {
    var s = String(fullName || "").trim();
    if (!s) return "";
    s = s.replace(/^\d{3,}\s+/, "");
    s = s.replace(/\([^)]*\)/g, " ");
    s = s.replace(/(?:^|\s)(?:из|для|под|при|без|или|над|между)(?=\s|$)/gi, " ");
    var repl = [
      [/подставка/gi, "подст."],
      [/книг\w*/gi, "книг"],
      [/хозяйственн\w*/gi, "хоз."],
      [/усиленн\w*/gi, "усил."],
      [/деревянн\w*/gi, "дер."],
      [/металлич\w*/gi, "мет."],
      [/пластиков\w*/gi, "пласт."],
      [/набор/gi, "наб."],
      [/штук\w*|шт\.?/gi, "шт"],
      [/триколор/gi, "ТРИКОЛ"],
      [/колоском?/gi, "КОЛОС"],
      [/первый/gi, "1-й"],
      [/первы\w*/gi, "1-й"],
    ];
    repl.forEach(function (pair) {
      s = s.replace(pair[0], pair[1]);
    });
    s = s.replace(/\s+д\s+книг/gi, " д/книг");
    s = s.replace(/["«»]/g, "");
    s = s.replace(/\s+/g, " ").trim();
    if (s.length > NAME_MAX) {
      var cut = s.slice(0, NAME_MAX);
      var sp = cut.lastIndexOf(" ");
      s = (sp > 20 ? cut.slice(0, sp) : cut).trim();
    }
    return s;
  }

  function cabinetPrefix(group) {
    return Object.prototype.hasOwnProperty.call(CABINET_PREFIX_BY_GROUP, group)
      ? CABINET_PREFIX_BY_GROUP[group]
      : "";
  }

  /** {prefix}{code} {short} — итог ≤40; при переполнении режем short. */
  function buildCabinetName(prefix, code, shortBase) {
    var p = prefix || "";
    var c = code || "";
    var head = p + c;
    var short = String(shortBase || "").trim();
    if (!c && !short) return "";
    if (!short) return head.slice(0, NAME_MAX);
    var sep = head ? " " : "";
    var full = head + sep + short;
    if (full.length <= NAME_MAX) return full;
    var budget = NAME_MAX - head.length - sep.length;
    if (budget <= 0) return head.slice(0, NAME_MAX);
    var cut = short.slice(0, budget);
    var sp = cut.lastIndexOf(" ");
    if (sp > Math.min(8, budget - 1)) cut = cut.slice(0, sp);
    return (head + sep + cut).trim();
  }

  function updateNameLenEl(el, n, max) {
    if (!el) return;
    if (max != null) {
      el.textContent = n + " / " + max;
      el.classList.toggle("is-over", n > max);
    } else {
      el.textContent = String(n);
      el.classList.remove("is-over");
    }
  }

  function copyCabinetText(text) {
    if (!text) return;
    function ok() {
      showToast("скопировано");
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(ok, function () {
        showToast(text);
      });
      return;
    }
    showToast(text);
  }

  function renderCabinetNames() {
    var tbody = document.getElementById("mwd-pass-names-tbody");
    if (!tbody) return;
    var fullEl = document.getElementById("mwd-pass-full-name");
    var fullLen = document.getElementById("mwd-pass-full-len");
    var shortInput = root.querySelector('[data-pass-field="short_base"]');
    var shortLen = document.getElementById("mwd-pass-short-len");
    var nameEl = root.querySelector('[data-pass-field="name"]');
    var artEl = root.querySelector('[data-pass-field="art"]');
    var ndsEl = root.querySelector('[data-pass-field="nds"]');

    var full = String((nameEl && nameEl.value) || "");
    if (fullEl) fullEl.textContent = full.trim() ? full : "—";
    updateNameLenEl(fullLen, full.length);

    var short = String((shortInput && shortInput.value) || "");
    updateNameLenEl(shortLen, short.length, NAME_MAX);
    if (shortInput) shortInput.classList.toggle("is-over", short.length > NAME_MAX);

    var code = code6((artEl && artEl.value) || "");
    var nds = normalizeNds((ndsEl && ndsEl.value) || "");
    var oooOk = nds === "22";

    tbody.innerHTML = "";
    NAME_CABINETS.forEach(function (cab) {
      var skip = cab.kind === "ooo" && nds && !oooOk;
      var name = skip
        ? "НЕ заводим"
        : buildCabinetName(cabinetPrefix(cab.group), code, short);
      var len = skip ? 0 : name.length;

      var tr = document.createElement("tr");
      if (skip) tr.className = "is-skip";

      var tdCab = document.createElement("td");
      tdCab.className = "mwd-n-cab";
      tdCab.textContent = cab.label;

      var tdName = document.createElement("td");
      tdName.className = "mwd-n-name" + (skip ? " is-skip-label" : "");
      tdName.textContent = name;

      var tdLen = document.createElement("td");
      tdLen.className = "num";
      tdLen.textContent = skip ? "—" : String(len);

      var tdCopy = document.createElement("td");
      tdCopy.className = "mwd-n-copy";
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "mwd-btn mwd-btn-sm";
      btn.textContent = "копировать";
      btn.disabled = skip || !name;
      btn.title = skip ? "НЕ заводим" : "Скопировать авто-имя";
      if (!skip && name) {
        btn.addEventListener("click", function () {
          copyCabinetText(name);
        });
      }
      tdCopy.appendChild(btn);

      tr.appendChild(tdCab);
      tr.appendChild(tdName);
      tr.appendChild(tdLen);
      tr.appendChild(tdCopy);
      tbody.appendChild(tr);
    });
  }

  function applyNdsCabinets(ndsRaw) {
    var nds = normalizeNds(ndsRaw);
    var hint = document.getElementById("mwd-pass-cab-hint");
    if (hint) {
      hint.classList.remove("is-ok", "is-block", "is-idle");
      if (!nds) {
        hint.textContent = "";
        hint.classList.add("is-idle");
        hint.setAttribute("data-nds-state", "");
        hint.hidden = true;
      } else if (nds === "22") {
        hint.textContent = "Можно на ООО и на ИП (ГАА / ЧМА / ЧИА)";
        hint.classList.add("is-ok");
        hint.setAttribute("data-nds-state", "22");
        hint.hidden = false;
      } else if (nds === "none") {
        hint.textContent = "ООО нельзя — только ИП (ГАА / ЧМА / ЧИА)";
        hint.classList.add("is-block");
        hint.setAttribute("data-nds-state", "none");
        hint.hidden = false;
      } else {
        hint.textContent = "ООО нельзя — только ИП (ГАА / ЧМА / ЧИА)";
        hint.classList.add("is-block");
        hint.setAttribute("data-nds-state", "other");
        hint.hidden = false;
      }
    }
    syncCreateArtCabinetOptions(nds);
    renderCabinetNames();
  }

  function fillCreateArtCabinetSelect() {
    var sel = document.getElementById("mwd-create-art-cabinet");
    if (!sel) return;
    var prev = sel.value;
    sel.innerHTML = "";
    NAME_CABINETS.forEach(function (cab) {
      var opt = document.createElement("option");
      opt.value = cab.label;
      opt.textContent = cab.label;
      opt.setAttribute("data-cab-kind", cab.kind);
      opt.setAttribute("data-cab-group", cab.group);
      sel.appendChild(opt);
    });
    if (prev) sel.value = prev;
  }

  function findCabinetByLabel(label) {
    var i;
    for (i = 0; i < NAME_CABINETS.length; i++) {
      if (NAME_CABINETS[i].label === label) return NAME_CABINETS[i];
    }
    return null;
  }

  function cabinetIsSkip(cab, nds) {
    if (!cab) return true;
    return cab.kind === "ooo" && nds && nds !== "22";
  }

  function firstEnabledCreateArtOption(sel) {
    var i;
    var opt;
    if (!sel) return null;
    for (i = 0; i < sel.options.length; i++) {
      opt = sel.options[i];
      if (!opt.disabled && !opt.hidden) return opt;
    }
    return null;
  }

  function syncCreateArtCabinetOptions(nds) {
    var sel = document.getElementById("mwd-create-art-cabinet");
    if (!sel) return;
    fillCreateArtCabinetSelect();
    var oooOk = nds === "22";
    var firstEnabled = null;
    Array.prototype.forEach.call(sel.options, function (opt) {
      var kind = opt.getAttribute("data-cab-kind");
      var blocked = kind === "ooo" && nds && !oooOk;
      opt.disabled = !!blocked;
      opt.hidden = !!blocked;
      if (!blocked && firstEnabled == null) firstEnabled = opt;
    });
    var cur = sel.selectedOptions[0];
    if ((!cur || cur.disabled || cur.hidden) && firstEnabled) {
      firstEnabled.selected = true;
    }
    updateCreateArtPreview();
  }

  function updateCreateArtPreview() {
    var sel = document.getElementById("mwd-create-art-cabinet");
    var hint = document.getElementById("mwd-create-art-nds-hint");
    var ndsEl = root.querySelector('[data-pass-field="nds"]');
    var artEl = root.querySelector('[data-pass-field="art"]');
    var shortEl = root.querySelector('[data-pass-field="short_base"]');
    var nds = normalizeNds((ndsEl && ndsEl.value) || "");
    var art = (artEl && artEl.value) || currentPassArt || "";
    var short = (shortEl && shortEl.value) || "";
    var oooBlocked = !!(nds && nds !== "22");
    var cab = sel ? findCabinetByLabel(sel.value) : null;
    var opt = sel && sel.selectedOptions[0];
    var enabled = firstEnabledCreateArtOption(sel);
    var skip = !cab || !enabled || (opt && (opt.disabled || opt.hidden)) || cabinetIsSkip(cab, nds);
    var prefix = cab ? cabinetPrefix(cab.group) : "";
    var code = code6(art);
    var seller = skip || !code ? "" : prefix + code;
    var name = skip
      ? (cab ? "НЕ заводим" : "")
      : buildCabinetName(prefix, code, short);

    if (hint) {
      hint.hidden = !oooBlocked;
      hint.textContent = oooBlocked ? "ООО нельзя при этом НДС — только ИП" : "";
    }
    if (createArtSeller) createArtSeller.value = seller;
    if (createArtPreview) createArtPreview.value = name;
    var submit = document.getElementById("mwd-create-art-submit");
    if (submit) submit.disabled = skip || !enabled;
  }

  function updatePassSubmitState() {
    var missing = missingRequired();
    var ok = missing.length === 0;
    if (createArtBtn) {
      createArtBtn.disabled = false;
      createArtBtn.classList.toggle("is-ready", ok);
    }
    updatePassContext();
    if (!passCreateAttempted) {
      markRequiredGaps([]);
      if (passReqHint) {
        passReqHint.hidden = true;
        passReqHint.classList.remove("is-ok");
        passReqHint.title = "";
      }
      return;
    }
    markRequiredGaps(missing);
    if (!passReqHint) return;

    var lead = document.getElementById("mwd-pass-req-lead");
    var chips = document.getElementById("mwd-pass-req-chips");
    passReqHint.hidden = false;
    passReqHint.classList.toggle("is-ok", ok);
    passReqHint.title = ok
      ? ""
      : missing
          .map(function (m) {
            return m.label + " (" + m.where + ")";
          })
          .join(", ");

    if (lead) {
      lead.textContent = ok
        ? "Все обязательные поля заполнены"
        : "Не заполнено ещё " + missing.length + " — нажмите, чтобы перейти:";
    }
    if (chips) {
      chips.innerHTML = ok
        ? ""
        : missing
            .map(function (m) {
              return (
                '<button type="button" class="mwd-pass-req-chip" data-goto-req="' +
                m.key +
                '" title="Открыть вкладку «' +
                m.where +
                '»">' +
                m.label +
                " · " +
                m.where +
                "</button>"
              );
            })
            .join("");
    }
  }

  if (passReqHint) {
    passReqHint.addEventListener("click", function (e) {
      var chip = e.target.closest("[data-goto-req]");
      if (!chip) return;
      jumpToRequired(chip.getAttribute("data-goto-req"));
    });
  }

  function activatePassTab(key, opts) {
    opts = opts || {};
    if (VALID_PASS_TABS.indexOf(key) < 0) key = "main";
    root.querySelectorAll("#mwd-pass-innertabs .mwd-pass-innertab").forEach(function (btn) {
      var on = btn.getAttribute("data-pass-tab") === key;
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-selected", on ? "true" : "false");
    });
    root.querySelectorAll("[data-pass-tab-panel]").forEach(function (panel) {
      var on = panel.getAttribute("data-pass-tab-panel") === key;
      panel.classList.toggle("is-active", on);
      panel.hidden = !on;
    });
    if (!opts.skipSave) saveState({ passInnerTab: key });
  }

  root.querySelectorAll("#mwd-pass-innertabs .mwd-pass-innertab").forEach(function (btn) {
    btn.addEventListener("click", function () {
      activatePassTab(btn.getAttribute("data-pass-tab"));
    });
  });

  if (saved.passInnerTab) activatePassTab(saved.passInnerTab, { skipSave: true });
  else activatePassTab("main", { skipSave: true });

  function fillPassport(data, opts) {
    opts = opts || {};
    data = data || emptyPassport();
    currentPassArt = data.art || "";
    root.querySelectorAll("[data-pass-field]").forEach(function (el) {
      var key = el.getAttribute("data-pass-field");
      if (key === "honest") return; // через toggle
      if (key === "volume") return; // авторасчёт
      var val = data[key];
      if (val == null) val = "";
      if (key === "nds") val = normalizeNds(val);
      el.value = val;
    });

    setHonestUi(isHonestOn(data.honest), data.honest_category || "");

    var shortEl = root.querySelector('[data-pass-field="short_base"]');
    if (shortEl && !String(shortEl.value || "").trim()) {
      shortEl.value = shortenProductName(
        (root.querySelector('[data-pass-field="name"]') || {}).value
      );
    }

    var docs = data.docs || {};
    setDocStatus("cert", docs.cert);
    setDocStatus("decl", docs.decl);
    setDocStatus("refusal", docs.refusal);

    syncMediaFromData(data);
    recalcVolume();
    applyNdsCabinets((root.querySelector('[data-pass-field="nds"]') || {}).value);

    if (passContext) {
      if (opts.context === "manual" || !data.art) {
        passContext.textContent =
          "Поля пустые · отметьте товары в ведомости и нажмите «Редактировать выбранные»";
        passportFilledFromVed = false;
      } else {
        passContext.textContent =
          "Заполнено из ведомости · арт. " + data.art + " · " + (data.name || "");
        passportFilledFromVed = true;
      }
    }
    passCreateAttempted = false;
    updatePassSubmitState();
  }

  function docStatusOf(kind) {
    var block = root.querySelector('[data-doc-block="' + kind + '"]');
    return block && block.classList.contains("is-added") ? "есть" : "нет";
  }

  function snapshotPassport() {
    var data = emptyPassport();
    root.querySelectorAll("[data-pass-field]").forEach(function (el) {
      var key = el.getAttribute("data-pass-field");
      if (!key) return;
      data[key] = el.value;
    });
    data.honest = isHonestOn(data.honest) ? "да" : "нет";
    data.docs = {
      cert: docStatusOf("cert"),
      decl: docStatusOf("decl"),
      refusal: docStatusOf("refusal"),
    };
    var photos = [];
    root.querySelectorAll("[data-pass-media-kind='photo']").forEach(function (slot) {
      photos.push(slot.getAttribute("title") || "");
    });
    data.photos = photos.length ? photos : data.photos;
    var videoSlot = root.querySelector('[data-pass-media-slot="video"]');
    var packSlot = root.querySelector('[data-pass-media-slot="pack_photo"]');
    data.video = (videoSlot && videoSlot.getAttribute("title")) || data.video;
    data.pack_photo = (packSlot && packSlot.getAttribute("title")) || data.pack_photo;
    return data;
  }

  function saveCurrentDraft() {
    if (!currentPassArt) return;
    editQueueDrafts[currentPassArt] = snapshotPassport();
  }

  // стартовое состояние паспорта
  fillPassport(emptyPassport(), { context: "manual" });

  // Honest toggle
  if (honestToggle) {
    honestToggle.addEventListener("change", function () {
      setHonestUi(honestToggle.checked, null);
      showToast(honestToggle.checked ? "демо · Честный Знак вкл" : "демо · Честный Знак выкл");
    });
  }

  // НДС → матрица доступности кабинетов
  var ndsSelect = root.querySelector('[data-pass-field="nds"]');
  if (ndsSelect) {
    ndsSelect.addEventListener("change", function () {
      applyNdsCabinets(ndsSelect.value);
      updatePassSubmitState();
      var n = normalizeNds(ndsSelect.value);
      if (n === "22") showToast("демо · НДС 22% → ООО можно");
      else if (n === "none") showToast("демо · без НДС → только ИП");
      else if (n === "other") showToast("демо · другой НДС → только ИП");
    });
  }

  // Документы: клик по строке — аккордеон (открылся один, остальные закрылись).
  root.querySelectorAll("[data-doc-block]").forEach(function (block) {
    var row = block.querySelector(".mwd-doc-row");
    var kind = block.getAttribute("data-doc-block");
    if (!row) return;
    row.addEventListener("click", function (e) {
      if (e.target.closest("[data-doc-remove]")) return;
      var extra = block.querySelector("[data-doc-extra]");
      if (!extra) return;
      if (!extra.hidden) {
        extra.hidden = true;
        return;
      }
      extra.hidden = false;
      closeOtherDocExtras(kind);
    });
  });

  root.querySelectorAll("[data-doc-remove]").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      var kind = btn.getAttribute("data-doc-remove");
      setDocStatus(kind, "нет", { keepOpen: true });
      showToast("демо · файл удалён");
    });
  });

  root.querySelectorAll("[data-doc-drop]").forEach(function (zone) {
    var kind = zone.getAttribute("data-doc-drop");
    var fileInput = root.querySelector('[data-doc-file="' + kind + '"]');
    function markFilled(name) {
      setDocFileName(kind, name || "документ.pdf");
      setDocStatus(kind, "есть");
      showToast("демо · файл");
    }
    zone.addEventListener("click", function () {
      if (fileInput) fileInput.click();
      else markFilled();
    });
    zone.addEventListener("dragover", function (e) {
      e.preventDefault();
      zone.classList.add("is-dragover");
    });
    zone.addEventListener("dragleave", function () {
      zone.classList.remove("is-dragover");
    });
    zone.addEventListener("drop", function (e) {
      e.preventDefault();
      zone.classList.remove("is-dragover");
      var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      markFilled(f ? f.name : null);
    });
    if (fileInput) {
      fileInput.addEventListener("change", function () {
        var f = fileInput.files && fileInput.files[0];
        if (f) markFilled(f.name);
      });
    }
  });

  root.querySelectorAll("[data-doc-expiry]").forEach(function (inp) {
    inp.addEventListener("change", function () {
      var kind = inp.getAttribute("data-doc-expiry");
      var v = inp.value;
      var expired = false;
      if (v) {
        var days = daysUntilExpiry(v);
        expired = days != null && days < 0;
      }
      inp.classList.toggle("is-expired", expired);
      refreshDocTag(kind);
    });
  });

  // Pack dims → volume
  ["pack_len", "pack_wid", "pack_hei"].forEach(function (key) {
    var el = root.querySelector('[data-pass-field="' + key + '"]');
    if (!el) return;
    el.addEventListener("input", function () {
      recalcVolume();
    });
  });

  var artInputEl = root.querySelector('[data-pass-field="art"]');
  if (artInputEl) {
    artInputEl.addEventListener("input", function () {
      currentPassArt = artInputEl.value || "";
      updatePassSubmitState();
      renderCabinetNames();
    });
  }

  var nameInputEl = root.querySelector('[data-pass-field="name"]');
  if (nameInputEl) {
    nameInputEl.addEventListener("input", function () {
      renderCabinetNames();
    });
  }

  var shortInputEl = root.querySelector('[data-pass-field="short_base"]');
  if (shortInputEl) {
    shortInputEl.addEventListener("input", function () {
      renderCabinetNames();
    });
  }

  // Media slots: папка → раскладка по порядку; линейка — руками в красный кубик
  function entryToFile(entry) {
    return new Promise(function (resolve, reject) {
      entry.file(resolve, reject);
    });
  }

  function readDirEntries(dirEntry) {
    return new Promise(function (resolve, reject) {
      var reader = dirEntry.createReader();
      var all = [];
      function next() {
        reader.readEntries(function (batch) {
          if (!batch.length) {
            resolve(all);
            return;
          }
          all = all.concat(batch);
          next();
        }, reject);
      }
      next();
    });
  }

  function collectFilesFromEntry(entry) {
    if (!entry) return Promise.resolve([]);
    if (entry.isFile) {
      return entryToFile(entry).then(function (f) {
        return [f];
      });
    }
    if (!entry.isDirectory) return Promise.resolve([]);
    // только корень папки — без вложенных каталогов
    return readDirEntries(entry).then(function (entries) {
      var filesOnly = entries.filter(function (e) {
        return e.isFile;
      });
      return Promise.all(filesOnly.map(entryToFile));
    });
  }

  function filesFromDrop(dataTransfer) {
    var items = dataTransfer && dataTransfer.items;
    if (items && items.length) {
      var jobs = [];
      for (var i = 0; i < items.length; i++) {
        var item = items[i];
        var entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : null;
        if (entry) jobs.push(collectFilesFromEntry(entry));
        else if (item.kind === "file") {
          var asFile = item.getAsFile();
          if (asFile) jobs.push(Promise.resolve([asFile]));
        }
      }
      if (jobs.length) {
        return Promise.all(jobs).then(function (chunks) {
          return chunks.reduce(function (acc, x) {
            return acc.concat(x);
          }, []).filter(Boolean);
        });
      }
    }
    var list = dataTransfer && dataTransfer.files;
    return Promise.resolve(list ? Array.prototype.slice.call(list) : []);
  }

  function sortFiles(files) {
    return files.slice().sort(function (a, b) {
      return String(a.name).localeCompare(String(b.name), "ru", {
        numeric: true,
        sensitivity: "base",
      });
    });
  }

  function distributeDroppedFiles(files) {
    files = sortFiles(files).filter(function (f) {
      return f && f.size > 0 && f.size <= MEDIA_MAX_BYTES;
    });
    var images = files.filter(isImageFile);
    var videos = files.filter(isVideoFile);
    if (!images.length && !videos.length) {
      showToast("в папке нет фото/видео (файлы должны лежать сразу в папке)");
      return;
    }

    if (images.length) ensurePhotoSlots(images.length);

    var i;
    for (i = 0; i < PHOTO_SLOT_ORDER.length; i++) {
      if (images[i]) putFileInSlot(PHOTO_SLOT_ORDER[i], images[i]);
    }
    if (videos[0]) putFileInSlot("video", videos[0]);

    var leftover = images.length - PHOTO_SLOT_ORDER.length;
    var msg =
      "демо · разложено " +
      Math.min(images.length, PHOTO_SLOT_ORDER.length) +
      " фото";
    if (leftover > 0) msg += " · ещё " + leftover + " не влезли";
    if (images.length) msg += " · линейку перетащите в красный кубик";
    showToast(msg);
  }

  var mediaSlotsRoot = document.getElementById("mwd-pass-media-slots");
  var mediaPanel = root.querySelector('[data-pass-tab-panel="media"]');
  var mediaDragFrom = null;
  var mediaDidDrag = false;

  if (mediaPanel) {
    mediaPanel.addEventListener("dragover", function (e) {
      e.preventDefault();
      if (mediaSlotsRoot && !mediaDragFrom) mediaSlotsRoot.classList.add("is-dragover");
    });
    mediaPanel.addEventListener("dragleave", function (e) {
      if (mediaSlotsRoot && !mediaPanel.contains(e.relatedTarget)) {
        mediaSlotsRoot.classList.remove("is-dragover");
      }
    });
    mediaPanel.addEventListener("drop", function (e) {
      e.preventDefault();
      if (mediaSlotsRoot) mediaSlotsRoot.classList.remove("is-dragover");
      if (mediaDragFrom) return;
      filesFromDrop(e.dataTransfer).then(distributeDroppedFiles).catch(function () {
        showToast("не удалось прочитать папку");
      });
    });
  }

  function bindMediaSlot(slot) {
    if (!slot || slot.getAttribute("data-media-bound") === "1") return;
    slot.setAttribute("data-media-bound", "1");
    slot.addEventListener("dragstart", function (e) {
      var key = slot.getAttribute("data-pass-media-slot");
      if (!mediaSlotStore[key]) {
        e.preventDefault();
        return;
      }
      mediaDragFrom = key;
      mediaDidDrag = true;
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", key);
    });
    slot.addEventListener("dragend", function () {
      mediaDragFrom = null;
      root.querySelectorAll(".mwd-media-slot.is-drop-target").forEach(function (el) {
        el.classList.remove("is-drop-target");
      });
    });
    slot.addEventListener("dragover", function (e) {
      if (!mediaDragFrom) return;
      e.preventDefault();
      e.stopPropagation();
      slot.classList.add("is-drop-target");
    });
    slot.addEventListener("dragleave", function () {
      slot.classList.remove("is-drop-target");
    });
    slot.addEventListener("drop", function (e) {
      if (!mediaDragFrom) return;
      e.preventDefault();
      e.stopPropagation();
      slot.classList.remove("is-drop-target");
      moveSlotToSlot(mediaDragFrom, slot.getAttribute("data-pass-media-slot"));
      mediaDragFrom = null;
    });
    slot.addEventListener("click", function () {
      if (mediaDidDrag) {
        mediaDidDrag = false;
        return;
      }
      var key = slot.getAttribute("data-pass-media-slot");
      if (mediaSlotStore[key]) {
        clearMediaSlotStore(key);
        paintMediaSlot(key);
        showToast("демо · файл снят");
        return;
      }
      var filled = slot.getAttribute("data-filled") === "1";
      if (filled) {
        setMediaSlot(key, key === "pack_photo" ? "упаковка · плейсхолдер" : "");
        showToast("демо · файл снят");
      } else {
        var label =
          key === "pack_photo"
            ? "упаковка + линейка (демо)"
            : key === "video"
              ? "видео · демо"
              : "фото · демо";
        setMediaSlot(key, label);
        if (key === "pack_photo") {
          var packEl = root.querySelector('[data-pass-media="pack_photo"]');
          if (packEl) {
            packEl.textContent = label;
            packEl.classList.add("is-filled");
          }
        }
        showToast("демо · загружено");
      }
      updatePassSubmitState();
    });
  }

  root.querySelectorAll("[data-pass-media-slot]").forEach(bindMediaSlot);

  // ── Vedomost: галочки → очередь «к правке» ──
  var vedTable = document.getElementById("mwd-vedomost-table");
  var vedCheckAll = document.getElementById("mwd-ved-check-all");
  var vedPickCount = document.getElementById("mwd-ved-pick-count");
  var vedPickLabel = document.getElementById("mwd-ved-pick-label");
  var vedEditBtn = document.getElementById("mwd-ved-edit-selected");
  var vedBulk = document.getElementById("mwd-ved-bulk");
  var vedBulkArch = document.getElementById("mwd-ved-bulk-arch");
  var vedBulkArchBtn = document.getElementById("mwd-ved-bulk-arch-btn");
  var vedBulkArchMenu = document.getElementById("mwd-ved-bulk-arch-menu");
  var vedEnterSelect = document.getElementById("mwd-ved-enter-select");
  var vedBarNormal = document.getElementById("mwd-ved-bar-normal");
  var vedClearPick = document.getElementById("mwd-ved-clear-pick");
  var vedBulkArchTxt = document.querySelector("#mwd-ved-bulk-arch .mwd-ved-bulk-arch-txt");
  var vedSearch = document.getElementById("mwd-ved-search");
  var vedCount = document.getElementById("mwd-ved-count");
  var vedEmpty = document.getElementById("mwd-ved-empty");
  var archKanban = document.getElementById("mwd-arch-kanban");
  var vedSelectMode = false;

  var ARCH_STATUSES = ["plan", "remainder", "archive"];
  var ARCH_LABELS = {
    plan: "Планируем",
    remainder: "Продаём остаток",
    archive: "В архив",
  };
  // Уже снятые карточки — только в канбане «В архив», в ведомости их нет.
  var ARCHIVE_EXTRAS = [
    { art: "1002", name: "Товар-дубль (снят)" },
    { art: "5500", name: "Упаковка устаревшая" },
    { art: "9911", name: "Пробная партия без сертификата" },
  ];
  var passQueueWrap = document.getElementById("mwd-pass-queue");
  var passQueueChips = document.getElementById("mwd-pass-queue-chips");

  if (vedSearch && typeof saved.vedSearch === "string") {
    vedSearch.value = saved.vedSearch;
  }

  function vedRows() {
    if (!vedTable) return [];
    return Array.prototype.slice.call(vedTable.querySelectorAll("tr.mwd-ved-row"));
  }

  function vedVisibleRows() {
    return vedRows().filter(function (row) {
      return !row.classList.contains("mwd-row-hidden");
    });
  }

  function vedQuery() {
    return vedSearch ? (vedSearch.value || "").trim().toLowerCase() : "";
  }

  function rowMatchesVedSearch(row, q) {
    if (!q) return true;
    var art = (row.getAttribute("data-art") || "").toLowerCase();
    var name = (row.getAttribute("data-name") || "").toLowerCase();
    var nameCell = row.cells && row.cells[2]
      ? (row.cells[2].textContent || "").toLowerCase()
      : "";
    return (
      art.indexOf(q) !== -1 ||
      name.indexOf(q) !== -1 ||
      nameCell.indexOf(q) !== -1
    );
  }

  function applyVedSearch(opts) {
    opts = opts || {};
    var q = vedQuery();
    var rows = vedRows();
    var n = 0;
    rows.forEach(function (row) {
      var hit = rowMatchesVedSearch(row, q);
      row.classList.toggle("mwd-row-hidden", !hit);
      if (hit) n += 1;
    });
    if (vedEmpty) vedEmpty.hidden = n > 0;
    if (vedCount) {
      vedCount.textContent = q
        ? "Найдено " + n + " из " + rows.length
        : "Позиций: " + rows.length;
    }
    lastVedClickIndex = -1;
    if (!opts.skipSave) {
      saveState({ vedSearch: vedSearch ? vedSearch.value || "" : "" });
    }
    updateVedPickBar();
  }

  function vedRowCb(row) {
    return row ? row.querySelector(".mwd-ved-cb") : null;
  }

  function isVedPicked(row) {
    var cb = vedRowCb(row);
    return !!(cb && cb.checked);
  }

  function setVedPicked(row, on) {
    if (!row) return;
    var cb = vedRowCb(row);
    if (cb) cb.checked = !!on;
    row.classList.toggle("is-picked", !!on);
  }

  function pickedVedRows() {
    return vedRows().filter(isVedPicked);
  }

  function syncVedCheckAll() {
    if (!vedCheckAll) return;
    var visible = vedVisibleRows();
    var n = visible.filter(isVedPicked).length;
    var all = visible.length > 0 && n === visible.length;
    vedCheckAll.checked = all;
    vedCheckAll.indeterminate = n > 0 && !all;
  }

  function updateVedPickBar() {
    var n = pickedVedRows().length;
    var has = n >= 1;
    if (vedPickCount) {
      vedPickCount.textContent = "Выбрано: " + n;
    }
    if (vedPickLabel) {
      vedPickLabel.textContent = has
        ? "Выбраны " + n + " товар" + (n === 1 ? "" : n < 5 ? "а" : "ов")
        : "Ничего не выбрано";
    }
    if (vedBulk) vedBulk.hidden = !vedSelectMode;
    if (vedBarNormal) vedBarNormal.hidden = vedSelectMode;
    if (vedEditBtn) vedEditBtn.disabled = !has;
    if (vedBulkArchBtn) {
      vedBulkArchBtn.disabled = !has;
      vedBulkArchBtn.setAttribute("aria-expanded", "false");
    }
    if (vedBulkArch) {
      vedBulkArch.classList.toggle("is-disabled", !has);
      vedBulkArch.classList.remove("is-open");
    }
    if (!has) syncVedArchBtnLabel();
    if (vedTable) vedTable.classList.toggle("is-select-mode", vedSelectMode);
    syncVedCheckAll();
  }

  function syncVedArchBtnLabel() {
    if (vedBulkArchTxt) vedBulkArchTxt.textContent = "Карточки в архив";
  }

  function setVedArchMenuOpen(on) {
    if (!vedBulkArch || !vedBulkArchBtn || vedBulkArch.classList.contains("is-disabled")) return;
    vedBulkArch.classList.toggle("is-open", !!on);
    vedBulkArchBtn.setAttribute("aria-expanded", on ? "true" : "false");
  }

  function clearVedPicks() {
    vedRows().forEach(function (row) {
      setVedPicked(row, false);
    });
    lastVedClickIndex = -1;
  }

  function setVedSelectMode(on) {
    vedSelectMode = !!on;
    if (!vedSelectMode) clearVedPicks();
    updateVedPickBar();
  }

  function normArchStatus(v) {
    return ARCH_STATUSES.indexOf(v) >= 0 ? v : "";
  }

  function rowArchStatus(row) {
    return row ? normArchStatus(row.getAttribute("data-arch") || "") : "";
  }

  function persistVedArch() {
    var map = {};
    vedRows().forEach(function (row) {
      var art = row.getAttribute("data-art") || "";
      if (!art) return;
      map[art] = rowArchStatus(row);
    });
    saved.vedArch = map;
    saveState({ vedArch: map });
  }

  function setRowArchStatus(row, status, opts) {
    opts = opts || {};
    if (!row) return;
    status = normArchStatus(status);
    if (status) row.setAttribute("data-arch", status);
    else row.removeAttribute("data-arch");
    if (!opts.skipRender) {
      persistVedArch();
      renderArchiveKanban();
    }
  }

  function restoreVedArch() {
    var savedMap =
      saved.vedArch && typeof saved.vedArch === "object" ? saved.vedArch : {};
    vedRows().forEach(function (row) {
      var art = row.getAttribute("data-art") || "";
      if (!Object.prototype.hasOwnProperty.call(savedMap, art)) return;
      var savedSt = normArchStatus(savedMap[art]);
      if (savedSt) row.setAttribute("data-arch", savedSt);
      else row.removeAttribute("data-arch");
    });
  }

  function renderArchiveKanban() {
    if (!archKanban) return;
    var buckets = { plan: [], remainder: [], archive: [] };
    var seen = {};
    vedRows().forEach(function (row) {
      var st = rowArchStatus(row);
      if (!buckets[st]) return;
      var art = row.getAttribute("data-art") || "";
      var name = row.getAttribute("data-name") || "";
      buckets[st].push({ art: art, name: name });
      if (art) seen[art] = true;
    });
    ARCHIVE_EXTRAS.forEach(function (item) {
      if (seen[item.art]) return;
      buckets.archive.push(item);
    });
    ARCH_STATUSES.forEach(function (st) {
      var col = archKanban.querySelector('[data-arch-col="' + st + '"]');
      if (!col) return;
      var nEl = col.querySelector("[data-arch-n]");
      var body = col.querySelector(".mwd-kanban-body");
      var items = buckets[st];
      if (nEl) nEl.textContent = "(" + items.length + ")";
      if (!body) return;
      if (!items.length) {
        body.innerHTML = '<div class="mwd-kanban-empty">пусто</div>';
        return;
      }
      body.innerHTML = items
        .map(function (item) {
          return (
            '<article class="mwd-card">' +
            '<div class="mwd-card-art">' +
            escapeAttr(item.art) +
            "</div>" +
            '<div class="mwd-card-name">' +
            escapeAttr(item.name) +
            "</div>" +
            "</article>"
          );
        })
        .join("");
    });
  }

  function applyArchToPicked(status) {
    var rows = pickedVedRows();
    if (!rows.length) {
      showToast("демо · ничего не выбрано");
      return;
    }
    status = status === "none" ? "" : normArchStatus(status);
    rows.forEach(function (row) {
      setRowArchStatus(row, status, { skipRender: true });
    });
    persistVedArch();
    renderArchiveKanban();
    var label = status ? ARCH_LABELS[status] : "снято";
    showToast("демо · архив «" + label + "»: " + rows.length);
  }

  function setVedRangePicked(fromIdx, toIdx, on) {
    var rows = vedVisibleRows();
    var a = Math.min(fromIdx, toIdx);
    var b = Math.max(fromIdx, toIdx);
    for (var i = a; i <= b; i++) setVedPicked(rows[i], on);
  }

  function shortQueueName(name) {
    var s = String(name || "").trim();
    if (s.length <= 22) return s;
    return s.slice(0, 21) + "…";
  }

  function renderQueueStrip() {
    if (!passQueueWrap) return;
    var show = currentPassMode === "edit" && editQueue.length > 0;
    passQueueWrap.hidden = !show;
    if (!show) return;

    if (passQueueChips) {
      passQueueChips.innerHTML = editQueue
        .map(function (item, i) {
          var cls = "mwd-pass-qchip";
          if (i === editQueueIndex) cls += " is-current";
          return (
            '<button type="button" class="' +
            cls +
            '" data-queue-i="' +
            i +
            '" title="' +
            escapeAttr(item.art + " · " + item.name) +
            '">' +
            escapeAttr(item.art) +
            " · " +
            escapeAttr(shortQueueName(item.name)) +
            "</button>"
          );
        })
        .join("");
    }
  }

  function showQueueItem(i, opts) {
    opts = opts || {};
    if (!editQueue.length) return;
    if (i < 0) i = 0;
    if (i > editQueue.length - 1) i = editQueue.length - 1;
    if (!opts.skipSave) saveCurrentDraft();
    editQueueIndex = i;
    var item = editQueue[i];
    var data = editQueueDrafts[item.art] || passportFor(item.art, item.name);
    fillPassport(data, { context: "ved" });
    activatePassTab("main");
    renderQueueStrip();
  }

  function startEditQueue(items) {
    items = (items || []).filter(function (it) {
      return it && it.art;
    });
    if (!items.length) {
      showToast("демо · ничего не выбрано");
      return;
    }
    saveCurrentDraft();
    editQueue = items;
    editQueueIndex = 0;
    queueDoneToastShown = false;
    activateScreen("passport", { skipHash: false });
    activateSub("pass");
    activatePassMode("edit");
    showQueueItem(0, { skipSave: true });
    showToast("демо · к правке " + items.length);
  }

  function openPassportFromRow(row) {
    if (!row) return;
    startEditQueue([
      {
        art: row.getAttribute("data-art") || "",
        name: row.getAttribute("data-name") || "",
      },
    ]);
  }

  function startQueueFromPicked() {
    startEditQueue(
      pickedVedRows().map(function (row) {
        return {
          art: row.getAttribute("data-art") || "",
          name: row.getAttribute("data-name") || "",
        };
      })
    );
  }

  if (vedTable) {
    vedTable.addEventListener("click", function (e) {
      var row = e.target.closest("tr.mwd-ved-row");
      if (!row || !vedTable.contains(row)) return;
      if (e.target.closest("a, button")) return;

      var rows = vedVisibleRows();
      var idx = rows.indexOf(row);
      var cb = vedRowCb(row);

      if (e.target === cb || e.target.closest(".mwd-ved-check")) {
        if (!vedSelectMode) return;
        if (e.target === cb) {
          row.classList.toggle("is-picked", cb.checked);
        } else {
          e.preventDefault();
          setVedPicked(row, !isVedPicked(row));
        }
        lastVedClickIndex = idx;
        updateVedPickBar();
        return;
      }

      if (e.detail > 1) return;

      if (vedSelectMode) {
        if (e.shiftKey && lastVedClickIndex >= 0 && idx >= 0) {
          e.preventDefault();
          setVedRangePicked(lastVedClickIndex, idx, true);
        } else if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          setVedPicked(row, !isVedPicked(row));
        } else {
          setVedPicked(row, !isVedPicked(row));
        }
        lastVedClickIndex = idx;
        updateVedPickBar();
        return;
      }

      lastVedClickIndex = idx;
      openPassportFromRow(row);
    });

    vedTable.addEventListener("dblclick", function (e) {
      var row = e.target.closest("tr.mwd-ved-row");
      if (!row || !vedTable.contains(row)) return;
      if (e.target.closest("a, button, .mwd-ved-check")) return;
      if (!vedSelectMode) return;
      e.preventDefault();
      openPassportFromRow(row);
    });
  }

  if (vedCheckAll) {
    vedCheckAll.addEventListener("click", function (e) {
      e.stopPropagation();
      if (!vedSelectMode) {
        e.preventDefault();
        return;
      }
      var wantAll = !vedVisibleRows().every(isVedPicked);
      e.preventDefault();
      vedVisibleRows().forEach(function (row) {
        setVedPicked(row, wantAll);
      });
      lastVedClickIndex = -1;
      updateVedPickBar();
    });
  }

  if (vedEnterSelect) {
    vedEnterSelect.addEventListener("click", function () {
      setVedSelectMode(true);
    });
  }

  if (vedEditBtn) {
    vedEditBtn.addEventListener("click", function () {
      startQueueFromPicked();
    });
  }

  if (vedClearPick) {
    vedClearPick.addEventListener("click", function () {
      setVedSelectMode(false);
    });
  }

  if (vedBulkArch && vedBulkArchBtn && vedBulkArchMenu) {
    vedBulkArchBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (vedBulkArchBtn.disabled) return;
      setVedArchMenuOpen(!vedBulkArch.classList.contains("is-open"));
    });
    vedBulkArchMenu.addEventListener("click", function (e) {
      var opt = e.target.closest("[data-value]");
      if (!opt || vedBulkArch.classList.contains("is-disabled")) return;
      var v = opt.getAttribute("data-value");
      if (!v) return;
      applyArchToPicked(v);
      syncVedArchBtnLabel();
      setVedArchMenuOpen(false);
    });
    document.addEventListener("click", function (e) {
      if (!vedBulkArch.contains(e.target)) setVedArchMenuOpen(false);
    });
    vedBulkArch.addEventListener("mouseleave", function () {
      setVedArchMenuOpen(false);
    });
    syncVedArchBtnLabel();
  }

  if (passQueueChips) {
    passQueueChips.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-queue-i]");
      if (!btn) return;
      var i = parseInt(btn.getAttribute("data-queue-i"), 10);
      if (!isFinite(i)) return;
      showQueueItem(i);
    });
  }

  if (vedSearch) {
    vedSearch.addEventListener("input", function () {
      applyVedSearch();
    });
  }
  applyVedSearch({ skipSave: true });
  restoreVedArch();
  renderArchiveKanban();
  setVedSelectMode(false);

  // ── Контроль карточек: матрица + задачи ──
  var CARDS_CAB_ORDER = [
    "Озон ГАА",
    "Озон ЧМА",
    "Озон ЧИА",
    "Озон ООО",
    "ВБ ГАА",
    "ВБ ЧМА",
    "ВБ ЧИА",
    "ВБ ООО",
  ];

  var cardsMatrix = document.getElementById("mwd-cards-matrix");
  var cardsSeg = document.getElementById("mwd-cards-seg");
  var cardsTasksCount = document.getElementById("mwd-cards-tasks-count");
  var cardsTasksTbody = document.getElementById("mwd-cards-tasks-tbody");
  var cardsTasksEmpty = document.getElementById("mwd-cards-tasks-empty");
  var cardsTaskModal = document.getElementById("mwd-cards-task-modal");
  var cardsTaskClose = document.getElementById("mwd-cards-task-close");
  var cardsTaskSubmit = document.getElementById("mwd-cards-task-submit");
  var cardsTaskProduct = document.getElementById("mwd-cards-task-product");
  var cardsTaskCabinet = document.getElementById("mwd-cards-task-cabinet");
  var cardsTaskReason = document.getElementById("mwd-cards-task-reason");
  var cardsTaskManager = document.getElementById("mwd-cards-task-manager");
  var cardsTaskComment = document.getElementById("mwd-cards-task-comment");
  var cardsTaskSub = document.getElementById("mwd-cards-task-sub");
  var cardsTaskCtx = null;

  function escapeAttr(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;");
  }

  function cardsCellStatus(td) {
    return td ? td.getAttribute("data-st") || "" : "";
  }

  function setCardsCell(td, st, tip, prevSt) {
    if (!td) return;
    td.setAttribute("data-st", st);
    if (prevSt) td.setAttribute("data-prev", prevSt);
    else if (st !== "wait") td.removeAttribute("data-prev");
    td.classList.toggle("is-clickable", st === "no" || st === "swap" || st === "wait");
    var title = tip ? ' title="' + escapeAttr(tip) + '"' : "";
    if (st === "ok") {
      td.innerHTML = '<span class="mwd-badge mwd-badge-ok">да</span>';
    } else if (st === "wait") {
      td.innerHTML =
        '<span class="mwd-badge mwd-badge-wait"' + title + ">в работе</span>";
    } else if (st === "swap") {
      td.innerHTML = '<span class="mwd-badge mwd-badge-swap">замена</span>';
    } else {
      td.innerHTML = '<span class="mwd-badge mwd-badge-warn">нет</span>';
    }
  }

  function annotateCardsMatrix() {
    if (!cardsMatrix) return;
    cardsMatrix.querySelectorAll("tr.mwd-cards-row").forEach(function (row) {
      row.querySelectorAll("td.mwd-cards-st").forEach(function (td, i) {
        td.setAttribute("data-cab", CARDS_CAB_ORDER[i] || "");
        var txt = (td.textContent || "").replace(/\s+/g, " ").trim();
        if (txt.indexOf("в работе") === 0) {
          td.setAttribute("data-st", "wait");
          td.classList.add("is-clickable");
          if (!td.getAttribute("data-prev")) td.setAttribute("data-prev", "нет");
        } else if (txt === "да") {
          td.setAttribute("data-st", "ok");
        } else if (txt === "замена") {
          td.setAttribute("data-st", "swap");
          td.classList.add("is-clickable");
        } else {
          td.setAttribute("data-st", "no");
          td.classList.add("is-clickable");
        }
      });
    });
  }

  function findCardsCell(row, cab) {
    if (!row) return null;
    var cells = row.querySelectorAll("td.mwd-cards-st");
    for (var i = 0; i < cells.length; i++) {
      if (cells[i].getAttribute("data-cab") === cab) return cells[i];
    }
    return null;
  }

  function findCardsRow(art) {
    if (!cardsMatrix) return null;
    return cardsMatrix.querySelector('tr.mwd-cards-row[data-art="' + art + '"]');
  }

  function refreshTasksCount() {
    var n = cardsTasksTbody
      ? cardsTasksTbody.querySelectorAll("tr").length
      : 0;
    if (cardsTasksCount) {
      cardsTasksCount.textContent = n ? String(n) : "";
      cardsTasksCount.hidden = n === 0;
    }
    if (cardsTasksEmpty) cardsTasksEmpty.hidden = n > 0;
    var table = document.getElementById("mwd-cards-tasks-table");
    if (table) table.hidden = n === 0;
  }

  function activateCardsView(view) {
    if (view !== "control" && view !== "tasks") view = "control";
    root.querySelectorAll("#mwd-cards-seg .mwd-seg-btn").forEach(function (btn) {
      var on = btn.getAttribute("data-cards-view") === view;
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-selected", on ? "true" : "false");
    });
    root.querySelectorAll(".mwd-cards-view").forEach(function (panel) {
      var on = panel.getAttribute("data-cards-panel") === view;
      panel.classList.toggle("is-active", on);
      panel.hidden = !on;
    });
  }

  function showCardsTasksView() {
    activateCardsView("tasks");
  }

  function findTaskRow(art, cab) {
    if (!cardsTasksTbody) return null;
    var rows = cardsTasksTbody.querySelectorAll("tr");
    for (var i = 0; i < rows.length; i++) {
      if (
        rows[i].getAttribute("data-art") === art &&
        rows[i].getAttribute("data-cab") === cab
      ) {
        return rows[i];
      }
    }
    return null;
  }

  function reasonBadgeHtml(reason) {
    if (reason === "замена") {
      return '<span class="mwd-badge mwd-badge-swap">замена</span>';
    }
    return '<span class="mwd-badge mwd-badge-warn">нет</span>';
  }

  var cardsTasksDateSort = "desc"; // новые сверху по умолчанию
  var cardsTasksSortBtn = document.getElementById("mwd-cards-tasks-sort-date");

  function pad2(n) {
    return n < 10 ? "0" + n : String(n);
  }

  function todayIso() {
    var d = new Date();
    return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
  }

  function formatRuDate(iso) {
    var m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return iso || "—";
    return m[3] + "." + m[2] + "." + m[1];
  }

  function syncTasksSortBtn() {
    if (!cardsTasksSortBtn) return;
    var desc = cardsTasksDateSort === "desc";
    cardsTasksSortBtn.classList.toggle("is-desc", desc);
    cardsTasksSortBtn.classList.toggle("is-asc", !desc);
    var ico = cardsTasksSortBtn.querySelector(".mwd-th-sort-ico");
    if (ico) ico.textContent = desc ? "▼" : "▲";
    cardsTasksSortBtn.title = desc
      ? "Сейчас: новые сверху · клик — старые сверху"
      : "Сейчас: старые сверху · клик — новые сверху";
  }

  function sortTasksByDate() {
    if (!cardsTasksTbody) return;
    var rows = Array.prototype.slice.call(
      cardsTasksTbody.querySelectorAll("tr")
    );
    rows.sort(function (a, b) {
      var da = a.getAttribute("data-date") || "";
      var db = b.getAttribute("data-date") || "";
      if (da === db) return 0;
      if (cardsTasksDateSort === "desc") return da < db ? 1 : -1;
      return da < db ? -1 : 1;
    });
    rows.forEach(function (tr) {
      cardsTasksTbody.appendChild(tr);
    });
    syncTasksSortBtn();
  }

  function addTaskRow(art, name, cab, reason, manager, comment) {
    if (!cardsTasksTbody) return;
    if (findTaskRow(art, cab)) return;
    var iso = todayIso();
    var tr = document.createElement("tr");
    tr.setAttribute("data-art", art);
    tr.setAttribute("data-cab", cab);
    tr.setAttribute("data-reason", reason || "нет");
    tr.setAttribute("data-date", iso);
    tr.innerHTML =
      "<td></td>" +
      '<td class="mwd-art"></td>' +
      "<td></td>" +
      "<td></td>" +
      "<td>" +
      reasonBadgeHtml(reason) +
      "</td>" +
      "<td></td>" +
      "<td></td>" +
      '<td class="mwd-cards-task-acts">' +
      '<button type="button" class="mwd-btn mwd-btn-sm" data-task-done>заведена</button> ' +
      '<button type="button" class="mwd-btn mwd-btn-sm" data-task-cancel>снять</button>' +
      "</td>";
    tr.children[0].textContent = formatRuDate(iso);
    tr.children[1].textContent = art;
    tr.children[2].textContent = name;
    tr.children[3].textContent = cab;
    tr.children[5].textContent = manager || "";
    tr.children[6].textContent = comment || "—";
    // новые сверху при сортировке desc
    if (cardsTasksDateSort === "desc" && cardsTasksTbody.firstChild) {
      cardsTasksTbody.insertBefore(tr, cardsTasksTbody.firstChild);
    } else if (cardsTasksDateSort === "desc") {
      cardsTasksTbody.appendChild(tr);
    } else {
      cardsTasksTbody.appendChild(tr);
      sortTasksByDate();
    }
    refreshTasksCount();
  }

  function removeTaskRow(art, cab) {
    var tr = findTaskRow(art, cab);
    if (tr) tr.remove();
    refreshTasksCount();
  }

  function openCardsTaskModal(ctx) {
    if (!cardsTaskModal) return;
    cardsTaskCtx = ctx;
    if (cardsTaskProduct) {
      cardsTaskProduct.value = (ctx.art || "") + " · " + (ctx.name || "");
    }
    if (cardsTaskCabinet) cardsTaskCabinet.value = ctx.cab || "";
    if (cardsTaskReason) cardsTaskReason.value = ctx.reason || "нет";
    if (cardsTaskComment) cardsTaskComment.value = "";
    if (cardsTaskSub) {
      cardsTaskSub.textContent =
        "Кабинет «" +
        (ctx.cab || "") +
        "» · " +
        (ctx.reason || "нет") +
        " — передайте задачу менеджеру.";
    }
    if (cardsTaskManager) {
      var opts = cardsTaskManager.options;
      var preferWb = (ctx.cab || "").indexOf("ВБ") === 0;
      for (var i = 0; i < opts.length; i++) {
        var v = opts[i].value || "";
        if (preferWb && v.indexOf("ЧМА") >= 0) {
          cardsTaskManager.selectedIndex = i;
          break;
        }
        if (!preferWb && (v.indexOf("Д&С") >= 0 || v.indexOf("Хозснаб") >= 0)) {
          cardsTaskManager.selectedIndex = i;
          break;
        }
      }
    }
    cardsTaskModal.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeCardsTaskModal() {
    if (!cardsTaskModal) return;
    cardsTaskModal.hidden = true;
    document.body.style.overflow = "";
    cardsTaskCtx = null;
  }

  function resolveCardsTask(art, cab, toOk) {
    var row = findCardsRow(art);
    var cell = findCardsCell(row, cab);
    var prev = cell ? cell.getAttribute("data-prev") || "нет" : "нет";
    if (toOk) {
      setCardsCell(cell, "ok");
    } else {
      setCardsCell(cell, prev === "замена" ? "swap" : "no");
    }
    removeTaskRow(art, cab);
    showToast(
      toOk
        ? "демо · заведена · " + cab
        : "демо · задача снята · " + cab
    );
  }

  annotateCardsMatrix();
  refreshTasksCount();
  syncTasksSortBtn();

  if (cardsTasksSortBtn) {
    cardsTasksSortBtn.addEventListener("click", function () {
      cardsTasksDateSort = cardsTasksDateSort === "desc" ? "asc" : "desc";
      sortTasksByDate();
    });
  }

  if (cardsMatrix) {
    cardsMatrix.querySelectorAll("tr.mwd-cards-row").forEach(function (row) {
      row.addEventListener("click", function (e) {
        if (e.target.closest("td.mwd-cards-st")) return;
        openPassportFromRow(row);
      });
    });

    cardsMatrix.addEventListener("click", function (e) {
      var td = e.target.closest("td.mwd-cards-st");
      if (!td || !cardsMatrix.contains(td)) return;
      var st = cardsCellStatus(td);
      if (st !== "no" && st !== "swap" && st !== "wait") return;
      e.stopPropagation();
      var row = td.closest("tr.mwd-cards-row");
      if (!row) return;
      var art = row.getAttribute("data-art") || "";
      var name = row.getAttribute("data-name") || "";
      var cab = td.getAttribute("data-cab") || "";
      if (st === "wait") {
        if (
          window.confirm(
            "Отметить карточку заведённой?\n" + art + " · " + cab
          )
        ) {
          resolveCardsTask(art, cab, true);
        }
        return;
      }
      if (findTaskRow(art, cab)) {
        showToast("демо · задача уже есть");
        showCardsTasksView();
        return;
      }
      openCardsTaskModal({
        art: art,
        name: name,
        cab: cab,
        reason: st === "swap" ? "замена" : "нет",
        td: td,
        row: row,
      });
    });
  }

  if (cardsSeg) {
    cardsSeg.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-cards-view]");
      if (!btn || !cardsSeg.contains(btn)) return;
      activateCardsView(btn.getAttribute("data-cards-view"));
    });
  }

  if (cardsTasksTbody) {
    cardsTasksTbody.addEventListener("click", function (e) {
      var done = e.target.closest("[data-task-done]");
      var cancel = e.target.closest("[data-task-cancel]");
      if (!done && !cancel) return;
      var tr = e.target.closest("tr");
      if (!tr) return;
      resolveCardsTask(
        tr.getAttribute("data-art") || "",
        tr.getAttribute("data-cab") || "",
        !!done
      );
    });
  }

  if (cardsTaskClose) {
    cardsTaskClose.addEventListener("click", closeCardsTaskModal);
  }
  if (cardsTaskModal) {
    cardsTaskModal.addEventListener("click", function (e) {
      if (e.target === cardsTaskModal) closeCardsTaskModal();
    });
  }
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && cardsTaskModal && !cardsTaskModal.hidden) {
      closeCardsTaskModal();
    }
  });
  if (cardsTaskSubmit) {
    cardsTaskSubmit.addEventListener("click", function () {
      if (!cardsTaskCtx) return;
      var manager =
        (cardsTaskManager && cardsTaskManager.value) || "менеджер";
      var comment = (cardsTaskComment && cardsTaskComment.value) || "";
      var reason = cardsTaskCtx.reason || "нет";
      setCardsCell(
        cardsTaskCtx.td,
        "wait",
        [manager, comment].filter(Boolean).join(" · "),
        reason
      );
      addTaskRow(
        cardsTaskCtx.art,
        cardsTaskCtx.name,
        cardsTaskCtx.cab,
        reason,
        manager,
        comment
      );
      showCardsTasksView();
      showToast("демо · задача → " + manager + " · " + cardsTaskCtx.cab);
      closeCardsTaskModal();
    });
  }

  // ── Create article modal ──
  var createArtModal = document.getElementById("mwd-create-art-modal");
  var createArtClose = document.getElementById("mwd-create-art-close");
  var createArtSubmit = document.getElementById("mwd-create-art-submit");
  var createArtCabinet = document.getElementById("mwd-create-art-cabinet");

  function openCreateArtModal() {
    if (!createArtModal) return;
    var ndsEl = root.querySelector('[data-pass-field="nds"]');
    syncCreateArtCabinetOptions(normalizeNds((ndsEl && ndsEl.value) || ""));
    createArtModal.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeCreateArtModal() {
    if (!createArtModal) return;
    createArtModal.hidden = true;
    document.body.style.overflow = "";
  }

  if (createArtBtn) {
    createArtBtn.addEventListener("click", function () {
      var missing = missingRequired();
      if (missing.length) {
        passCreateAttempted = true;
        updatePassSubmitState();
        jumpToRequired(missing[0].key);
        return;
      }
      openCreateArtModal();
    });
  }
  if (createArtClose) {
    createArtClose.addEventListener("click", closeCreateArtModal);
  }
  if (createArtModal) {
    createArtModal.addEventListener("click", function (e) {
      if (e.target === createArtModal) closeCreateArtModal();
    });
  }
  if (createArtCabinet) {
    createArtCabinet.addEventListener("change", function () {
      updateCreateArtPreview();
    });
  }
  if (createArtSubmit) {
    createArtSubmit.addEventListener("click", function () {
      if (createArtSubmit.disabled) return;
      var cab = (createArtCabinet && createArtCabinet.value) || "";
      var name = (createArtPreview && createArtPreview.value) || "";
      showToast("демо · " + [cab, name].filter(Boolean).join(" · "));
      closeCreateArtModal();
    });
  }
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && createArtModal && !createArtModal.hidden) {
      closeCreateArtModal();
    }
  });

  // ── Passport mode chips ──
  function activatePassMode(mode, opts) {
    opts = opts || {};
    if (VALID_PASS_MODES.indexOf(mode) < 0) mode = "new";
    currentPassMode = mode;
    root.querySelectorAll("[data-pass-mode]").forEach(function (c) {
      c.classList.toggle("is-active", c.getAttribute("data-pass-mode") === mode);
    });
    if (!opts.skipSave) saveState({ passMode: mode });
    renderQueueStrip();
    updatePassContext();
  }

  root.querySelectorAll("[data-pass-mode]").forEach(function (chip) {
    chip.addEventListener("click", function () {
      var mode = chip.getAttribute("data-pass-mode");
      if (mode === "new") {
        if (editQueue.length) saveCurrentDraft();
        activatePassMode("new");
        fillPassport(emptyPassport(), { context: "manual" });
        activatePassTab("main");
        showToast("демо · новый товар");
        return;
      }
      activatePassMode("edit");
      if (editQueue.length) {
        showQueueItem(editQueueIndex, { skipSave: true });
        showToast("демо · редакция · очередь " + editQueue.length);
        return;
      }
      showToast("демо · отметьте товары в ведомости");
    });
  });

  // Старт всегда «Новый товар»; «Редакция» только после клика из ведомости
  activatePassMode("new", { skipSave: true });

  // ── Purchase: статус закупки + тип сборки + клик-фильтр связей ──
  var purchaseSelect = document.getElementById("mwd-purchase-status");
  var purchaseMode = document.getElementById("mwd-purchase-mode");
  var purchaseTable = document.getElementById("mwd-purchase-table");
  var purLinkFilterEl = document.getElementById("mwd-pur-link-filter");
  var purLinkFilterTitle = document.getElementById("mwd-pur-link-filter-title");
  var purLinkFilterText = document.getElementById("mwd-pur-link-filter-text");
  var purLinkFilterClear = document.getElementById("mwd-pur-link-filter-clear");
  var PUR_MODES = ["kit", "donor"];
  // { focusArt, arts: string[], mode: "component"|"kit" } | null
  var purLinkFilter = null;

  function purMainRows() {
    if (!purchaseTable) return [];
    return Array.prototype.slice.call(
      purchaseTable.querySelectorAll("tbody tr.mwd-pur-row")
    );
  }

  function purRowArt(row) {
    if (!row) return "";
    return normArticle(
      row.getAttribute("data-art") ||
        ((row.querySelector(".mwd-art") || {}).textContent || "")
    );
  }

  function purRowName(row) {
    if (!row) return "";
    var el = row.querySelector(".mwd-pur-name");
    return ((el && el.textContent) || "").trim();
  }

  function shortPurName(name) {
    var s = String(name || "").trim();
    s = s.replace(/\s*\([^)]*\)\s*(С-Р)?\s*$/i, "").trim();
    if (s.length > 42) s = s.slice(0, 40) + "…";
    return s || "—";
  }

  function clearPurLinkFilter(opts) {
    opts = opts || {};
    purLinkFilter = null;
    if (purLinkFilterEl) purLinkFilterEl.hidden = true;
    if (purLinkFilterText) purLinkFilterText.textContent = "";
    purMainRows().forEach(function (row) {
      row.classList.remove("is-asm-focus", "is-asm-related");
    });
    if (!opts.skipApply) applyPurchaseFilter();
  }

  function buildPurLinkFilterBanner(focusArt, relatedArts, mode) {
    var focusRow = null;
    purMainRows().forEach(function (row) {
      if (purRowArt(row) === focusArt) focusRow = row;
    });
    var focusName = shortPurName(purRowName(focusRow));
    if (mode === "component") {
      var parts = [];
      relatedArts.forEach(function (art) {
        if (art === focusArt) return;
        var kitRow = null;
        purMainRows().forEach(function (row) {
          if (purRowArt(row) === art) kitRow = row;
        });
        if (!kitRow) return;
        parts.push(shortPurName(purRowName(kitRow)));
      });
      return {
        title: "Сборки с этим товаром",
        text:
          focusName +
          (parts.length ? " → " + parts.join(" + ") : " · связанные сборки"),
      };
    }
    var bits = [];
    relatedArts.forEach(function (art) {
      if (art === focusArt) return;
      var partRow = null;
      purMainRows().forEach(function (row) {
        if (purRowArt(row) === art) partRow = row;
      });
      if (!partRow) {
        bits.push(art);
        return;
      }
      bits.push(shortPurName(purRowName(partRow)) + " (" + art + ")");
    });
    return {
      title: "Состав комплекта",
      text:
        focusName +
        (bits.length ? " → " + bits.join(", ") : " · состав по названию"),
    };
  }

  function setPurLinkFilterFromRow(row) {
    if (!row) return;
    var art = purRowArt(row);
    if (!art) return;
    var usedIn = String(row.getAttribute("data-used-in") || "")
      .split(",")
      .map(normArticle)
      .filter(Boolean);
    var related = String(row.getAttribute("data-related") || "")
      .split(",")
      .map(normArticle)
      .filter(Boolean);
    var kind = row.getAttribute("data-kind") || "";
    var mode = "";
    var arts = [art];
    if (kind === "donor" || kind === "component") {
      if (!usedIn.length) {
        showToast("не входит в сборки");
        return;
      }
      mode = "component";
      usedIn.forEach(function (a) {
        if (arts.indexOf(a) < 0) arts.push(a);
      });
    } else if (kind === "kit") {
      if (!related.length) {
        showToast("состав не найден");
        return;
      }
      mode = "kit";
      related.forEach(function (a) {
        if (arts.indexOf(a) < 0) arts.push(a);
      });
    } else {
      showToast("не комплект и не комплектующая");
      return;
    }
    if (
      purLinkFilter &&
      purLinkFilter.focusArt === art &&
      purLinkFilter.mode === mode
    ) {
      clearPurLinkFilter();
      return;
    }
    if (purchaseMode && purchaseMode.value) purchaseMode.value = "";
    if (purchaseSelect && purchaseSelect.value) purchaseSelect.value = "";
    purLinkFilter = { focusArt: art, arts: arts, mode: mode };
    var banner = buildPurLinkFilterBanner(art, arts, mode);
    if (purLinkFilterTitle) purLinkFilterTitle.textContent = banner.title;
    if (purLinkFilterText) purLinkFilterText.textContent = banner.text;
    if (purLinkFilterEl) purLinkFilterEl.hidden = false;
    applyPurchaseFilter();
  }

  function applyPurchaseFilter() {
    if (!purchaseTable) return;
    var val = purchaseSelect ? purchaseSelect.value : "";
    var mode = purchaseMode ? purchaseMode.value || "" : "";
    purMainRows().forEach(function (tr) {
      var st = tr.getAttribute("data-status") || "";
      var kind = tr.getAttribute("data-kind") || "";
      var art = purRowArt(tr);
      var okStatus = !val || st === val;
      var okMode = !mode || kind === mode;
      var okLink = !purLinkFilter || purLinkFilter.arts.indexOf(art) >= 0;
      var visible = okStatus && okMode && okLink;
      tr.classList.toggle("mwd-row-hidden", !visible);
      tr.classList.toggle(
        "is-asm-focus",
        !!(purLinkFilter && purLinkFilter.focusArt === art)
      );
      tr.classList.toggle(
        "is-asm-related",
        !!(
          purLinkFilter &&
          purLinkFilter.focusArt !== art &&
          purLinkFilter.arts.indexOf(art) >= 0
        )
      );
    });
  }

  if (purchaseSelect && purchaseTable) {
    if (typeof saved.purchaseStatus === "string") {
      purchaseSelect.value = saved.purchaseStatus;
    }
    purchaseSelect.addEventListener("change", function () {
      applyPurchaseFilter();
      saveState({ purchaseStatus: purchaseSelect.value });
    });
  }
  if (purchaseMode && purchaseTable) {
    if (saved.purchaseMode === "all") purchaseMode.value = "";
    else if (PUR_MODES.indexOf(saved.purchaseMode) >= 0) {
      purchaseMode.value = saved.purchaseMode;
    }
    purchaseMode.addEventListener("change", function () {
      applyPurchaseFilter();
      saveState({ purchaseMode: purchaseMode.value || "" });
    });
  }
  if (purchaseTable) {
    if (purLinkFilterClear) {
      purLinkFilterClear.addEventListener("click", function () {
        clearPurLinkFilter();
        saveState({
          purchaseStatus: purchaseSelect ? purchaseSelect.value : "",
          purchaseMode: purchaseMode ? purchaseMode.value || "" : "",
        });
      });
    }
    applyPurchaseFilter();
  }

  // ── Карточка поставщика (модалка) ──
  var SUPPLIER_CARDS = {
    energo: {
      name: "ООО «Энергопак»",
      inn: "7701234567",
      city: "Москва",
      contact: "Петров А. С. · +7 495 123-45-67",
      pay: "отсрочка 14 дней",
      lead: "5–7 дней",
      since: "март 2023",
      ontime: "96%",
      yearSum: "412 000 ₽",
      note: "Основной по батарейкам. Партии ровные, брак почти не бывает.",
      claims: [],
      orders: [
        { date: "12.08.2026", num: "З-118", sku: "650975", qty: "400 шт", sum: "18 000 ₽", st: "оприходован" },
        { date: "15.07.2026", num: "З-091", sku: "650975", qty: "300 шт", sum: "13 500 ₽", st: "оприходован" },
        { date: "03.06.2026", num: "З-062", sku: "650975", qty: "500 шт", sum: "22 500 ₽", st: "оприходован" }
      ]
    },
    smirnova: {
      name: "ИП Смирнова",
      inn: "503812345678",
      city: "Подольск",
      contact: "Смирнова Е. В. · +7 916 200-11-22",
      pay: "предоплата 50%",
      lead: "10–14 дней",
      since: "ноябрь 2024",
      ontime: "78%",
      yearSum: "86 400 ₽",
      note: "Маленькие партии, иногда срывает срок на 3–5 дней. Перед заказом лучше звонить.",
      claims: ["18.05.2026 — мятая упаковка, 6 шт. Заменили без спора."],
      orders: [
        { date: "28.07.2026", num: "З-104", sku: "91044", qty: "80 шт", sum: "20 320 ₽", st: "оприходован" },
        { date: "02.06.2026", num: "З-058", sku: "91044", qty: "50 шт", sum: "12 700 ₽", st: "оприходован" }
      ]
    },
    hoztorg: {
      name: "ООО «ХозТорг»",
      inn: "7728123456",
      city: "Котельники",
      contact: "Иванова Н. П. · +7 495 988-00-11",
      pay: "отсрочка 21 день",
      lead: "3–5 дней",
      since: "январь 2022",
      ontime: "91%",
      yearSum: "1 240 000 ₽",
      note: "Крупный хоз. поставщик: грабберы, вёдра, сопутствующее. Можно собирать микс в одной машине.",
      claims: [],
      orders: [
        { date: "08.08.2026", num: "З-115", sku: "55110, 8801", qty: "200 шт", sum: "42 800 ₽", st: "оприходован" },
        { date: "20.07.2026", num: "З-097", sku: "8801", qty: "120 шт", sum: "11 400 ₽", st: "оприходован" },
        { date: "11.06.2026", num: "З-071", sku: "55110", qty: "80 шт", sum: "14 640 ₽", st: "оприходован" }
      ]
    },
    paklin: {
      name: "ООО «ПакЛин»",
      inn: "5001123456",
      city: "Ногинск",
      contact: "Кузнецов И. А. · +7 496 555-30-30",
      pay: "отсрочка 14 дней",
      lead: "4–6 дней",
      since: "август 2021",
      ontime: "98%",
      yearSum: "640 000 ₽",
      note: "Мешки 60 л — регулярный SKU. Цена держится, приход без сюрпризов.",
      claims: [],
      orders: [
        { date: "10.08.2026", num: "З-116", sku: "730077", qty: "400 шт", sum: "16 800 ₽", st: "оприходован" },
        { date: "12.07.2026", num: "З-088", sku: "730077", qty: "350 шт", sum: "14 700 ₽", st: "оприходован" },
        { date: "09.06.2026", num: "З-067", sku: "730077", qty: "300 шт", sum: "12 600 ₽", st: "оприходован" }
      ]
    },
    kanc: {
      name: "ООО «КанцОпт»",
      inn: "7719123456",
      city: "Москва",
      contact: "Орлова Т. Д. · +7 495 700-40-50",
      pay: "отсрочка 7 дней",
      lead: "7–10 дней",
      since: "апрель 2024",
      ontime: "88%",
      yearSum: "210 000 ₽",
      note: "Сезон: школьные дневники. Сейчас партия в пути — новый заказ не дублировать.",
      claims: [],
      orders: [
        { date: "14.08.2026", num: "З-119", sku: "120569", qty: "150 шт", sum: "11 700 ₽", st: "в пути" },
        { date: "22.07.2026", num: "З-099", sku: "120569", qty: "200 шт", sum: "15 600 ₽", st: "оприходован" }
      ]
    },
    textil: {
      name: "ООО «ТекстильПро»",
      inn: "6164123456",
      city: "Ростов-на-Дону",
      contact: "Магомедов Р. Х. · +7 863 210-08-08",
      pay: "предоплата 100%",
      lead: "12–18 дней (фура)",
      since: "февраль 2023",
      ontime: "84%",
      yearSum: "390 000 ₽",
      note: "Дешёвая микрофибра, но едет долго. Заказывать заранее, не впритык.",
      claims: ["03.04.2026 — пересорт цвета, 40 шт. Вернули, зачёт в следующий заказ."],
      orders: [
        { date: "01.08.2026", num: "З-110", sku: "2204", qty: "600 шт", sum: "13 200 ₽", st: "оприходован" },
        { date: "06.06.2026", num: "З-064", sku: "2204", qty: "500 шт", sum: "11 000 ₽", st: "оприходован" }
      ]
    },
    accessory: {
      name: "ООО «Аксессуар»",
      inn: "7743123456",
      city: "Москва",
      contact: "Белов Д. Ю. · +7 499 321-00-77",
      pay: "отсрочка 10 дней",
      lead: "6–8 дней",
      since: "май 2025",
      ontime: "93%",
      yearSum: "54 000 ₽",
      note: "Новый поставщик сборок (бампер + плёнка). Пока мало истории — смотреть качество первой партии.",
      claims: [],
      orders: [
        { date: "05.08.2026", num: "З-113", sku: "66201-KIT", qty: "40 шт", sum: "8 400 ₽", st: "оприходован" },
        { date: "19.06.2026", num: "З-074", sku: "66201-KIT", qty: "30 шт", sum: "6 300 ₽", st: "оприходован" }
      ]
    }
  };

  var supplierModal = document.getElementById("mwd-supplier-modal");
  var supplierClose = document.getElementById("mwd-supplier-close");
  var supplierTitle = document.getElementById("mwd-supplier-title");
  var supplierCard = document.getElementById("mwd-supplier-card");

  function closeSupplierModal() {
    if (!supplierModal) return;
    supplierModal.hidden = true;
    document.body.style.overflow = "";
  }

  function openSupplierModal(key) {
    var s = SUPPLIER_CARDS[key];
    if (!s || !supplierModal || !supplierCard) return;
    if (supplierTitle) supplierTitle.textContent = s.name;
    var facts = [
      ["ИНН", s.inn],
      ["Город", s.city],
      ["Контакт", s.contact],
      ["Оплата", s.pay],
      ["Срок поставки", s.lead],
      ["Работаем с", s.since],
      ["Вовремя", s.ontime],
      ["Закуп 2026", s.yearSum]
    ];
    var factsHtml = facts
      .map(function (f) {
        return (
          '<div class="mwd-sup-fact"><div class="mwd-sup-fact-lab">' +
          f[0] +
          '</div><div class="mwd-sup-fact-val">' +
          f[1] +
          "</div></div>"
        );
      })
      .join("");
    var orderRows = s.orders
      .map(function (o) {
        return (
          "<tr><td>" +
          o.date +
          '</td><td class="mwd-art">' +
          o.num +
          "</td><td>" +
          o.sku +
          '</td><td class="num">' +
          o.qty +
          '</td><td class="num">' +
          o.sum +
          "</td><td>" +
          o.st +
          "</td></tr>"
        );
      })
      .join("");
    var claimsHtml = s.claims.length
      ? s.claims
          .map(function (c) {
            return '<p class="mwd-sup-claim">' + c + "</p>";
          })
          .join("")
      : '<p class="mwd-sup-empty">претензий нет</p>';
    supplierCard.innerHTML =
      '<div class="mwd-sup-facts">' +
      factsHtml +
      "</div>" +
      '<h4 class="mwd-sup-h">История заказов</h4>' +
      '<div class="mwd-table-wrap"><table class="mwd-table"><thead><tr>' +
      "<th>Дата</th><th>№</th><th>Артикул</th><th class=\"num\">Кол-во</th><th class=\"num\">Сумма</th><th>Статус</th>" +
      "</tr></thead><tbody>" +
      orderRows +
      "</tbody></table></div>" +
      '<h4 class="mwd-sup-h">Претензии</h4>' +
      claimsHtml +
      '<h4 class="mwd-sup-h">Заметка</h4>' +
      '<p class="mwd-sup-note">' +
      s.note +
      "</p>";
    supplierModal.hidden = false;
    document.body.style.overflow = "hidden";
  }

  if (purchaseTable) {
    purchaseTable.addEventListener("click", function (e) {
      var btn = e.target.closest(".mwd-sup-link");
      if (btn && purchaseTable.contains(btn)) {
        openSupplierModal(btn.getAttribute("data-supplier") || "");
        return;
      }
      var row = e.target.closest("tr.mwd-pur-row");
      if (!row || !row.classList.contains("mwd-sa-asm-clickable")) return;
      setPurLinkFilterFromRow(row);
    });
  }
  if (supplierClose) {
    supplierClose.addEventListener("click", closeSupplierModal);
  }
  if (supplierModal) {
    supplierModal.addEventListener("click", function (e) {
      if (e.target === supplierModal) closeSupplierModal();
    });
  }
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    var preorderModalEsc = document.getElementById("mwd-preorder-modal");
    if (preorderModalEsc && !preorderModalEsc.hidden) {
      closePreorderModal();
      return;
    }
    if (supplierModal && !supplierModal.hidden) {
      closeSupplierModal();
    }
  });

  // ── Предзаказ: печать / Excel по поставщикам ──
  var preorderModal = document.getElementById("mwd-preorder-modal");
  var preorderClose = document.getElementById("mwd-preorder-close");
  var preorderSheets = document.getElementById("mwd-preorder-sheets");
  var preorderPrintBtn = document.getElementById("mwd-preorder-print");
  var preorderExcelBtn = document.getElementById("mwd-preorder-excel");
  var preorderOpenBtn = document.getElementById("mwd-purchase-preorder");
  var lastPreorderGroups = [];

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function cellText(tr, n) {
    var td = tr.children[n];
    return td ? (td.textContent || "").replace(/\s+/g, " ").trim() : "";
  }

  function parseQty(text) {
    var t = String(text || "").replace(/[\s\u00a0\u202f]/g, "").replace(/[—–−-]/g, "");
    if (!t) return 0;
    var n = parseInt(t.replace(/\D/g, ""), 10);
    return isNaN(n) ? 0 : n;
  }

  function parseMoney(text) {
    var t = String(text || "")
      .replace(/[\s\u00a0\u202f]/g, "")
      .replace("₽", "")
      .replace(",", ".");
    var n = parseFloat(t.replace(/[^\d.]/g, ""));
    return isNaN(n) ? 0 : n;
  }

  function formatMoney(n) {
    return Math.round(n).toLocaleString("ru-RU") + " ₽";
  }

  function formatPreorderDate(d) {
    var dd = String(d.getDate()).padStart(2, "0");
    var mm = String(d.getMonth() + 1).padStart(2, "0");
    return dd + "." + mm + "." + d.getFullYear();
  }

  function collectPreorderGroups() {
    if (!purchaseTable) return [];
    var groups = [];
    var byKey = {};
    purchaseTable.querySelectorAll("tbody tr").forEach(function (tr) {
      var qty = parseQty(cellText(tr, 11));
      if (!qty) return;
      var supBtn = tr.querySelector(".mwd-sup-link");
      var key = supBtn ? supBtn.getAttribute("data-supplier") || "" : "";
      var name = "";
      if (supBtn) {
        var nameEl = supBtn.querySelector(".mwd-sup-name");
        name = ((nameEl && nameEl.textContent) || "").replace(/\s+/g, " ").trim();
      }
      if (!name) name = cellText(tr, 13);
      if (!key) key = name || "unknown";
      if (!byKey[key]) {
        byKey[key] = {
          key: key,
          name: name,
          items: [],
          sum: 0,
        };
        groups.push(byKey[key]);
      }
      var price = parseMoney(cellText(tr, 10));
      var sum = parseMoney(cellText(tr, 12));
      if (!sum) sum = price * qty;
      byKey[key].items.push({
        art: cellText(tr, 0),
        name: cellText(tr, 1),
        qty: qty,
        price: price,
        sum: sum,
      });
      byKey[key].sum += sum;
    });
    return groups;
  }

  function closePreorderModal() {
    if (!preorderModal) return;
    preorderModal.hidden = true;
    document.body.style.overflow = "";
  }

  function renderPreorderSheets(groups) {
    if (!preorderSheets) return;
    var dateStr = formatPreorderDate(new Date());
    preorderSheets.innerHTML = groups
      .map(function (g, i) {
        var num = "ПЗ-" + (120 + i);
        g.num = num;
        var card = SUPPLIER_CARDS[g.key] || {};
        var metaParts = [card.contact, card.pay, card.lead ? "срок " + card.lead : ""]
          .filter(Boolean);
        var rows = g.items
          .map(function (it) {
            return (
              "<tr><td class=\"mwd-art\">" +
              escapeHtml(it.art) +
              "</td><td>" +
              escapeHtml(it.name) +
              '</td><td class="num">' +
              it.qty +
              '</td><td class="num">' +
              formatMoney(it.price) +
              '</td><td class="num">' +
              formatMoney(it.sum) +
              "</td></tr>"
            );
          })
          .join("");
        return (
          '<section class="mwd-preorder-sheet">' +
          '<div class="mwd-preorder-sheet-top">' +
          "<div><div class=\"mwd-preorder-kind\">Предзаказ · не документ 1С</div>" +
          '<h4 class="mwd-preorder-num">' +
          escapeHtml(num) +
          "</h4></div>" +
          '<div class="mwd-preorder-date">' +
          dateStr +
          " · склад РЦ</div></div>" +
          '<div class="mwd-preorder-sup">' +
          escapeHtml(g.name) +
          "</div>" +
          (metaParts.length
            ? '<div class="mwd-preorder-meta">' +
              escapeHtml(metaParts.join(" · ")) +
              "</div>"
            : "") +
          "<table><thead><tr>" +
          "<th>Артикул</th><th>Наименование</th>" +
          '<th class="num">Кол-во</th><th class="num">Цена</th><th class="num">Сумма</th>' +
          "</tr></thead><tbody>" +
          rows +
          "</tbody><tfoot><tr>" +
          '<td colspan="3">Итого ' +
          g.items.length +
          " поз.</td><td></td>" +
          '<td class="num">' +
          formatMoney(g.sum) +
          "</td></tr></tfoot></table>" +
          '<div class="mwd-preorder-sign"><span>Товаровед ______________</span>' +
          "<span>Получил ______________</span></div>" +
          "</section>"
        );
      })
      .join("");
  }

  function openPreorderModal() {
    var groups = collectPreorderGroups();
    if (!groups.length) {
      showToast("нет позиций к заказу");
      return;
    }
    lastPreorderGroups = groups;
    renderPreorderSheets(groups);
    if (!preorderModal) return;
    preorderModal.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function printPreorders() {
    document.documentElement.classList.add("mwd-printing");
    window.print();
    document.documentElement.classList.remove("mwd-printing");
  }

  function csvCell(v) {
    var s = String(v == null ? "" : v);
    if (/[;"\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  function downloadPreorderExcel(groups) {
    var lines = ["Предзаказ;Поставщик;Артикул;Наименование;Кол-во;Цена;Сумма"];
    groups.forEach(function (g) {
      g.items.forEach(function (it) {
        lines.push(
          [
            g.num,
            g.name,
            it.art,
            it.name,
            it.qty,
            it.price,
            it.sum,
          ]
            .map(csvCell)
            .join(";")
        );
      });
    });
    var blob = new Blob(["\uFEFF" + lines.join("\r\n")], {
      type: "text/csv;charset=utf-8",
    });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "predzakaz-" + formatPreorderDate(new Date()).replace(/\./g, "") + ".csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  if (preorderOpenBtn) {
    preorderOpenBtn.addEventListener("click", function (e) {
      e.preventDefault();
      openPreorderModal();
    });
  }
  if (preorderClose) {
    preorderClose.addEventListener("click", closePreorderModal);
  }
  if (preorderModal) {
    preorderModal.addEventListener("click", function (e) {
      if (e.target === preorderModal) closePreorderModal();
    });
  }
  if (preorderPrintBtn) {
    preorderPrintBtn.addEventListener("click", function () {
      printPreorders();
    });
  }
  if (preorderExcelBtn) {
    preorderExcelBtn.addEventListener("click", function () {
      if (!lastPreorderGroups.length) return;
      downloadPreorderExcel(lastPreorderGroups);
      showToast("CSV скачан");
    });
  }

  // ── Problems priority filter ──
  var prioSelect = document.getElementById("mwd-problem-prio");
  var problemsTable = document.getElementById("mwd-problems-table");

  function applyPrioFilter() {
    if (!prioSelect || !problemsTable) return;
    var val = prioSelect.value;
    problemsTable.querySelectorAll("tbody tr").forEach(function (tr) {
      var p = tr.getAttribute("data-prio") || "";
      tr.classList.toggle("mwd-row-hidden", val && p !== val);
    });
  }

  if (prioSelect && problemsTable) {
    if (typeof saved.problemPrio === "string") {
      prioSelect.value = saved.problemPrio;
    }
    prioSelect.addEventListener("change", function () {
      applyPrioFilter();
      saveState({ problemPrio: prioSelect.value });
    });
    applyPrioFilter();
  }

  // ── Sales: поиск + пагинация (как в мониторе) ──
  var salesSearch = document.getElementById("mwd-sales-search");
  var salesMode = document.getElementById("mwd-sales-mode");
  var salesTable = document.getElementById("mwd-sales-table");
  var salesPrev = document.getElementById("mwd-sa-prev");
  var salesNext = document.getElementById("mwd-sa-next");
  var salesPageInfo = document.getElementById("mwd-sa-page-info");
  var salesPageSizeSelect = document.getElementById("mwd-sa-page-size");
  var salesAsmFilterEl = document.getElementById("mwd-sa-asm-filter");
  var salesAsmFilterTitle = document.getElementById("mwd-sa-asm-filter-title");
  var salesAsmFilterText = document.getElementById("mwd-sa-asm-filter-text");
  var salesAsmFilterClear = document.getElementById("mwd-sa-asm-filter-clear");
  var SALES_PAGE_SIZES = [5, 10, 25, 50];
  var SALES_MODES = ["kit", "donor"];
  var salesPage = 1;
  var salesPageSize = 5;
  var salesFilterListeners = [];
  // { focusArt, arts: string[], mode: "component"|"kit" } | null
  var salesAsmFilter = null;

  if (SALES_PAGE_SIZES.indexOf(saved.salesPageSize) >= 0) {
    salesPageSize = saved.salesPageSize;
  }
  if (typeof saved.salesPage === "number" && saved.salesPage >= 1) {
    salesPage = saved.salesPage;
  }
  if (salesSearch && typeof saved.salesSearch === "string") {
    salesSearch.value = saved.salesSearch;
  }
  if (salesMode) {
    if (saved.salesMode === "all") salesMode.value = "";
    else if (SALES_MODES.indexOf(saved.salesMode) >= 0) {
      salesMode.value = saved.salesMode;
    }
  }

  function salesAllRows() {
    if (!salesTable) return [];
    return Array.prototype.slice.call(
      salesTable.querySelectorAll("tbody tr.mwd-sa-row")
    );
  }

  function salesRowName(row) {
    if (!row) return "";
    var el = row.querySelector(".mwd-sa-name");
    var raw = ((el && el.textContent) || "").trim();
    return raw
      .replace(/\s*·\s*комплект\s*$/i, "")
      .replace(/\s*·\s*комплектующая\s*$/i, "")
      .trim();
  }

  function salesRowArt(row) {
    if (!row) return "";
    return normArticle(
      row.getAttribute("data-art") ||
        ((row.querySelector(".mwd-sa-art") || {}).textContent || "")
    );
  }

  function salesAsmQty(row, which) {
    if (!row) return 0;
    var cell = row.querySelector(which === "in" ? ".mwd-sa-s3" : ".mwd-sa-s4");
    var n = parseFloat(
      String((cell && cell.textContent) || "")
        .replace(/\s/g, "")
        .replace(",", ".")
    );
    return isNaN(n) || n < 0 ? 0 : n;
  }

  function shortSalesName(name) {
    var s = String(name || "").trim();
    s = s.replace(/\s*\([^)]*\)\s*(С-Р)?\s*$/i, "").trim();
    if (s.length > 42) s = s.slice(0, 40) + "…";
    return s || "—";
  }

  function clearSalesAsmFilter(opts) {
    opts = opts || {};
    salesAsmFilter = null;
    if (salesAsmFilterEl) salesAsmFilterEl.hidden = true;
    if (salesAsmFilterText) salesAsmFilterText.textContent = "";
    salesAllRows().forEach(function (row) {
      row.classList.remove("is-asm-focus", "is-asm-related");
    });
    if (!opts.skipApply) {
      salesPage = 1;
      applySalesPagination();
    }
  }

  function buildSalesAsmFilterBanner(focusArt, relatedArts, mode) {
    var focusRow = null;
    salesAllRows().forEach(function (row) {
      if (salesRowArt(row) === focusArt) focusRow = row;
    });
    var focusName = shortSalesName(salesRowName(focusRow));
    if (mode === "component") {
      var outQty = salesAsmQty(focusRow, "out");
      var parts = [];
      relatedArts.forEach(function (art) {
        if (art === focusArt) return;
        var kitRow = null;
        salesAllRows().forEach(function (row) {
          if (salesRowArt(row) === art) kitRow = row;
        });
        if (!kitRow) return;
        var kitIn = salesAsmQty(kitRow, "in");
        parts.push(
          shortSalesName(salesRowName(kitRow)) +
            " — " +
            formatRuInt(kitIn || 0) +
            " шт"
        );
      });
      var left =
        focusName +
        (outQty ? " " + formatRuInt(outQty) + " шт" : "") +
        (parts.length ? " = " + parts.join(" + ") : "");
      return {
        title: "Сборки с этим товаром",
        text: left || "Показаны комплектующая и связанные сборки",
      };
    }
    var bits = [];
    relatedArts.forEach(function (art) {
      if (art === focusArt) return;
      var partRow = null;
      salesAllRows().forEach(function (row) {
        if (salesRowArt(row) === art) partRow = row;
      });
      if (!partRow) {
        bits.push(art);
        return;
      }
      bits.push(shortSalesName(salesRowName(partRow)) + " (" + art + ")");
    });
    return {
      title: "Состав комплекта",
      text:
        focusName +
        (bits.length ? " → " + bits.join(", ") : " · состав по названию"),
    };
  }

  function setSalesAsmFilterFromRow(row) {
    if (!row) return;
    var art = salesRowArt(row);
    if (!art) return;
    var usedIn = String(row.getAttribute("data-used-in") || "")
      .split(",")
      .map(normArticle)
      .filter(Boolean);
    var related = String(row.getAttribute("data-related") || "")
      .split(",")
      .map(normArticle)
      .filter(Boolean);
    var kind = row.getAttribute("data-kind") || "";
    var mode = "";
    var arts = [art];
    if (kind === "donor" || kind === "component") {
      if (!usedIn.length) {
        showToast("не входит в сборки");
        return;
      }
      mode = "component";
      usedIn.forEach(function (a) {
        if (arts.indexOf(a) < 0) arts.push(a);
      });
    } else if (kind === "kit") {
      if (!related.length) {
        showToast("состав не найден");
        return;
      }
      mode = "kit";
      related.forEach(function (a) {
        if (arts.indexOf(a) < 0) arts.push(a);
      });
    } else {
      showToast("не комплект и не комплектующая");
      return;
    }
    if (
      salesAsmFilter &&
      salesAsmFilter.focusArt === art &&
      salesAsmFilter.mode === mode
    ) {
      clearSalesAsmFilter();
      return;
    }
    // Связанный фильтр показывает и сборки, и детали — сбрасываем «Тип».
    if (salesMode && salesMode.value) {
      salesMode.value = "";
    }
    salesAsmFilter = { focusArt: art, arts: arts, mode: mode };
    var banner = buildSalesAsmFilterBanner(art, arts, mode);
    if (salesAsmFilterTitle) salesAsmFilterTitle.textContent = banner.title;
    if (salesAsmFilterText) salesAsmFilterText.textContent = banner.text;
    if (salesAsmFilterEl) salesAsmFilterEl.hidden = false;
    salesPage = 1;
    applySalesPagination();
  }

  function salesFilteredRows() {
    var q = salesSearch
      ? (salesSearch.value || "").trim().toLowerCase()
      : "";
    var mode = salesMode ? salesMode.value || "" : "";
    return salesAllRows().filter(function (row) {
      var art = salesRowArt(row);
      if (salesAsmFilter && salesAsmFilter.arts.indexOf(art) < 0) {
        return false;
      }
      if (mode) {
        var kind = row.getAttribute("data-kind") || "";
        if (kind !== mode) return false;
      }
      if (!q) return true;
      var name = salesRowName(row);
      return (
        art.toLowerCase().indexOf(q) !== -1 ||
        name.toLowerCase().indexOf(q) !== -1
      );
    });
  }

  function applySalesPagination(opts) {
    opts = opts || {};
    if (!salesTable) return;
    var all = salesAllRows();
    var filtered = salesFilteredRows();
    var totalPages = Math.max(1, Math.ceil(filtered.length / salesPageSize) || 1);
    if (salesPage > totalPages) salesPage = totalPages;
    if (salesPage < 1) salesPage = 1;
    var start = (salesPage - 1) * salesPageSize;
    var visible = filtered.slice(start, start + salesPageSize);
    all.forEach(function (row) {
      row.classList.toggle("mwd-row-hidden", visible.indexOf(row) < 0);
      var art = salesRowArt(row);
      row.classList.toggle(
        "is-asm-focus",
        !!(salesAsmFilter && salesAsmFilter.focusArt === art)
      );
      row.classList.toggle(
        "is-asm-related",
        !!(
          salesAsmFilter &&
          salesAsmFilter.focusArt !== art &&
          salesAsmFilter.arts.indexOf(art) >= 0
        )
      );
    });
    if (salesPageInfo) {
      salesPageInfo.textContent =
        "Страница " + salesPage + " из " + totalPages;
    }
    if (salesPrev) salesPrev.disabled = salesPage <= 1;
    if (salesNext) salesNext.disabled = salesPage >= totalPages;
    if (salesPageSizeSelect) {
      salesPageSizeSelect.value = String(salesPageSize);
    }
    salesFilterListeners.forEach(function (fn) {
      fn(filtered);
    });
    if (!opts.skipSave) {
      saveState({
        salesPage: salesPage,
        salesPageSize: salesPageSize,
        salesSearch: salesSearch ? salesSearch.value || "" : "",
        salesMode: salesMode ? salesMode.value || "" : "",
      });
    }
  }

  if (salesTable) {
    if (salesPageSizeSelect) {
      salesPageSizeSelect.addEventListener("change", function () {
        var n = parseInt(salesPageSizeSelect.value, 10);
        if (SALES_PAGE_SIZES.indexOf(n) < 0) n = 5;
        salesPageSize = n;
        salesPage = 1;
        applySalesPagination();
      });
    }
    if (salesPrev) {
      salesPrev.addEventListener("click", function () {
        salesPage = Math.max(1, salesPage - 1);
        applySalesPagination();
      });
    }
    if (salesNext) {
      salesNext.addEventListener("click", function () {
        var totalPages = Math.max(
          1,
          Math.ceil(salesFilteredRows().length / salesPageSize) || 1
        );
        salesPage = Math.min(totalPages, salesPage + 1);
        applySalesPagination();
      });
    }
    if (salesSearch) {
      salesSearch.addEventListener("input", function () {
        salesPage = 1;
        applySalesPagination();
      });
    }
    if (salesMode) {
      salesMode.addEventListener("change", function () {
        salesPage = 1;
        applySalesPagination();
      });
    }
    if (salesAsmFilterClear) {
      salesAsmFilterClear.addEventListener("click", function () {
        clearSalesAsmFilter();
      });
    }
    salesTable.addEventListener("click", function (e) {
      if (e.target.closest(".btn-chart-icon")) return;
      var row = e.target.closest("tr.mwd-sa-row");
      if (!row || !row.classList.contains("mwd-sa-asm-clickable")) return;
      setSalesAsmFilterFromRow(row);
    });
    applySalesPagination({ skipSave: true });
  }

  // Стартовый раздел: hash → localStorage → sales
  var hashScreen = (window.location.hash || "").replace(/^#/, "");
  var startScreen = "sales";
  if (VALID_SCREENS.indexOf(hashScreen) >= 0) {
    startScreen = hashScreen;
  } else if (VALID_SCREENS.indexOf(saved.screen) >= 0) {
    startScreen = saved.screen;
  }
  activateScreen(startScreen, { skipSave: true });

  window.requestAnimationFrame(function () {
    restoreScrolls(saved.scrolls);
  });

  // ── Sales heatmap (как условное форматирование в Excel) ──
  // t=0..1 → red / white / green для итогов; red / yellow / green для строк
  function lerp(a, b, t) {
    return Math.round(a + (b - a) * t);
  }

  function rgb(r, g, b) {
    return "rgb(" + r + "," + g + "," + b + ")";
  }

  function heatRwG(t) {
    // red → white → green
    if (t <= 0.5) {
      var u = t * 2;
      return rgb(lerp(248, 255, u), lerp(105, 255, u), lerp(107, 255, u));
    }
    var v = (t - 0.5) * 2;
    return rgb(lerp(255, 99, v), lerp(255, 190, v), lerp(255, 123, v));
  }

  function heatRyG(t) {
    // red → yellow → green (для дневных ячеек строки)
    if (t <= 0.5) {
      var u = t * 2;
      return rgb(lerp(248, 255, u), lerp(105, 235, u), lerp(107, 132, u));
    }
    var v = (t - 0.5) * 2;
    return rgb(lerp(255, 99, v), lerp(235, 190, v), lerp(132, 123, v));
  }

  function retPctColor(pct) {
    // 0 → светло-жёлтый, выше → оранжевый
    var t = Math.max(0, Math.min(1, pct / 3));
    return rgb(255, lerp(245, 170, t), lerp(153, 60, t));
  }

  function applyHeatGroup(cells, colorFn) {
    if (!cells.length) return;
    var vals = cells.map(function (c) {
      return parseFloat(c.getAttribute("data-v")) || 0;
    });
    var min = Math.min.apply(null, vals);
    var max = Math.max.apply(null, vals);
    var span = max - min || 1;
    cells.forEach(function (c, i) {
      var t = (vals[i] - min) / span;
      c.style.backgroundColor = colorFn(t);
    });
  }

  if (salesTable) {
    // Итоги липнут сразу под шапкой: top = фактическая высота заголовков
    // (у шапки 2 строки, высота плавает). Как applyStickyLayout в мониторе.
    function syncSalesStickyTops() {
      var head = salesTable.querySelector(".mwd-sa-head-row");
      if (!head) return;
      var h = Math.ceil(head.getBoundingClientRect().height) || 36;
      salesTable.style.setProperty("--mwd-sa-head-h", h + "px");
    }
    syncSalesStickyTops();
    window.addEventListener("resize", syncSalesStickyTops);

    function updateSalesTotals(rows) {
      var totalCells = Array.prototype.slice.call(
        salesTable.querySelectorAll(
          '.mwd-sa-totals-row .mwd-sa-hm[data-hm-group="totals"]'
        )
      );
      if (!totalCells.length) return;
      var sums = totalCells.map(function () {
        return 0;
      });
      (rows || []).forEach(function (row) {
        var cells = row.querySelectorAll('.mwd-sa-hm[data-hm-group="row"]');
        var i;
        for (i = 0; i < sums.length && i < cells.length; i++) {
          sums[i] += parseFloat(cells[i].getAttribute("data-v")) || 0;
        }
      });
      totalCells.forEach(function (cell, idx) {
        var v = Math.round(sums[idx]);
        cell.setAttribute("data-v", String(v));
        cell.textContent = String(v);
      });
      applyHeatGroup(totalCells, heatRwG);
    }

    salesFilterListeners.push(updateSalesTotals);
    updateSalesTotals(salesFilteredRows());

    // По каждой строке товара — своя шкала (как в Excel «по строке»)
    salesTable.querySelectorAll("tbody tr").forEach(function (row) {
      applyHeatGroup(
        Array.prototype.slice.call(row.querySelectorAll('.mwd-sa-hm[data-hm-group="row"]')),
        heatRyG
      );
    });

    // Возврат %
    salesTable.querySelectorAll(".mwd-sa-retpct[data-retpct]").forEach(function (cell) {
      var pct = parseFloat(cell.getAttribute("data-retpct")) || 0;
      cell.style.backgroundColor = retPctColor(pct);
    });

    // ── График: цена / продажи / остаток в модалке ──
    var chartSvg = document.getElementById("mwd-sa-chart-svg");
    var chartCap = document.getElementById("mwd-sa-chart-cap");
    var chartModal = document.getElementById("mwd-sa-chart-modal");
    var chartClose = document.getElementById("mwd-sa-chart-close");
    var dateLabels = Array.prototype.map.call(
      salesTable.querySelectorAll(".mwd-sa-head-row .mwd-sa-day"),
      function (th) {
        return (th.textContent || "").trim();
      }
    );

    function parseSeries(str) {
      if (!str) return [];
      return str.split(",").map(function (x) {
        var n = parseFloat(x);
        return isNaN(n) ? 0 : n;
      });
    }

    function niceMax(v) {
      if (v <= 0) return 1;
      var p = Math.pow(10, Math.floor(Math.log10(v)));
      return Math.ceil(v / p) * p;
    }

    // Демо-остаток: старт ≈ 6 дней покрытия, закупка каждые 5 дней.
    function mockStockFromSales(sales) {
      var maxSale = 1;
      var i;
      for (i = 0; i < sales.length; i++) {
        if (sales[i] > maxSale) maxSale = sales[i];
      }
      var cover = Math.round(maxSale * 6);
      var s = cover;
      var out = [];
      for (i = 0; i < sales.length; i++) {
        if (i > 0 && i % 5 === 0) s += cover;
        out.push(s);
        s = Math.max(0, s - sales[i]);
      }
      return out;
    }

    function openChartModal() {
      if (!chartModal) return;
      chartModal.hidden = false;
      document.body.style.overflow = "hidden";
    }

    function closeChartModal() {
      if (!chartModal) return;
      chartModal.hidden = true;
      document.body.style.overflow = "";
    }

    function renderPriceQtyChart(row) {
      if (!chartSvg) return;
      var art = ((row.querySelector(".mwd-sa-art") || {}).textContent || "").trim();
      var name = salesRowName(row);
      var sales = Array.prototype.map.call(
        row.querySelectorAll('.mwd-sa-hm[data-hm-group="row"]'),
        function (c) {
          return parseFloat(c.getAttribute("data-v")) || 0;
        }
      );
      var prices = parseSeries(row.getAttribute("data-prices"));
      var stock = parseSeries(row.getAttribute("data-stock"));
      var n = Math.min(sales.length, prices.length, dateLabels.length);
      if (!n) return;

      sales = sales.slice(0, n);
      prices = prices.slice(0, n);
      stock = stock.length >= n ? stock.slice(0, n) : mockStockFromSales(sales);
      var labels = dateLabels.slice(0, n);

      // Три полосы: цена ₽ сверху, продажи шт, остаток шт. Общие оси по датам.
      var W = 680;
      var H = 340;
      var padL = 72;
      var padR = 28;
      var padT = 16;
      var padB = 36;
      var gap = 12;
      var plotW = W - padL - padR;
      var plotH = H - padT - padB;
      var bandH = (plotH - gap * 2) / 3;
      var axisY = padT + plotH;

      var bands = [
        {
          top: padT,
          max: niceMax(Math.max.apply(null, prices.concat([1]))),
          unit: "₽",
          label: "цена",
          color: "#0f766e",
          vals: prices,
        },
        {
          top: padT + bandH + gap,
          max: niceMax(Math.max.apply(null, sales.concat([1]))),
          unit: "шт",
          label: "продажи",
          color: "#c2410c",
          vals: sales,
        },
        {
          top: padT + (bandH + gap) * 2,
          max: niceMax(Math.max.apply(null, stock.concat([1]))),
          unit: "шт",
          label: "ост",
          color: "#1d66d1",
          vals: stock,
        },
      ];

      function xAt(i) {
        return padL + (n === 1 ? plotW / 2 : (i * plotW) / (n - 1));
      }
      function yInBand(bandTop, v, vmax) {
        var t = Math.max(0, Math.min(1, v / vmax));
        var inner = 8;
        return bandTop + inner + (bandH - inner * 2) * (1 - t);
      }

      function poly(vals, band) {
        return vals
          .map(function (v, i) {
            return xAt(i).toFixed(1) + "," + yInBand(band.top, v, band.max).toFixed(1);
          })
          .join(" ");
      }

      var xTicks = "";
      var step = n > 10 ? 2 : 1;
      var i;
      for (i = 0; i < n; i += step) {
        var lab = labels[i].replace(/\/20\d\d/, "");
        var x = xAt(i);
        xTicks +=
          '<line x1="' +
          x.toFixed(1) +
          '" y1="' +
          axisY +
          '" x2="' +
          x.toFixed(1) +
          '" y2="' +
          (axisY + 4) +
          '" stroke="#94a3b8"/>';
        xTicks +=
          '<text x="' +
          x.toFixed(1) +
          '" y="' +
          (H - 10) +
          '" text-anchor="middle" font-size="10" fill="#64748b">' +
          lab +
          "</text>";
      }

      var b;
      var guides = "";
      var seps = "";
      var lines = "";
      var labelsSvg = "";
      for (b = 0; b < bands.length; b++) {
        var band = bands[b];
        var yMid = band.top + bandH * 0.5;
        guides +=
          '<line x1="' +
          padL +
          '" y1="' +
          yMid +
          '" x2="' +
          (W - padR) +
          '" y2="' +
          yMid +
          '" stroke="#eef2f7"/>';
        if (b > 0) {
          var sepY = band.top - gap / 2;
          seps +=
            '<line x1="' +
            padL +
            '" y1="' +
            sepY +
            '" x2="' +
            (W - padR) +
            '" y2="' +
            sepY +
            '" stroke="#e2e8f0" stroke-dasharray="4 4"/>';
        }
        lines +=
          '<polyline fill="none" stroke="' +
          band.color +
          '" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" points="' +
          poly(band.vals, band) +
          '"/>';
        labelsSvg +=
          '<text x="' +
          (padL - 8) +
          '" y="' +
          (band.top + bandH / 2 + 4) +
          '" text-anchor="end" font-size="11" font-weight="700" fill="' +
          band.color +
          '">' +
          band.label +
          "</text>";
        labelsSvg +=
          '<text x="' +
          (W - padR) +
          '" y="' +
          (band.top + 12) +
          '" text-anchor="end" font-size="9" fill="#94a3b8">' +
          band.max +
          " " +
          band.unit +
          "</text>";
      }

      chartSvg.setAttribute("viewBox", "0 0 " + W + " " + H);
      chartSvg.innerHTML =
        '<rect x="0" y="0" width="' +
        W +
        '" height="' +
        H +
        '" fill="#fff"/>' +
        guides +
        '<line x1="' +
        padL +
        '" y1="' +
        padT +
        '" x2="' +
        padL +
        '" y2="' +
        axisY +
        '" stroke="#334155" stroke-width="1.4"/>' +
        '<line x1="' +
        padL +
        '" y1="' +
        axisY +
        '" x2="' +
        (W - padR) +
        '" y2="' +
        axisY +
        '" stroke="#334155" stroke-width="1.4"/>' +
        seps +
        lines +
        labelsSvg +
        xTicks;

      if (chartCap) {
        chartCap.textContent = art + " · " + name;
      }
    }

    salesTable.querySelectorAll(".btn-chart-icon").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        var row = btn.closest("tr.mwd-sa-row");
        if (!row) return;
        renderPriceQtyChart(row);
        openChartModal();
      });
    });

    if (chartClose) {
      chartClose.addEventListener("click", function () {
        closeChartModal();
      });
    }
    if (chartModal) {
      chartModal.addEventListener("click", function (e) {
        if (e.target === chartModal) closeChartModal();
      });
    }
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && chartModal && !chartModal.hidden) {
        closeChartModal();
      }
    });
  }

})();
