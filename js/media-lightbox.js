(function () {
  var overlay = null;
  var stage = null;
  var captionEl = null;
  var keyHandler = null;

  function detachKey() {
    if (keyHandler) {
      document.removeEventListener("keydown", keyHandler, true);
      keyHandler = null;
    }
  }

  function close() {
    if (!overlay) return;
    var v = stage && stage.querySelector("video");
    if (v) {
      try {
        v.pause();
      } catch (e) {}
    }
    if (stage) stage.innerHTML = "";
    if (captionEl) {
      captionEl.textContent = "";
      captionEl.hidden = true;
    }
    overlay.hidden = true;
    document.body.classList.remove("media-lightbox-open");
    detachKey();
  }

  function attachKey() {
    detachKey();
    keyHandler = function (e) {
      if (e.key === "Escape" && overlay && !overlay.hidden) {
        e.preventDefault();
        e.stopPropagation();
        close();
      }
    };
    document.addEventListener("keydown", keyHandler, true);
  }

  function setCaption(text) {
    var t = (text && String(text).trim()) || "";
    if (t) {
      captionEl.textContent = t;
      captionEl.hidden = false;
    } else {
      captionEl.textContent = "";
      captionEl.hidden = true;
    }
  }

  function ensure() {
    if (overlay) return;
    overlay = document.createElement("div");
    overlay.className = "media-lightbox";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Просмотр медиа");
    overlay.hidden = true;

    var backdrop = document.createElement("button");
    backdrop.type = "button";
    backdrop.className = "media-lightbox__backdrop";
    backdrop.setAttribute("aria-label", "Закрыть");

    stage = document.createElement("div");
    stage.className = "media-lightbox__stage";

    captionEl = document.createElement("p");
    captionEl.className = "media-lightbox__caption";
    captionEl.hidden = true;

    var closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "media-lightbox__close";
    closeBtn.setAttribute("aria-label", "Закрыть");
    closeBtn.innerHTML = "&times;";

    backdrop.addEventListener("click", close);
    closeBtn.addEventListener("click", close);

    overlay.appendChild(backdrop);
    overlay.appendChild(stage);
    overlay.appendChild(captionEl);
    overlay.appendChild(closeBtn);
    document.body.appendChild(overlay);
  }

  window.FinTatMediaLightbox = {
    close: close,

    /**
     * Клик по превью в карточке альбома: фото — лайтбокс; загруженное видео (файл) —
     * только встроенный плеер, полный экран по желанию через контролы браузера;
     * встраиваемое видео (YouTube и т.д.) — лайтбокс.
     */
    bindCardMedia: function (mediaWrap, item, caption) {
      if (!mediaWrap || !item) return;
      var lb = window.FinTatMediaLightbox;
      if (!lb || !lb.openImage) return;

      var cap =
        caption != null && String(caption).trim()
          ? String(caption).trim()
          : "";

      if (item.type === "video") {
        var fileVideo = mediaWrap.querySelector("video");
        var embedFrame = mediaWrap.querySelector("iframe");
        if (fileVideo && fileVideo.src && !embedFrame) {
          fileVideo.controls = true;
          fileVideo.playsInline = true;
          fileVideo.setAttribute("playsinline", "");
          fileVideo.setAttribute("webkit-playsinline", "");
          return;
        }
      }

      mediaWrap.classList.add("album-media--zoomable");
      mediaWrap.setAttribute("role", "button");
      mediaWrap.setAttribute("tabindex", "0");
      mediaWrap.setAttribute(
        "aria-label",
        item.type === "image"
          ? "Открыть фото на весь экран"
          : "Открыть видео на весь экран"
      );

      function isFooterClick(target) {
        if (!target || !target.closest) return false;
        return !!target.closest(
          ".gallery-card__footer, .event-card__footer"
        );
      }

      function openFromPreview(e) {
        if (e && isFooterClick(e.target)) return;

        var img = mediaWrap.querySelector("img");
        var iframe = mediaWrap.querySelector("iframe");

        if (item.type === "image" && img && img.src) {
          lb.openImage(img.src, cap);
          return;
        }
        if (item.type === "video" && iframe && iframe.src) {
          lb.openEmbed(iframe.src, cap);
        }
      }

      mediaWrap.addEventListener("click", openFromPreview);
      mediaWrap.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openFromPreview(e);
        }
      });
    },

    openImage: function (src, caption) {
      if (!src) return;
      ensure();
      stage.innerHTML = "";
      var img = document.createElement("img");
      img.className = "media-lightbox__img";
      img.src = src;
      img.alt = (caption && String(caption).slice(0, 200)) || "";
      stage.appendChild(img);
      setCaption(caption);
      overlay.hidden = false;
      document.body.classList.add("media-lightbox-open");
      attachKey();
    },

    openVideo: function (src, caption) {
      if (!src) return;
      ensure();
      stage.innerHTML = "";
      var v = document.createElement("video");
      v.className = "media-lightbox__video";
      v.src = src;
      v.controls = true;
      v.playsInline = true;
      v.setAttribute("controlsList", "nodownload");
      stage.appendChild(v);
      setCaption(caption);
      overlay.hidden = false;
      document.body.classList.add("media-lightbox-open");
      attachKey();
    },

    openEmbed: function (embedSrc, caption) {
      if (!embedSrc) return;
      ensure();
      stage.innerHTML = "";
      var iframe = document.createElement("iframe");
      iframe.className = "media-lightbox__iframe";
      iframe.src = embedSrc;
      iframe.title = "Видео";
      iframe.setAttribute(
        "allow",
        "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
      );
      iframe.allowFullscreen = true;
      stage.appendChild(iframe);
      setCaption(caption);
      overlay.hidden = false;
      document.body.classList.add("media-lightbox-open");
      attachKey();
    },
  };
})();
