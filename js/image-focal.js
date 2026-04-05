(function (global) {
  var DEF = 50;

  function clamp(v) {
    var n = Number(v);
    if (!isFinite(n)) return DEF;
    return Math.max(0, Math.min(100, n));
  }

  function getXY(item) {
    if (!item) return { x: DEF, y: DEF };
    return {
      x: item.focalX != null ? clamp(item.focalX) : DEF,
      y: item.focalY != null ? clamp(item.focalY) : DEF,
    };
  }

  function applyToImg(img, item) {
    if (!img || !item || item.type !== "image") return;
    var p = getXY(item);
    img.style.objectFit = "cover";
    img.style.objectPosition = p.x + "% " + p.y + "%";
  }

  function bindPanEditor(frame, img, initialXY, onChange) {
    var x = clamp(initialXY && initialXY.x);
    var y = clamp(initialXY && initialXY.y);

    function apply() {
      img.style.objectFit = "cover";
      img.style.width = "100%";
      img.style.height = "100%";
      img.style.objectPosition = x + "% " + y + "%";
      if (typeof onChange === "function") onChange(x, y);
    }

    apply();

    var dragging = false;
    var startPx;
    var startPy;
    var startX;
    var startY;

    function move(ev) {
      if (!dragging) return;
      var rect = frame.getBoundingClientRect();
      var w = rect.width || 1;
      var h = rect.height || 1;
      x = clamp(startX - ((ev.clientX - startPx) / w) * 100);
      y = clamp(startY - ((ev.clientY - startPy) / h) * 100);
      apply();
    }

    function up() {
      if (!dragging) return;
      dragging = false;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    }

    function down(ev) {
      if (ev.pointerType === "mouse" && ev.button != null && ev.button !== 0) {
        return;
      }
      dragging = true;
      startPx = ev.clientX;
      startPy = ev.clientY;
      startX = x;
      startY = y;
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      window.addEventListener("pointercancel", up);
      ev.preventDefault();
    }

    frame.addEventListener("pointerdown", down);

    return {
      destroy: function () {
        frame.removeEventListener("pointerdown", down);
        up();
      },
      setFocal: function (nx, ny) {
        x = clamp(nx);
        y = clamp(ny);
        apply();
      },
      getFocal: function () {
        return { x: x, y: y };
      },
    };
  }

  global.FinTatImageFocal = {
    DEFAULT: DEF,
    clamp: clamp,
    getXY: getXY,
    applyToImg: applyToImg,
    bindPanEditor: bindPanEditor,
  };
})(window);
