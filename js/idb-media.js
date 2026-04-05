/**
 * Хранение бинарных файлов (фото/видео) в IndexedDB.
 * localStorage только для метаданных — без жёсткого лимита «2 МБ» на файл.
 */
(function (global) {
  var DB_NAME = "fin_tat_media";
  var STORE = "blobs";
  var VERSION = 1;

  function openDb() {
    return new Promise(function (resolve, reject) {
      var req = indexedDB.open(DB_NAME, VERSION);
      req.onerror = function () {
        reject(req.error);
      };
      req.onsuccess = function () {
        resolve(req.result);
      };
      req.onupgradeneeded = function (e) {
        var db = e.target.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE);
        }
      };
    });
  }

  function saveBlob(blob) {
    var key =
      "m-" +
      Date.now() +
      "-" +
      Math.random().toString(36).slice(2, 11);
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, "readwrite");
        tx.oncomplete = function () {
          resolve(key);
        };
        tx.onerror = function () {
          reject(tx.error);
        };
        tx.objectStore(STORE).put(blob, key);
      });
    });
  }

  function getBlob(key) {
    if (!key) return Promise.resolve(null);
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, "readonly");
        var r = tx.objectStore(STORE).get(key);
        r.onsuccess = function () {
          resolve(r.result || null);
        };
        r.onerror = function () {
          reject(r.error);
        };
      });
    });
  }

  function deleteBlob(key) {
    if (!key) return Promise.resolve();
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, "readwrite");
        tx.oncomplete = function () {
          resolve();
        };
        tx.onerror = function () {
          reject(tx.error);
        };
        tx.objectStore(STORE).delete(key);
      });
    });
  }

  global.FinTatIdb = {
    saveBlob: saveBlob,
    getBlob: getBlob,
    deleteBlob: deleteBlob,
  };
})(window);
