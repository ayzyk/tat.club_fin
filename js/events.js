(function () {
  var STORAGE_EVENTS = "fin_tat_events";
  var STORAGE_SESSION = "fin_tat_admin_session";
  var MAX_IMAGE_FILE = 50 * 1024 * 1024;
  var MAX_VIDEO_FILE = 200 * 1024 * 1024;

  var eventModal = document.getElementById("event-modal");
  var openBtn = document.getElementById("events-open-add");
  var eventForm = document.getElementById("event-add-form");
  var eventsLayout = document.getElementById("events-layout");
  var eventsAlbumsView = document.getElementById("events-albums-view");
  var eventsAlbumsGrid = document.getElementById("events-albums-grid");
  var eventsAlbumsEmpty = document.getElementById("events-albums-empty");
  var eventsOpenAlbum = document.getElementById("events-open-album");
  var eventsBackBtn = document.getElementById("events-back-albums");
  var eventsDeleteOpenAlbumBtn = document.getElementById(
    "events-delete-open-album"
  );
  var eventsGrid = document.getElementById("events-grid");
  var eventsEmpty = document.getElementById("events-empty");
  var eventFile = document.getElementById("event-file");
  var eventDateInput = document.getElementById("event-date");
  var eventModalAlbumSelect = document.getElementById(
    "event-modal-album-select"
  );
  var eventModalAlbumNew = document.getElementById("event-modal-album-new");
  var eventModalAlbumDateInput = document.getElementById(
    "event-modal-album-date"
  );
  var eventModalAlbumCoverFile = document.getElementById(
    "event-modal-album-cover"
  );
  var eventsOpenAlbumCover = document.getElementById(
    "events-open-album-cover"
  );
  var eventsOpenAddInnerBtn = document.getElementById(
    "events-open-add-inner"
  );
  var eventModalSectionPick = document.getElementById(
    "event-modal-section-pick-album"
  );
  var eventModalSectionActivity = document.getElementById(
    "event-modal-section-activity"
  );
  var eventModalSectionAlbumFields = document.getElementById(
    "event-modal-section-album-fields"
  );
  var adminPanelModalEl = document.getElementById("admin-modal");
  var eventModalLabelAlbumNew = document.getElementById(
    "event-modal-label-album-new"
  );
  var eventModalLabelAlbumDate = document.getElementById(
    "event-modal-label-album-date"
  );
  var eventModalLabelAlbumCover = document.getElementById(
    "event-modal-label-album-cover"
  );
  var eventModalSubmitBtn = document.getElementById("event-modal-submit");
  var eventModalHeading = document.getElementById("event-modal-title");
  var eventFocalWrap = document.getElementById("event-image-focal-wrap");
  var eventFocalFrame = document.getElementById("event-image-focal-frame");
  var eventFocalImg = document.getElementById("event-image-focal-img");
  var eventFocalReset = document.getElementById("event-image-focal-reset");
  var eventFocalBinder = null;
  var eventFocalPreviewUrl = null;

  var eventModalAlbumOnly = false;
  var eventEditItemId = null;
  var eventEditAlbumId = null;

  var eventBlobUrls = [];
  var openEventAlbumId = null;

  if (!eventModal) return;

  function idbOk() {
    return window.indexedDB && window.FinTatIdb;
  }

  function getSessionLogin() {
    try {
      return String(localStorage.getItem(STORAGE_SESSION) || "").trim();
    } catch (e) {
      return "";
    }
  }

  function syncEventsAdminChrome() {
    var admin = !!getSessionLogin();
    if (openBtn) {
      var wrapOuter = openBtn.closest(".events-add-wrap");
      if (wrapOuter) wrapOuter.hidden = !admin;
    }
    if (eventsOpenAddInnerBtn) {
      var wrapInner = eventsOpenAddInnerBtn.closest(".events-add-wrap");
      if (wrapInner) wrapInner.hidden = !admin;
    }
  }

  function setEventsEmptyMessages() {
    var admin = !!getSessionLogin();
    if (eventsAlbumsEmpty) {
      eventsAlbumsEmpty.textContent = admin
        ? "Пока нет альбомов. Нажмите «Добавить альбом»."
        : "Скоро здесь появятся наши материалы.";
    }
    if (eventsEmpty) {
      eventsEmpty.textContent = admin
        ? "В альбоме пока нет записей. Добавьте материалы кнопкой выше."
        : "Скоро здесь появятся наши материалы.";
    }
  }

  function closeMobileNav() {
    var nav = document.querySelector(".nav");
    var toggle = document.querySelector(".nav-toggle");
    if (nav) nav.classList.remove("is-open");
    if (toggle) {
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Открыть меню");
    }
  }

  function syncEventModalElevation() {
    if (!eventModal) return;
    var elevated = adminPanelModalEl && !adminPanelModalEl.hidden;
    eventModal.classList.toggle("event-modal--elevated", elevated);
  }

  function findEventItemState(itemId) {
    var state = getEventsState();
    for (var i = 0; i < state.albums.length; i++) {
      var j = state.albums[i].items.findIndex(function (x) {
        return x.id === itemId;
      });
      if (j !== -1) {
        return { album: state.albums[i], item: state.albums[i].items[j] };
      }
    }
    return null;
  }

  function teardownEventFocalEditor() {
    if (eventFocalBinder && eventFocalBinder.destroy) {
      eventFocalBinder.destroy();
      eventFocalBinder = null;
    }
    if (eventFocalPreviewUrl) {
      try {
        URL.revokeObjectURL(eventFocalPreviewUrl);
      } catch (e) {}
      eventFocalPreviewUrl = null;
    }
    if (eventFocalImg) {
      eventFocalImg.removeAttribute("src");
      eventFocalImg.onload = null;
    }
    if (eventFocalWrap) eventFocalWrap.hidden = true;
  }

  function getEventFocalFromEditor() {
    if (
      !window.FinTatImageFocal ||
      !eventFocalBinder ||
      !eventFocalBinder.getFocal
    ) {
      return { x: 50, y: 50 };
    }
    return eventFocalBinder.getFocal();
  }

  function refreshEventFocalEditor() {
    teardownEventFocalEditor();
    if (
      !eventFocalWrap ||
      !eventFocalFrame ||
      !eventFocalImg ||
      !window.FinTatImageFocal ||
      !eventForm
    ) {
      return;
    }
    if (
      eventModalSectionActivity &&
      eventModalSectionActivity.hidden
    ) {
      eventFocalWrap.hidden = true;
      return;
    }
    var typeInput = eventForm.querySelector(
      'input[name="eventMediaType"]:checked'
    );
    if (!typeInput || typeInput.value !== "image") {
      eventFocalWrap.hidden = true;
      return;
    }

    function bindEditor(initial) {
      var xy = initial || { x: 50, y: 50 };
      function go() {
        if (!eventFocalImg.naturalWidth) return;
        eventFocalBinder = window.FinTatImageFocal.bindPanEditor(
          eventFocalFrame,
          eventFocalImg,
          xy,
          null
        );
      }
      if (eventFocalImg.complete && eventFocalImg.naturalWidth) {
        go();
      } else {
        eventFocalImg.onload = function () {
          eventFocalImg.onload = null;
          go();
        };
      }
    }

    function showUrl(src, initial) {
      eventFocalWrap.hidden = false;
      eventFocalImg.src = src;
      bindEditor(initial);
    }

    var file = eventFile && eventFile.files[0];

    if (file && file.type.startsWith("image/")) {
      eventFocalPreviewUrl = URL.createObjectURL(file);
      showUrl(eventFocalPreviewUrl, { x: 50, y: 50 });
      return;
    }

    if (eventEditItemId) {
      var loc3 = findEventItemState(eventEditItemId);
      var it = loc3 && loc3.item;
      if (it && it.type === "image") {
        var initI = window.FinTatImageFocal.getXY(it);
        if (it.mediaKey && idbOk()) {
          FinTatIdb.getBlob(it.mediaKey)
            .then(function (blob) {
              if (!blob || !eventFocalImg) return;
              eventFocalPreviewUrl = URL.createObjectURL(blob);
              showUrl(eventFocalPreviewUrl, initI);
            })
            .catch(function () {
              if (eventFocalWrap) eventFocalWrap.hidden = true;
            });
          return;
        }
        if (it.src) {
          showUrl(it.src, initI);
          return;
        }
      }
    }

    eventFocalWrap.hidden = true;
  }

  function prefillEventEditItem(itemId) {
    var found = findEventItemState(itemId);
    if (!found || !eventForm) return;
    var it = found.item;
    var titleEl = document.getElementById("event-title");
    var descEl = document.getElementById("event-description");
    if (titleEl) titleEl.value = it.title || "";
    if (descEl) descEl.value = it.description || "";
    if (eventDateInput) {
      eventDateInput.value = it.publishedDate || todayYMD();
    }
    var imgR = eventForm.querySelector(
      'input[name="eventMediaType"][value="image"]'
    );
    var vidR = eventForm.querySelector(
      'input[name="eventMediaType"][value="video"]'
    );
    if (it.type === "video") {
      if (vidR) vidR.checked = true;
    } else {
      if (imgR) imgR.checked = true;
    }
    if (eventFile) eventFile.value = "";
    syncEventMediaFields();
    setTimeout(function () {
      refreshEventFocalEditor();
    }, 0);
  }

  function prefillEventEditAlbum(albumId) {
    var st = getEventsState();
    var alb = st.albums.find(function (a) {
      return a.id === albumId;
    });
    if (!alb) return;
    if (eventModalAlbumNew) eventModalAlbumNew.value = alb.title || "";
    if (eventModalAlbumDateInput) {
      eventModalAlbumDateInput.value = alb.publishedDate || todayYMD();
    }
    if (eventModalAlbumCoverFile) eventModalAlbumCoverFile.value = "";
  }

  function migrateEventsRaw(raw) {
    try {
      if (!raw) return { albums: [], needsPersist: false };
      var data = JSON.parse(raw);
      if (data && Array.isArray(data.albums)) {
        var needsPersist = false;
        data.albums.forEach(function (a) {
          if (!Array.isArray(a.items)) a.items = [];
          if (!("cover" in a)) {
            needsPersist = true;
            if (a.items.length) {
              var last = a.items[a.items.length - 1];
              if (
                last &&
                (last.mediaKey || (last.src && String(last.src).trim()))
              ) {
                a.cover = {
                  type: last.type === "video" ? "video" : "image",
                  mediaKey: last.mediaKey || null,
                  src: last.src || "",
                };
              } else {
                a.cover = null;
              }
            } else {
              a.cover = null;
            }
          } else if (a.cover === undefined) {
            a.cover = null;
          }
        });
        return { albums: data.albums, needsPersist: needsPersist };
      }
      if (Array.isArray(data)) {
        if (data.length === 0) return { albums: [], needsPersist: false };
        return {
          albums: [
            {
              id: "mig-events-" + String(Date.now()),
              title: "Мероприятия",
              createdAt: new Date().toISOString(),
              cover: null,
              items: data,
            },
          ],
          needsPersist: true,
        };
      }
    } catch (e) {}
    return { albums: [], needsPersist: false };
  }

  function getEventsState() {
    var raw = localStorage.getItem(STORAGE_EVENTS);
    var res = migrateEventsRaw(raw);
    if (res.needsPersist) {
      saveEventsState({ albums: res.albums });
    }
    return { albums: res.albums };
  }

  function saveEventsState(state) {
    localStorage.setItem(STORAGE_EVENTS, JSON.stringify(state));
  }

  function newId() {
    return String(Date.now()) + "-" + Math.random().toString(36).slice(2, 9);
  }

  function pluralRu(n, one, few, many) {
    n = Math.abs(n) % 100;
    var n1 = n % 10;
    if (n > 10 && n < 20) return many;
    if (n1 > 1 && n1 < 5) return few;
    if (n1 === 1) return one;
    return many;
  }

  function formatRuDate(iso) {
    if (!iso) return "";
    try {
      var d = new Date(iso);
      if (isNaN(d.getTime())) return "";
      return d.toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch (e) {
      return "";
    }
  }

  function formatRuDateFromYMD(ymd) {
    if (!ymd || typeof ymd !== "string") return "";
    var parts = ymd.split("-");
    if (parts.length !== 3) return "";
    var y = parseInt(parts[0], 10);
    var mo = parseInt(parts[1], 10) - 1;
    var da = parseInt(parts[2], 10);
    if (isNaN(y) || isNaN(mo) || isNaN(da)) return "";
    var d = new Date(y, mo, da);
    if (
      d.getFullYear() !== y ||
      d.getMonth() !== mo ||
      d.getDate() !== da
    ) {
      return "";
    }
    return d.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  function formatEntityDate(entity) {
    if (entity && entity.publishedDate) {
      var fromYmd = formatRuDateFromYMD(entity.publishedDate);
      if (fromYmd) return fromYmd;
    }
    return formatRuDate(entity && entity.createdAt);
  }

  function timeDatetimeForEntity(entity) {
    if (entity && entity.publishedDate) return entity.publishedDate;
    return (entity && entity.createdAt) || "";
  }

  function todayYMD() {
    var d = new Date();
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1);
    if (m.length < 2) m = "0" + m;
    var day = String(d.getDate());
    if (day.length < 2) day = "0" + day;
    return y + "-" + m + "-" + day;
  }

  function readDateInput(el) {
    if (!el || !el.value) return null;
    var v = String(el.value).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
    return null;
  }

  function setEventDateDefault() {
    if (eventDateInput) eventDateInput.value = todayYMD();
  }

  function setEventModalAlbumDateDefault() {
    if (eventModalAlbumDateInput) {
      eventModalAlbumDateInput.value = todayYMD();
    }
  }

  function buildEventAlbumCoverMediaItem(album) {
    if (!album || !album.cover) return null;
    var c = album.cover;
    if (c.mediaKey || (c.src && String(c.src).trim())) {
      return {
        type: c.type === "video" ? "video" : "image",
        mediaKey: c.mediaKey || null,
        src: c.src || "",
        title: "",
      };
    }
    return null;
  }

  function fillEventAlbumSelectElement(selectEl, opts) {
    opts = opts || {};
    if (!selectEl) return;
    var state = getEventsState();
    var prev = selectEl.value;
    selectEl.innerHTML = "";
    state.albums.forEach(function (a) {
      var opt = document.createElement("option");
      opt.value = a.id;
      opt.textContent = a.title || "Без названия";
      selectEl.appendChild(opt);
    });
    if (state.albums.length === 0) {
      var emptyOpt = document.createElement("option");
      emptyOpt.value = "";
      emptyOpt.textContent = "— укажите новый альбом ниже —";
      selectEl.appendChild(emptyOpt);
      selectEl.disabled = true;
    } else {
      selectEl.disabled = false;
      if (
        opts.preferOpenAlbum &&
        openEventAlbumId &&
        state.albums.some(function (a) {
          return a.id === openEventAlbumId;
        })
      ) {
        selectEl.value = openEventAlbumId;
      } else if (
        prev &&
        state.albums.some(function (a) {
          return a.id === prev;
        })
      ) {
        selectEl.value = prev;
      }
    }
  }

  function populateEventAlbumSelect() {
    fillEventAlbumSelectElement(eventModalAlbumSelect, {
      preferOpenAlbum: true,
    });
  }

  function deleteEventItemById(itemId) {
    var state = getEventsState();
    var found = null;
    var ai = -1;
    var ii = -1;
    for (var i = 0; i < state.albums.length; i++) {
      var j = state.albums[i].items.findIndex(function (x) {
        return x.id === itemId;
      });
      if (j !== -1) {
        found = state.albums[i].items[j];
        ai = i;
        ii = j;
        break;
      }
    }
    if (!found) return;
    var next = function () {
      state.albums[ai].items.splice(ii, 1);
      saveEventsState(state);
      renderEvents();
    };
    if (found.mediaKey && idbOk()) {
      FinTatIdb.deleteBlob(found.mediaKey).then(next).catch(next);
    } else {
      next();
    }
  }

  function deleteEventAlbumById(albumId) {
    if (!confirm("Удалить альбом и все мероприятия в нём?")) return;
    var state = getEventsState();
    var idx = state.albums.findIndex(function (a) {
      return a.id === albumId;
    });
    if (idx === -1) return;
    var album = state.albums[idx];
    var keys = [];
    if (album.cover && album.cover.mediaKey) {
      keys.push(album.cover.mediaKey);
    }
    album.items.forEach(function (it) {
      if (it.mediaKey) keys.push(it.mediaKey);
    });

    function finish() {
      state.albums.splice(idx, 1);
      saveEventsState(state);
      if (openEventAlbumId === albumId) {
        openEventAlbumId = null;
      }
      renderEvents();
      populateEventAlbumSelect();
    }

    if (keys.length && idbOk()) {
      var chain = Promise.resolve();
      keys.forEach(function (k) {
        chain = chain.then(function () {
          return FinTatIdb.deleteBlob(k);
        });
      });
      chain.then(finish).catch(finish);
    } else {
      finish();
    }
  }

  function pushEventToAlbum(albumId, fields, rec) {
    var state = getEventsState();
    var album = state.albums.find(function (a) {
      return a.id === albumId;
    });
    if (!album) {
      alert("Альбом не найден. Обновите страницу.");
      return false;
    }
    var evItem = {
      id: newId(),
      type: fields.mediaType,
      src: rec.src || "",
      mediaKey: rec.mediaKey || null,
      title: fields.title,
      description: fields.description,
      publishedDate: fields.publishedDate || null,
      createdAt: new Date().toISOString(),
    };
    if (
      fields.mediaType === "image" &&
      window.FinTatImageFocal &&
      rec.focalX != null &&
      rec.focalY != null
    ) {
      evItem.focalX = window.FinTatImageFocal.clamp(rec.focalX);
      evItem.focalY = window.FinTatImageFocal.clamp(rec.focalY);
    }
    album.items.push(evItem);
    saveEventsState(state);
    renderEvents();
    populateEventAlbumSelect();
    return true;
  }

  function openEventAlbum(albumId) {
    openEventAlbumId = albumId;
    renderEvents();
    try {
      document.getElementById("events").scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    } catch (e) {}
  }

  function closeEventAlbumView() {
    openEventAlbumId = null;
    renderEvents();
  }

  if (eventsBackBtn) {
    eventsBackBtn.addEventListener("click", closeEventAlbumView);
  }

  if (eventsDeleteOpenAlbumBtn) {
    eventsDeleteOpenAlbumBtn.addEventListener("click", function () {
      var id = eventsDeleteOpenAlbumBtn.getAttribute("data-album-id");
      if (id) deleteEventAlbumById(id);
    });
  }

  function revokeEventUrls() {
    eventBlobUrls.forEach(function (u) {
      try {
        URL.revokeObjectURL(u);
      } catch (e) {}
    });
    eventBlobUrls = [];
  }

  function youtubeEmbedUrl(url) {
    if (!url || typeof url !== "string") return null;
    try {
      var u = new URL(url.trim());
      var id = null;
      if (u.hostname === "youtu.be") {
        id = u.pathname.replace(/^\//, "").split("/")[0];
      } else if (
        u.hostname.includes("youtube.com") ||
        u.hostname.includes("youtube-nocookie.com")
      ) {
        id = u.searchParams.get("v");
        if (!id && u.pathname.indexOf("/embed/") !== -1) {
          return url.trim();
        }
        if (!id && u.pathname.indexOf("/shorts/") !== -1) {
          id = u.pathname.split("/shorts/")[1].split("/")[0];
        }
      }
      if (id) return "https://www.youtube.com/embed/" + id;
    } catch (e) {}
    return null;
  }

  /** iOS Safari: без playsinline видео уходит в системный полноэкранный плеер при воспроизведении */
  function applyInlineFileVideoAttrs(el) {
    if (!el || String(el.nodeName).toLowerCase() !== "video") return;
    el.playsInline = true;
    el.setAttribute("playsinline", "");
    el.setAttribute("webkit-playsinline", "");
  }

  function fillEventMediaSync(wrap, item, opts) {
    opts = opts || {};
    var isCover = opts.isCover;
    if (item.type === "image") {
      var img = document.createElement("img");
      img.src = item.src || "";
      img.alt = item.title || "";
      img.loading = "lazy";
      wrap.appendChild(img);
      if (window.FinTatImageFocal) {
        window.FinTatImageFocal.applyToImg(img, item);
      }
      return;
    }
    var embed = youtubeEmbedUrl(item.src);
    if (embed) {
      var iframe = document.createElement("iframe");
      iframe.src = embed;
      iframe.title = "Видео";
      iframe.loading = "lazy";
      iframe.allowFullscreen = !isCover;
      iframe.setAttribute(
        "allow",
        "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      );
      wrap.appendChild(iframe);
    } else if (item.src && /\.(mp4|webm|ogg)(\?|$)/i.test(item.src)) {
      var video = document.createElement("video");
      video.src = item.src;
      video.controls = !isCover;
      applyInlineFileVideoAttrs(video);
      if (isCover) video.muted = true;
      wrap.appendChild(video);
    } else if (item.src) {
      var link = document.createElement("a");
      link.href = item.src;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.className = "event-card__link";
      link.textContent = "Открыть видео";
      wrap.appendChild(link);
    }
  }

  function fillEventItemMedia(mediaWrap, item, opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      if (item.mediaKey && idbOk()) {
        FinTatIdb.getBlob(item.mediaKey)
          .then(function (blob) {
            if (!blob) {
              mediaWrap.textContent = "Файл не найден";
              resolve();
              return;
            }
            var url = URL.createObjectURL(blob);
            eventBlobUrls.push(url);
            if (item.type === "image") {
              var img = document.createElement("img");
              img.src = url;
              img.alt = item.title || "";
              img.loading = "lazy";
              mediaWrap.appendChild(img);
              if (window.FinTatImageFocal) {
                window.FinTatImageFocal.applyToImg(img, item);
              }
            } else {
              var v = document.createElement("video");
              v.src = url;
              v.controls = !opts.isCover;
              applyInlineFileVideoAttrs(v);
              if (opts.isCover) v.muted = true;
              mediaWrap.appendChild(v);
              if (opts.isCover) {
                var play = document.createElement("span");
                play.className = "gallery-album-card__play";
                play.setAttribute("aria-hidden", "true");
                play.textContent = "▶";
                mediaWrap.appendChild(play);
              }
            }
            resolve();
          })
          .catch(function () {
            mediaWrap.textContent = "Ошибка загрузки";
            resolve();
          });
      } else {
        fillEventMediaSync(mediaWrap, item, opts);
        if (
          opts.isCover &&
          item.type === "video" &&
          item.src &&
          !item.mediaKey
        ) {
          var play2 = document.createElement("span");
          play2.className = "gallery-album-card__play";
          play2.setAttribute("aria-hidden", "true");
          play2.textContent = "▶";
          mediaWrap.appendChild(play2);
        }
        resolve();
      }
    });
  }

  function buildEventCard(item, isAdmin, opts) {
    opts = opts || {};
    var albumTitleNorm =
      opts.albumTitle != null ? String(opts.albumTitle).trim() : "";
    var rawTitle = item.title != null ? String(item.title).trim() : "";
    var rawDesc =
      item.description != null ? String(item.description).trim() : "";

    var headline = rawTitle;
    var para = rawDesc;
    if (albumTitleNorm && rawTitle && rawDesc) {
      if (rawTitle.toLowerCase() === albumTitleNorm.toLowerCase()) {
        headline = rawDesc;
        para = "";
      }
    }
    if (!headline && para) {
      headline = para;
      para = "";
    }
    if (!headline) {
      headline = "Без названия";
    }

    return new Promise(function (resolve) {
      var card = document.createElement("article");
      card.className = "event-card";

      var media = document.createElement("div");
      media.className = "event-card__media";

      function afterMedia() {
        card.appendChild(media);

        var capParts = [];
        if (headline && headline !== "Без названия") {
          capParts.push(headline);
        }
        if (para) {
          capParts.push(para);
        }
        var lightboxCaption = capParts.join("\n\n");

        if (
          window.FinTatMediaLightbox &&
          window.FinTatMediaLightbox.bindCardMedia &&
          (item.type === "image" || item.type === "video") &&
          media.querySelector("img, video, iframe")
        ) {
          window.FinTatMediaLightbox.bindCardMedia(
            media,
            item,
            lightboxCaption
          );
        }

        var title = document.createElement("h3");
        title.className = "event-card__title";
        title.textContent = headline;
        card.appendChild(title);

        var evDate = formatEntityDate(item);
        if (evDate) {
          var timeEl = document.createElement("time");
          timeEl.className = "event-card__date";
          var edt = timeDatetimeForEntity(item);
          if (edt) timeEl.setAttribute("datetime", edt);
          timeEl.textContent = evDate;
          card.appendChild(timeEl);
        }

        if (para) {
          var desc = document.createElement("p");
          desc.className = "event-card__desc";
          desc.textContent = para;
          card.appendChild(desc);
        }

        if (isAdmin) {
          var footer = document.createElement("div");
          footer.className = "event-card__footer";
          var editBtn = document.createElement("button");
          editBtn.type = "button";
          editBtn.className = "btn btn--small btn--muted";
          editBtn.textContent = "Изменить";
          editBtn.addEventListener("click", function () {
            closeMobileNav();
            openEventModal({ editItemId: item.id });
          });
          footer.appendChild(editBtn);
          var del = document.createElement("button");
          del.type = "button";
          del.className = "btn btn--small btn--danger";
          del.textContent = "Удалить";
          del.setAttribute("data-event-id", item.id);
          footer.appendChild(del);
          card.appendChild(footer);
          del.addEventListener("click", function () {
            deleteEventItemById(del.getAttribute("data-event-id"));
          });
        }

        resolve(card);
      }

      var itemForMedia = Object.assign({}, item, { title: headline });
      fillEventItemMedia(media, itemForMedia, {}).then(afterMedia);
    });
  }

  function buildEventAlbumCard(album, isAdmin) {
    return new Promise(function (resolve) {
      var card = document.createElement("article");
      card.className = "gallery-album-card";

      var clickArea = document.createElement("div");
      clickArea.className = "gallery-album-card__click";
      clickArea.setAttribute("role", "button");
      clickArea.tabIndex = 0;
      clickArea.setAttribute(
        "aria-label",
        "Открыть альбом «" + (album.title || "") + "»"
      );

      var cover = document.createElement("div");
      cover.className = "gallery-album-card__cover";

      var coverItem = buildEventAlbumCoverMediaItem(album);

      function finishBody() {
        var body = document.createElement("div");
        body.className = "gallery-album-card__body";
        var h = document.createElement("h3");
        h.className = "gallery-album-card__title";
        h.textContent = album.title || "Без названия";
        var meta = document.createElement("p");
        meta.className = "gallery-album-card__meta";
        var n = album.items ? album.items.length : 0;
        meta.textContent =
          n +
          " " +
          pluralRu(n, "мероприятие", "мероприятия", "мероприятий");
        body.appendChild(h);
        body.appendChild(meta);
        var albDate = formatEntityDate(album);
        if (albDate) {
          var albTime = document.createElement("time");
          albTime.className = "gallery-album-card__date";
          var adt = timeDatetimeForEntity(album);
          if (adt) albTime.setAttribute("datetime", adt);
          albTime.textContent = albDate;
          body.appendChild(albTime);
        }
        clickArea.appendChild(cover);
        clickArea.appendChild(body);
        card.appendChild(clickArea);

        function open() {
          openEventAlbum(album.id);
        }
        clickArea.addEventListener("click", open);
        clickArea.addEventListener("keydown", function (e) {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            open();
          }
        });

        if (isAdmin) {
          var footer = document.createElement("div");
          footer.className = "gallery-album-card__footer";
          var editAl = document.createElement("button");
          editAl.type = "button";
          editAl.className = "btn btn--small btn--muted";
          editAl.textContent = "Изменить";
          editAl.addEventListener("click", function (e) {
            e.stopPropagation();
            closeMobileNav();
            openEventModal({ editAlbumId: album.id });
          });
          footer.appendChild(editAl);
          var del = document.createElement("button");
          del.type = "button";
          del.className = "btn btn--small btn--danger";
          del.textContent = "Удалить альбом";
          del.addEventListener("click", function (e) {
            e.stopPropagation();
            deleteEventAlbumById(album.id);
          });
          footer.appendChild(del);
          card.appendChild(footer);
        }

        resolve(card);
      }

      if (!coverItem) {
        cover.classList.add("gallery-album-card__cover--empty");
        finishBody();
        return;
      }

      fillEventItemMedia(cover, coverItem, { isCover: true }).then(finishBody);
    });
  }

  /* fixed внутри .section с overflow:hidden не на весь экран — переносим в body */
  function syncEventAlbumPortal() {
    if (!eventsOpenAlbum || !eventsLayout) return;
    if (openEventAlbumId) {
      if (eventsOpenAlbum.parentNode !== document.body) {
        document.body.appendChild(eventsOpenAlbum);
      }
    } else if (eventsOpenAlbum.parentNode === document.body) {
      eventsLayout.appendChild(eventsOpenAlbum);
    }
  }

  function renderEvents() {
    if (!eventsGrid || !eventsEmpty) return;
    syncEventsAdminChrome();
    setEventsEmptyMessages();
    revokeEventUrls();
    document.body.classList.remove("album-view-open-events");

    if (
      !eventsLayout ||
      !eventsAlbumsView ||
      !eventsOpenAlbum ||
      !eventsAlbumsGrid
    ) {
      var stFlat = getEventsState();
      var flat = [];
      stFlat.albums.forEach(function (a) {
        a.items.forEach(function (it) {
          flat.push(it);
        });
      });
      eventsGrid.innerHTML = "";
      eventsEmpty.hidden = flat.length > 0;
      if (flat.length === 0) return;
      var isAd = !!getSessionLogin();
      Promise.all(
        flat
          .slice()
          .reverse()
          .map(function (it) {
            return buildEventCard(it, isAd);
          })
      ).then(function (cards) {
        cards.forEach(function (c) {
          eventsGrid.appendChild(c);
        });
      });
      return;
    }

    try {
      var state = getEventsState();
      var albums = state.albums.slice().reverse();

      if (openEventAlbumId) {
        var current = state.albums.find(function (a) {
          return a.id === openEventAlbumId;
        });
        if (!current) {
          openEventAlbumId = null;
          renderEvents();
          return;
        }
        eventsAlbumsView.hidden = true;
        eventsOpenAlbum.hidden = false;
        eventsAlbumsGrid.innerHTML = "";
        if (eventsAlbumsEmpty) eventsAlbumsEmpty.hidden = true;

        if (eventsDeleteOpenAlbumBtn) {
          if (getSessionLogin()) {
            eventsDeleteOpenAlbumBtn.hidden = false;
            eventsDeleteOpenAlbumBtn.setAttribute("data-album-id", current.id);
          } else {
            eventsDeleteOpenAlbumBtn.hidden = true;
            eventsDeleteOpenAlbumBtn.removeAttribute("data-album-id");
          }
        }

        if (eventsOpenAlbumCover) {
          eventsOpenAlbumCover.innerHTML = "";
          var covItem = buildEventAlbumCoverMediaItem(current);
          if (covItem) {
            eventsOpenAlbumCover.hidden = false;
            var covInner = document.createElement("div");
            covInner.className = "gallery-open-album__cover-media";
            eventsOpenAlbumCover.appendChild(covInner);
            fillEventItemMedia(covInner, covItem, {}).then(function () {});
          } else {
            eventsOpenAlbumCover.hidden = true;
          }
        }

        eventsGrid.innerHTML = "";
        var items = current.items.slice().reverse();
        eventsEmpty.hidden = items.length > 0;
        var isAdmin = !!getSessionLogin();
        Promise.all(
          items.map(function (it) {
            return buildEventCard(it, isAdmin, {
              albumTitle: current.title,
            });
          })
        ).then(function (cards) {
          cards.forEach(function (c) {
            eventsGrid.appendChild(c);
          });
        });
        document.body.classList.add("album-view-open-events");
        return;
      }

      eventsAlbumsView.hidden = false;
      eventsOpenAlbum.hidden = true;
      if (eventsDeleteOpenAlbumBtn) {
        eventsDeleteOpenAlbumBtn.hidden = true;
        eventsDeleteOpenAlbumBtn.removeAttribute("data-album-id");
      }
      if (eventsOpenAlbumCover) {
        eventsOpenAlbumCover.innerHTML = "";
        eventsOpenAlbumCover.hidden = true;
      }
      eventsGrid.innerHTML = "";
      eventsAlbumsGrid.innerHTML = "";
      if (eventsAlbumsEmpty) {
        eventsAlbumsEmpty.hidden = albums.length > 0;
      }
      eventsEmpty.hidden = true;

      if (albums.length === 0) {
        return;
      }

      var isAdminAlbums = !!getSessionLogin();
      Promise.all(
        albums.map(function (a) {
          return buildEventAlbumCard(a, isAdminAlbums);
        })
      ).then(function (cards) {
        cards.forEach(function (c) {
          eventsAlbumsGrid.appendChild(c);
        });
      });
    } finally {
      syncEventAlbumPortal();
    }
  }

  function applyEventModalMode() {
    var titleEl = document.getElementById("event-title");
    var editingItem = !!eventEditItemId;
    var editingAlbum = !!eventEditAlbumId;

    if (eventModalSectionPick) {
      eventModalSectionPick.hidden =
        editingItem || editingAlbum || eventModalAlbumOnly;
    }
    if (eventModalSectionAlbumFields) {
      eventModalSectionAlbumFields.hidden = editingItem;
    }
    if (eventModalSectionActivity) {
      eventModalSectionActivity.hidden =
        editingAlbum || eventModalAlbumOnly;
    }

    if (editingItem) {
      if (eventModalHeading) {
        eventModalHeading.textContent = "Редактировать мероприятие";
      }
      if (eventModalSubmitBtn) {
        eventModalSubmitBtn.textContent = "Сохранить";
      }
      if (titleEl) titleEl.setAttribute("required", "required");
    } else if (editingAlbum) {
      if (eventModalHeading) {
        eventModalHeading.textContent = "Редактировать альбом";
      }
      if (eventModalSubmitBtn) {
        eventModalSubmitBtn.textContent = "Сохранить";
      }
      if (titleEl) titleEl.removeAttribute("required");
      if (eventModalLabelAlbumNew) {
        eventModalLabelAlbumNew.textContent = "Название альбома";
      }
      if (eventModalLabelAlbumDate) {
        eventModalLabelAlbumDate.textContent = "Дата альбома";
      }
      if (eventModalLabelAlbumCover) {
        eventModalLabelAlbumCover.textContent =
          "Новая обложка (необязательно)";
      }
      if (eventModalAlbumNew) {
        eventModalAlbumNew.placeholder = "";
      }
    } else if (eventModalAlbumOnly) {
      if (eventModalHeading) eventModalHeading.textContent = "Новый альбом";
      if (eventModalSubmitBtn) eventModalSubmitBtn.textContent = "Создать альбом";
      if (titleEl) titleEl.removeAttribute("required");
      if (eventModalLabelAlbumNew) {
        eventModalLabelAlbumNew.textContent = "Название альбома";
      }
      if (eventModalLabelAlbumDate) {
        eventModalLabelAlbumDate.textContent = "Дата альбома";
      }
      if (eventModalLabelAlbumCover) {
        eventModalLabelAlbumCover.textContent =
          "Фото обложки (необязательно)";
      }
      if (eventModalAlbumNew) {
        eventModalAlbumNew.placeholder = "Например: Дружба землячеств";
      }
    } else {
      if (eventModalHeading) {
        eventModalHeading.textContent = "Новое мероприятие";
      }
      if (eventModalSubmitBtn) {
        eventModalSubmitBtn.textContent = "Опубликовать";
      }
      if (titleEl) titleEl.setAttribute("required", "required");
      if (eventModalLabelAlbumNew) {
        eventModalLabelAlbumNew.textContent = "Новый альбом";
      }
      if (eventModalLabelAlbumDate) {
        eventModalLabelAlbumDate.textContent =
          "Дата альбома (если создаёте новый)";
      }
      if (eventModalLabelAlbumCover) {
        eventModalLabelAlbumCover.textContent =
          "Фото обложки альбома (если создаёте новый)";
      }
      if (eventModalAlbumNew) {
        eventModalAlbumNew.placeholder =
          "Если нужен новый альбом — введите название";
      }
    }
    refreshEventFocalEditor();
  }

  function openEventModal(opts) {
    opts = opts || {};
    if (opts.editItemId) {
      if (!getSessionLogin()) return;
      eventEditItemId = opts.editItemId;
      eventEditAlbumId = null;
      eventModalAlbumOnly = false;
    } else if (opts.editAlbumId) {
      if (!getSessionLogin()) return;
      eventEditAlbumId = opts.editAlbumId;
      eventEditItemId = null;
      eventModalAlbumOnly = false;
    } else {
      if (!getSessionLogin()) return;
      eventEditItemId = null;
      eventEditAlbumId = null;
      eventModalAlbumOnly = !!opts.albumOnly;
    }
    eventModal.hidden = false;
    document.body.classList.add("event-modal-open");
    populateEventAlbumSelect();
    if (opts.editItemId) {
      prefillEventEditItem(opts.editItemId);
    } else if (opts.editAlbumId) {
      prefillEventEditAlbum(opts.editAlbumId);
    } else {
      syncEventMediaFields();
      setEventDateDefault();
      setEventModalAlbumDateDefault();
    }
    if (opts.editItemId || opts.editAlbumId) {
      syncEventMediaFields();
    }
    applyEventModalMode();
    syncEventModalElevation();
  }

  function closeEventModal() {
    teardownEventFocalEditor();
    eventModalAlbumOnly = false;
    eventEditItemId = null;
    eventEditAlbumId = null;
    eventModal.hidden = true;
    document.body.classList.remove("event-modal-open");
    if (eventForm) eventForm.reset();
    syncEventMediaFields();
    setEventDateDefault();
    setEventModalAlbumDateDefault();
    if (eventModalAlbumNew) eventModalAlbumNew.value = "";
    if (eventModalAlbumCoverFile) eventModalAlbumCoverFile.value = "";
    populateEventAlbumSelect();
    applyEventModalMode();
    syncEventModalElevation();
  }

  function syncEventMediaFields() {
    if (!eventForm) return;
    var type = eventForm.querySelector(
      'input[name="eventMediaType"]:checked'
    );
    var isVideo = type && type.value === "video";
    if (eventFile) {
      eventFile.disabled = false;
      eventFile.accept = isVideo ? "video/*" : "image/*";
      var fileWrap = eventFile.closest(".event-field-file");
      if (fileWrap) fileWrap.style.opacity = "1";
    }
    refreshEventFocalEditor();
  }

  if (openBtn) {
    openBtn.addEventListener("click", function () {
      if (!getSessionLogin()) return;
      closeMobileNav();
      openEventModal({ albumOnly: true });
    });
  }

  if (eventsOpenAddInnerBtn) {
    eventsOpenAddInnerBtn.addEventListener("click", function () {
      if (!getSessionLogin()) return;
      closeMobileNav();
      openEventModal({ albumOnly: false });
    });
  }

  eventModal.querySelectorAll("[data-event-close]").forEach(function (el) {
    el.addEventListener("click", closeEventModal);
  });

  eventModal.addEventListener("click", function (e) {
    if (e.target.classList.contains("event-modal__backdrop")) {
      closeEventModal();
    }
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !eventModal.hidden) {
      closeEventModal();
    }
  });

  if (eventForm) {
    eventForm
      .querySelectorAll('input[name="eventMediaType"]')
      .forEach(function (r) {
        r.addEventListener("change", syncEventMediaFields);
      });
    if (eventFile) {
      eventFile.addEventListener("change", refreshEventFocalEditor);
    }
    if (eventFocalReset) {
      eventFocalReset.addEventListener("click", function () {
        if (eventFocalBinder && eventFocalBinder.setFocal) {
          eventFocalBinder.setFocal(50, 50);
        }
      });
    }

    eventForm.addEventListener("submit", function (e) {
      e.preventDefault();

      if (eventEditAlbumId) {
        if (!getSessionLogin()) return;
        var evEditName =
          eventModalAlbumNew && eventModalAlbumNew.value.trim();
        if (!evEditName) {
          alert("Введите название альбома.");
          return;
        }
        var evEditAlbDate = readDateInput(eventModalAlbumDateInput);
        var stEvAlb = getEventsState();
        var albEvEdit = stEvAlb.albums.find(function (a) {
          return a.id === eventEditAlbumId;
        });
        if (!albEvEdit) {
          alert("Альбом не найден.");
          return;
        }
        var evEditCoverFile =
          eventModalAlbumCoverFile && eventModalAlbumCoverFile.files[0];
        var prevEvCoverKey = albEvEdit.cover && albEvEdit.cover.mediaKey;

        function persistEventAlbumEdit() {
          albEvEdit.title = evEditName;
          albEvEdit.publishedDate = evEditAlbDate || null;
          saveEventsState(stEvAlb);
          populateEventAlbumSelect();
          renderEvents();
          closeEventModal();
        }

        if (evEditCoverFile) {
          if (!idbOk()) {
            alert("Нужен IndexedDB для загрузки обложки.");
            return;
          }
          if (!evEditCoverFile.type.startsWith("image/")) {
            alert("Обложка — только изображение.");
            return;
          }
          if (evEditCoverFile.size > MAX_IMAGE_FILE) {
            alert("Обложка больше 50 МБ.");
            return;
          }
          FinTatIdb.saveBlob(evEditCoverFile)
            .then(function (ck) {
              albEvEdit.cover = {
                type: "image",
                mediaKey: ck,
                src: "",
              };
              var chEv = Promise.resolve();
              if (prevEvCoverKey && prevEvCoverKey !== ck) {
                chEv = FinTatIdb.deleteBlob(prevEvCoverKey);
              }
              chEv.then(persistEventAlbumEdit).catch(persistEventAlbumEdit);
            })
            .catch(function () {
              alert("Не удалось сохранить обложку.");
            });
          return;
        }

        persistEventAlbumEdit();
        return;
      }

      if (eventEditItemId) {
        if (!getSessionLogin()) return;
        var evTitleEl = document.getElementById("event-title");
        var evDescEl = document.getElementById("event-description");
        var evEdTitle = (evTitleEl && evTitleEl.value.trim()) || "";
        if (!evEdTitle) {
          alert("Введите название.");
          return;
        }
        var evEdDesc =
          (evDescEl && evDescEl.value.trim()) || "";
        var evEdTypeInput = eventForm.querySelector(
          'input[name="eventMediaType"]:checked'
        );
        var evEdMediaType = evEdTypeInput ? evEdTypeInput.value : "image";
        var evEdFile = eventFile && eventFile.files[0];
        var evEdPub = readDateInput(eventDateInput);
        var stEvIt = getEventsState();
        var locEvEd = findEventItemState(eventEditItemId);
        if (!locEvEd) {
          alert("Запись не найдена.");
          return;
        }
        var itEvEd = locEvEd.item;
        if (itEvEd.type !== evEdMediaType && !evEdFile) {
          alert(
            "Чтобы сменить тип фото/видео, загрузите новый файл."
          );
          return;
        }

        function applyEventEditedFocal() {
          if (evEdMediaType !== "image" || !window.FinTatImageFocal) {
            delete itEvEd.focalX;
            delete itEvEd.focalY;
            return;
          }
          if (
            !eventFocalWrap ||
            eventFocalWrap.hidden ||
            !eventFocalBinder
          ) {
            return;
          }
          var efp = getEventFocalFromEditor();
          itEvEd.focalX = efp.x;
          itEvEd.focalY = efp.y;
        }

        function finishEventItemEdit() {
          saveEventsState(stEvIt);
          renderEvents();
          populateEventAlbumSelect();
          closeEventModal();
        }

        if (!evEdFile) {
          itEvEd.title = evEdTitle;
          itEvEd.description = evEdDesc;
          itEvEd.publishedDate = evEdPub || null;
          applyEventEditedFocal();
          finishEventItemEdit();
          return;
        }

        if (evEdFile) {
          if (!idbOk()) {
            alert(
              "Ваш браузер не поддерживает хранение файлов (IndexedDB)."
            );
            return;
          }
          if (evEdMediaType === "image") {
            if (!evEdFile.type.startsWith("image/")) {
              alert("Выберите файл изображения.");
              return;
            }
            if (evEdFile.size > MAX_IMAGE_FILE) {
              alert("Фото больше 50 МБ.");
              return;
            }
          } else {
            if (!evEdFile.type.startsWith("video/")) {
              var okEvEx = /\.(mp4|webm|ogg|mov|m4v)$/i.test(evEdFile.name);
              if (!okEvEx) {
                alert("Выберите видеофайл (.mp4, .webm, .mov…).");
                return;
              }
            }
            if (evEdFile.size > MAX_VIDEO_FILE) {
              alert("Видео больше 200 МБ.");
              return;
            }
          }
          var oldEvMedKey = itEvEd.mediaKey;
          FinTatIdb.saveBlob(evEdFile)
            .then(function (nEvKey) {
              itEvEd.mediaKey = nEvKey;
              itEvEd.src = "";
              itEvEd.type = evEdMediaType;
              itEvEd.title = evEdTitle;
              itEvEd.description = evEdDesc;
              itEvEd.publishedDate = evEdPub || null;
              applyEventEditedFocal();
              var chEvIt = Promise.resolve();
              if (oldEvMedKey && oldEvMedKey !== nEvKey) {
                chEvIt = FinTatIdb.deleteBlob(oldEvMedKey);
              }
              chEvIt.then(finishEventItemEdit).catch(finishEventItemEdit);
            })
            .catch(function () {
              alert("Не удалось сохранить файл.");
            });
          return;
        }
      }

      if (eventModalAlbumOnly) {
        if (!getSessionLogin()) return;
        var onlyName =
          eventModalAlbumNew && eventModalAlbumNew.value.trim();
        if (!onlyName) {
          alert("Введите название альбома.");
          return;
        }
        var onlyAlbDate = readDateInput(eventModalAlbumDateInput);
        var newAlbumId = newId();
        var onlyCoverFile =
          eventModalAlbumCoverFile && eventModalAlbumCoverFile.files[0];

        function finishEventAlbumOnly(coverObj) {
          var st = getEventsState();
          st.albums.push({
            id: newAlbumId,
            title: onlyName,
            publishedDate: onlyAlbDate || null,
            createdAt: new Date().toISOString(),
            cover: coverObj,
            items: [],
          });
          saveEventsState(st);
          populateEventAlbumSelect();
          closeEventModal();
          openEventAlbum(newAlbumId);
        }

        if (onlyCoverFile) {
          if (!idbOk()) {
            alert("Нужен IndexedDB для загрузки обложки альбома.");
            return;
          }
          if (!onlyCoverFile.type.startsWith("image/")) {
            alert("Обложка альбома — только изображение.");
            return;
          }
          if (onlyCoverFile.size > MAX_IMAGE_FILE) {
            alert("Обложка больше 50 МБ.");
            return;
          }
          FinTatIdb.saveBlob(onlyCoverFile)
            .then(function (ck) {
              finishEventAlbumOnly({
                type: "image",
                mediaKey: ck,
                src: "",
              });
            })
            .catch(function () {
              alert("Не удалось сохранить обложку альбома.");
            });
          return;
        }

        finishEventAlbumOnly(null);
        return;
      }

      if (!getSessionLogin()) return;

      var titleEl = document.getElementById("event-title");
      var descEl = document.getElementById("event-description");
      var title = (titleEl && titleEl.value.trim()) || "";
      if (!title) {
        alert("Введите название записи (например, как называется мероприятие на фото).");
        return;
      }
      var description = (descEl && descEl.value.trim()) || "";

      var newName =
        eventModalAlbumNew && eventModalAlbumNew.value.trim();
      var coverFile =
        eventModalAlbumCoverFile && eventModalAlbumCoverFile.files[0];

      var typeInput = eventForm.querySelector(
        'input[name="eventMediaType"]:checked'
      );
      var mediaType = typeInput ? typeInput.value : "image";
      var file = eventFile && eventFile.files[0];
      var eventPubDate = readDateInput(eventDateInput);

      var fields = {
        title: title,
        description: description,
        publishedDate: eventPubDate,
        mediaType: mediaType,
      };

      var albumId;

      function pushEventRecord(rec) {
        var payload = Object.assign({}, rec);
        if (
          mediaType === "image" &&
          window.FinTatImageFocal &&
          eventFocalWrap &&
          !eventFocalWrap.hidden
        ) {
          var efp = getEventFocalFromEditor();
          payload.focalX = efp.x;
          payload.focalY = efp.y;
        }
        if (!pushEventToAlbum(albumId, fields, payload)) return;
        closeEventModal();
      }

      function runEventMediaSave() {
        if (file) {
          if (!idbOk()) {
            alert(
              "Ваш браузер не поддерживает хранение файлов (IndexedDB). Откройте сайт в актуальной версии Chrome, Firefox, Edge или Safari."
            );
            return;
          }
          if (mediaType === "image") {
            if (!file.type.startsWith("image/")) {
              alert("Выберите файл изображения.");
              return;
            }
            if (file.size > MAX_IMAGE_FILE) {
              alert("Фото больше 50 МБ. Уменьшите файл.");
              return;
            }
          } else {
            if (!file.type.startsWith("video/")) {
              var okExt = /\.(mp4|webm|ogg|mov|m4v)$/i.test(file.name);
              if (!okExt) {
                alert("Выберите видеофайл (.mp4, .webm, .mov и т.д.).");
                return;
              }
            }
            if (file.size > MAX_VIDEO_FILE) {
              alert(
                "Видео больше 200 МБ — браузер может не сохранить. Сожмите ролик."
              );
              return;
            }
          }
          FinTatIdb.saveBlob(file)
            .then(function (key) {
              pushEventRecord({ mediaKey: key, src: "" });
            })
            .catch(function () {
              alert(
                "Не удалось сохранить файл. Проверьте место на диске и настройки приватного режима."
              );
            });
          return;
        }

        alert(
          mediaType === "video"
            ? "Выберите видеофайл с устройства."
            : "Выберите фото с устройства."
        );
        return;
      }

      if (newName) {
        albumId = newId();
        var modalAlbDate = readDateInput(eventModalAlbumDateInput);

        function pushNewEventAlbum(coverObj) {
          var st = getEventsState();
          st.albums.push({
            id: albumId,
            title: newName,
            publishedDate: modalAlbDate || null,
            createdAt: new Date().toISOString(),
            cover: coverObj,
            items: [],
          });
          saveEventsState(st);
          populateEventAlbumSelect();
          runEventMediaSave();
        }

        if (coverFile) {
          if (!idbOk()) {
            alert("Нужен IndexedDB для загрузки обложки альбома.");
            return;
          }
          if (!coverFile.type.startsWith("image/")) {
            alert("Обложка альбома — только изображение.");
            return;
          }
          if (coverFile.size > MAX_IMAGE_FILE) {
            alert("Обложка больше 50 МБ.");
            return;
          }
          FinTatIdb.saveBlob(coverFile)
            .then(function (ck) {
              pushNewEventAlbum({
                type: "image",
                mediaKey: ck,
                src: "",
              });
            })
            .catch(function () {
              alert("Не удалось сохранить обложку альбома.");
            });
          return;
        }

        pushNewEventAlbum(null);
        return;
      }

      albumId = eventModalAlbumSelect && eventModalAlbumSelect.value;
      if (!albumId) {
        alert(
          "Выберите альбом из списка или введите название нового альбома."
        );
        return;
      }

      runEventMediaSave();
    });
  }

  window.addEventListener("storage", function (e) {
    if (e.key === STORAGE_SESSION || e.key === STORAGE_EVENTS) {
      renderEvents();
    }
  });

  document.addEventListener("fin-tat-session-changed", function () {
    if (!getSessionLogin() && eventModal && !eventModal.hidden) {
      closeEventModal();
    }
    renderEvents();
  });

  document.addEventListener("fin-tat-admin-modal-toggle", function () {
    syncEventModalElevation();
  });

  populateEventAlbumSelect();
  setEventDateDefault();
  setEventModalAlbumDateDefault();
  syncEventsAdminChrome();
  setEventsEmptyMessages();
  renderEvents();
})();
