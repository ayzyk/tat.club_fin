(function () {
  var STORAGE_SESSION = "fin_tat_admin_session";

  var modal = document.getElementById("admin-modal");
  var loginView = document.getElementById("admin-login-view");
  var panelView = document.getElementById("admin-panel-view");
  var loginForm = document.getElementById("admin-login-form");
  var loginError = document.getElementById("admin-login-error");
  var currentLoginEl = document.getElementById("admin-current-login");

  if (!modal) return;

  function closeMobileNav() {
    var nav = document.querySelector(".nav");
    var toggle = document.querySelector(".nav-toggle");
    if (nav) nav.classList.remove("is-open");
    if (toggle) {
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Открыть меню");
    }
  }

  function getSessionLogin() {
    try {
      return String(localStorage.getItem(STORAGE_SESSION) || "").trim();
    } catch (e) {
      return "";
    }
  }

  function setSessionLogin(login) {
    try {
      if (login) localStorage.setItem(STORAGE_SESSION, login);
      else localStorage.removeItem(STORAGE_SESSION);
    } catch (e) {
      /* ignore */
    }
    document.dispatchEvent(new CustomEvent("fin-tat-session-changed"));
  }

  function showLoginView() {
    loginView.hidden = false;
    panelView.hidden = true;
    if (loginError) {
      loginError.hidden = true;
      loginError.textContent = "";
    }
  }

  function showPanelView() {
    loginView.hidden = true;
    panelView.hidden = false;
    if (currentLoginEl) currentLoginEl.textContent = getSessionLogin();
  }

  function openModal() {
    modal.hidden = false;
    document.body.classList.add("admin-modal-open");
    if (getSessionLogin()) showPanelView();
    else showLoginView();
    document.dispatchEvent(new CustomEvent("fin-tat-admin-modal-toggle"));
  }

  function closeModal() {
    modal.hidden = true;
    document.body.classList.remove("admin-modal-open");
    document.dispatchEvent(new CustomEvent("fin-tat-admin-modal-toggle"));
  }

  function loadAdminUsers() {
    var inline = window.FinTatAdminUsers;
    if (Array.isArray(inline) && inline.length > 0) {
      return Promise.resolve(inline);
    }
    return fetch("admin_users.json", { cache: "no-store" })
      .then(function (r) {
        if (!r.ok) throw new Error("NO_ADMIN_FILE");
        return r.json();
      })
      .then(function (users) {
        if (!Array.isArray(users) || users.length === 0) {
          throw new Error("EMPTY_ADMIN_LIST");
        }
        return users;
      })
      .catch(function () {
        return Promise.reject(
          new Error(
            "Список админов недоступен. Для GitHub Pages: добавьте в репозиторий файл admin_users.json " +
              "в корень сайта (рядом с index.html) и сделайте push, либо заполните массив FinTatAdminUsers в js/admin_users_data.js. " +
              "Помните: в публичном репозитории эти данные будут видны всем."
          )
        );
      });
  }

  document.querySelectorAll(".js-open-admin").forEach(function (el) {
    el.addEventListener("click", function (e) {
      e.preventDefault();
      closeMobileNav();
      openModal();
    });
  });

  modal.querySelectorAll("[data-admin-close]").forEach(function (btn) {
    btn.addEventListener("click", closeModal);
  });

  modal.addEventListener("click", function (e) {
    if (e.target.classList.contains("admin-modal__backdrop")) closeModal();
  });

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (!modal.hidden) closeModal();
  });

  if (loginForm) {
    loginForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var fd = new FormData(loginForm);
      var login = String(fd.get("login") || "").trim();
      var password = String(fd.get("password") || "");

      loadAdminUsers()
        .then(function (users) {
          var ok = users.some(function (u) {
            return (
              u &&
              String(u.login) === login &&
              String(u.password) === password
            );
          });
          if (!ok) {
            if (loginError) {
              loginError.textContent = "Неверный логин или пароль";
              loginError.hidden = false;
            }
            return;
          }
          setSessionLogin(login);
          showPanelView();
          loginForm.reset();
        })
        .catch(function (err) {
          if (loginError) {
            var msg =
              (err && err.message) ||
              "Не удалось загрузить список администраторов.";
            if (/load failed|failed to fetch|networkerror/i.test(msg)) {
              msg =
                "Не удалось загрузить admin_users.json (часто при открытии файла с диска). Убедитесь, что подключён js/admin_users_data.js перед admin.js.";
            }
            loginError.textContent = msg;
            loginError.hidden = false;
          }
        });
    });
  }

  var logoutBtn = document.getElementById("admin-logout");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", function () {
      setSessionLogin("");
      showLoginView();
    });
  }
})();
