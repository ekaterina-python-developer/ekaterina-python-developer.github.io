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
    row.addEventListener("click", function () {
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
      if (btn.disabled) return;
      showToast("демо");
    });
  });

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
  var createArtBtn = document.getElementById("mwd-pass-create-art");
  var passReqHint = document.getElementById("mwd-pass-req-hint");
  var honestToggle = document.getElementById("mwd-pass-honest-toggle");
  var honestWrap = document.getElementById("mwd-pass-honest");
  var honestCatWrap = document.getElementById("mwd-pass-honest-cat");
  var honestLabel = root.querySelector("[data-pass-honest-label]");
  var tariffActiveLabel = document.getElementById("mwd-tariff-active-label");
  var currentPassArt = "";
  var passCreateAttempted = false;
  var VALID_PASS_TABS = ["main", "logistics", "content", "media"];

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
    if (currentPassMode !== "edit" || !editQueue.length) {
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
  }

  function syncCreateArtCabinetOptions(nds) {
    var sel = document.getElementById("mwd-create-art-cabinet");
    if (!sel) return;
    var oooOk = nds === "22";
    var firstEnabled = null;
    Array.prototype.forEach.call(sel.options, function (opt) {
      var kind = opt.getAttribute("data-cab-kind");
      var blocked = kind === "ooo" && nds && !oooOk;
      opt.disabled = !!blocked;
      opt.hidden = !!blocked;
      if (!blocked && firstEnabled == null) firstEnabled = opt;
    });
    if (sel.selectedOptions[0] && sel.selectedOptions[0].disabled && firstEnabled) {
      firstEnabled.selected = true;
    }
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

    var docs = data.docs || {};
    setDocStatus("cert", docs.cert);
    setDocStatus("decl", docs.decl);
    setDocStatus("refusal", docs.refusal);

    syncMediaFromData(data);
    recalcVolume();
    applyNdsCabinets((root.querySelector('[data-pass-field="nds"]') || {}).value);

    if (createArtPreview) {
      createArtPreview.value = data.art ? String(data.art) : "";
    }
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
  var vedBulkArchSel = document.getElementById("mwd-ved-bulk-arch-sel");
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
    if (vedBulkArchSel) {
      vedBulkArchSel.disabled = !has;
      if (!has) {
        vedBulkArchSel.selectedIndex = 0;
        syncVedArchBtnLabel();
      }
    }
    if (vedTable) vedTable.classList.toggle("is-select-mode", vedSelectMode);
    syncVedCheckAll();
  }

  function syncVedArchBtnLabel() {
    if (!vedBulkArchTxt || !vedBulkArchSel) return;
    var opt = vedBulkArchSel.options[vedBulkArchSel.selectedIndex];
    vedBulkArchTxt.textContent = opt && opt.value ? opt.text : "выбрать…";
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

  if (vedBulkArchSel) {
    vedBulkArchSel.addEventListener("change", function () {
      var v = vedBulkArchSel.value;
      if (!v) return;
      applyArchToPicked(v);
      vedBulkArchSel.selectedIndex = 0;
      syncVedArchBtnLabel();
    });
    vedBulkArchSel.addEventListener("click", function (e) {
      e.stopPropagation();
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
    if (createArtPreview) {
      var artInput = root.querySelector('[data-pass-field="art"]');
      var art = (artInput && artInput.value) || currentPassArt || "";
      var cab = createArtCabinet ? createArtCabinet.value : "";
      var prefix =
        cab.indexOf("Озон") === 0 || cab.indexOf("ОЗОН") === 0
          ? "О "
          : "";
      createArtPreview.value = art ? prefix + art : "";
    }
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
      if (createArtModal && !createArtModal.hidden) openCreateArtModal();
    });
  }
  if (createArtSubmit) {
    createArtSubmit.addEventListener("click", function () {
      showToast("демо");
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

  // ── Purchase status filter ──
  var purchaseSelect = document.getElementById("mwd-purchase-status");
  var purchaseTable = document.getElementById("mwd-purchase-table");

  function applyPurchaseFilter() {
    if (!purchaseSelect || !purchaseTable) return;
    var val = purchaseSelect.value;
    purchaseTable.querySelectorAll("tbody tr").forEach(function (tr) {
      var st = tr.getAttribute("data-status") || "";
      tr.classList.toggle("mwd-row-hidden", val && st !== val);
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
    applyPurchaseFilter();
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

  // ── Sales: поиск + пагинация / выбор строк (как в мониторе) ──
  var salesSearch = document.getElementById("mwd-sales-search");
  var salesTable = document.getElementById("mwd-sales-table");
  var salesPrev = document.getElementById("mwd-sa-prev");
  var salesNext = document.getElementById("mwd-sa-next");
  var salesPageInfo = document.getElementById("mwd-sa-page-info");
  var salesPageSizeSelect = document.getElementById("mwd-sa-page-size");
  var SALES_PAGE_SIZES = [5, 10, 25, 50];
  var salesPage = 1;
  var salesPageSize = 5;

  if (SALES_PAGE_SIZES.indexOf(saved.salesPageSize) >= 0) {
    salesPageSize = saved.salesPageSize;
  }
  if (typeof saved.salesPage === "number" && saved.salesPage >= 1) {
    salesPage = saved.salesPage;
  }
  if (salesSearch && typeof saved.salesSearch === "string") {
    salesSearch.value = saved.salesSearch;
  }

  function salesAllRows() {
    if (!salesTable) return [];
    return Array.prototype.slice.call(
      salesTable.querySelectorAll("tbody tr.mwd-sa-row")
    );
  }

  function salesFilteredRows() {
    var q = salesSearch
      ? (salesSearch.value || "").trim().toLowerCase()
      : "";
    return salesAllRows().filter(function (row) {
      if (!q) return true;
      var art = (row.querySelector(".mwd-sa-art") || {}).textContent || "";
      var name = (row.querySelector(".mwd-sa-name") || {}).textContent || "";
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
    if (!opts.skipSave) {
      saveState({
        salesPage: salesPage,
        salesPageSize: salesPageSize,
        salesSearch: salesSearch ? salesSearch.value || "" : "",
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

    // Итоги по периоду — одна шкала на всю строку
    applyHeatGroup(
      Array.prototype.slice.call(
        salesTable.querySelectorAll('.mwd-sa-hm[data-hm-group="totals"]')
      ),
      heatRwG
    );

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

    // ── График цена / шт в модалке ──
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
      return (str || "")
        .split(",")
        .map(function (x) {
          return parseFloat(x);
        })
        .filter(function (x) {
          return !isNaN(x);
        });
    }

    function niceMax(v) {
      if (v <= 0) return 1;
      var p = Math.pow(10, Math.floor(Math.log10(v)));
      return Math.ceil(v / p) * p;
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
      var name = ((row.querySelector(".mwd-sa-name") || {}).textContent || "").trim();
      var qtys = Array.prototype.map.call(
        row.querySelectorAll('.mwd-sa-hm[data-hm-group="row"]'),
        function (c) {
          return parseFloat(c.getAttribute("data-v")) || 0;
        }
      );
      var prices = parseSeries(row.getAttribute("data-prices"));
      var n = Math.min(qtys.length, prices.length, dateLabels.length);
      if (!n) return;

      qtys = qtys.slice(0, n);
      prices = prices.slice(0, n);
      var labels = dateLabels.slice(0, n);

      // Формат как на скетче: две полосы (цена сверху, шт снизу), общие оси
      var W = 680;
      var H = 280;
      var padL = 56;
      var padR = 24;
      var padT = 18;
      var padB = 36;
      var gap = 16;
      var plotW = W - padL - padR;
      var plotH = H - padT - padB;
      var bandH = (plotH - gap) / 2;
      var priceTop = padT;
      var qtyTop = padT + bandH + gap;
      var axisY = padT + plotH;

      var pMax = niceMax(Math.max.apply(null, prices.concat([1])));
      var qMax = niceMax(Math.max.apply(null, qtys.concat([1])));

      function xAt(i) {
        return padL + (n === 1 ? plotW / 2 : (i * plotW) / (n - 1));
      }
      function yInBand(bandTop, v, vmax) {
        var t = Math.max(0, Math.min(1, v / vmax));
        // небольшой внутренний отступ, чтобы линия не липла к краям полосы
        var inner = 8;
        return bandTop + inner + (bandH - inner * 2) * (1 - t);
      }
      function yPrice(v) {
        return yInBand(priceTop, v, pMax);
      }
      function yQty(v) {
        return yInBand(qtyTop, v, qMax);
      }

      function poly(vals, yFn) {
        return vals
          .map(function (v, i) {
            return xAt(i).toFixed(1) + "," + yFn(v).toFixed(1);
          })
          .join(" ");
      }

      var xTicks = "";
      var step = n > 10 ? 2 : 1;
      for (var i = 0; i < n; i += step) {
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

      // лёгкие горизонтали только внутри полос
      var guides = "";
      [0.5].forEach(function (t) {
        var yp = priceTop + bandH * (1 - t);
        var yq = qtyTop + bandH * (1 - t);
        guides +=
          '<line x1="' +
          padL +
          '" y1="' +
          yp +
          '" x2="' +
          (W - padR) +
          '" y2="' +
          yp +
          '" stroke="#eef2f7"/>';
        guides +=
          '<line x1="' +
          padL +
          '" y1="' +
          yq +
          '" x2="' +
          (W - padR) +
          '" y2="' +
          yq +
          '" stroke="#eef2f7"/>';
      });

      chartSvg.setAttribute("viewBox", "0 0 " + W + " " + H);
      chartSvg.innerHTML =
        '<rect x="0" y="0" width="' +
        W +
        '" height="' +
        H +
        '" fill="#fff"/>' +
        guides +
        // оси «уголком», как на скетче
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
        // разделитель полос
        '<line x1="' +
        padL +
        '" y1="' +
        (qtyTop - gap / 2) +
        '" x2="' +
        (W - padR) +
        '" y2="' +
        (qtyTop - gap / 2) +
        '" stroke="#e2e8f0" stroke-dasharray="4 4"/>' +
        '<polyline fill="none" stroke="#0f766e" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" points="' +
        poly(prices, yPrice) +
        '"/>' +
        '<polyline fill="none" stroke="#1d66d1" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" points="' +
        poly(qtys, yQty) +
        '"/>' +
        // подписи слева у полос — как на скетче
        '<text x="' +
        (padL - 8) +
        '" y="' +
        (priceTop + bandH / 2 + 4) +
        '" text-anchor="end" font-size="12" font-weight="700" fill="#0f766e">цена</text>' +
        '<text x="' +
        (padL - 8) +
        '" y="' +
        (qtyTop + bandH / 2 + 4) +
        '" text-anchor="end" font-size="12" font-weight="700" fill="#1d66d1">ост</text>' +
        '<text x="' +
        (W - padR) +
        '" y="' +
        (priceTop + 12) +
        '" text-anchor="end" font-size="9" fill="#94a3b8">' +
        pMax +
        " ₽</text>" +
        '<text x="' +
        (W - padR) +
        '" y="' +
        (qtyTop + 12) +
        '" text-anchor="end" font-size="9" fill="#94a3b8">' +
        qMax +
        " шт</text>" +
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
