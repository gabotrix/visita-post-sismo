/* Almacén local de visitas.
   IndexedDB aguanta las fotografías; localStorage no (unos 5 MB y solo texto).
   Si el navegador no da IndexedDB se degrada a localStorage sin fotos, que es
   peor pero no pierde las respuestas. */
window.ALMACEN = (function () {
  'use strict';

  var NOMBRE = 'psismo', VERSION = 1, db = null, hayIDB = false;
  try { hayIDB = !!window.indexedDB; } catch (e) { hayIDB = false; }

  function abre() {
    return new Promise(function (ok, mal) {
      if (!hayIDB) return mal('sin indexeddb');
      var s = indexedDB.open(NOMBRE, VERSION);
      s.onupgradeneeded = function () {
        var d = s.result;
        if (!d.objectStoreNames.contains('visitas')) d.createObjectStore('visitas', { keyPath: 'id' });
        if (!d.objectStoreNames.contains('ajustes')) d.createObjectStore('ajustes', { keyPath: 'k' });
      };
      s.onsuccess = function () { db = s.result; ok(db); };
      s.onerror = function () { mal(s.error); };
      s.onblocked = function () { mal('bloqueada'); };
    });
  }

  function pide(almacen, modo, fn) {
    return new Promise(function (ok, mal) {
      if (!db) return mal('sin base');
      var t = db.transaction(almacen, modo), s = t.objectStore(almacen), r = fn(s);
      t.oncomplete = function () { ok(r && r.result !== undefined ? r.result : null); };
      t.onerror = function () { mal(t.error); };
      t.onabort = function () { mal(t.error || 'abortada'); };
    });
  }

  // ---- respaldo en localStorage, sin fotografías
  function lsLee(k) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
  function lsPon(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  function sinFotos(v) {
    var c = JSON.parse(JSON.stringify({ id: v.id, estado: v.estado, creada: v.creada,
      tocada: v.tocada, paso: v.paso, resumen: v.resumen, D: {} }));
    Object.keys(v.D || {}).forEach(function (k) {
      var x = v.D[k];
      if (Array.isArray(x) && typeof x[0] === 'string' && x[0].slice(0, 5) === 'data:') return;
      c.D[k] = x;
    });
    return c;
  }

  var API = {
    conFotos: false,

    visitas: {
      guarda: function (v) {
        v.tocada = Date.now();
        if (db) return pide('visitas', 'readwrite', function (s) { return s.put(v); });
        var t = lsLee('psismo.visitas') || {};
        t[v.id] = sinFotos(v); lsPon('psismo.visitas', t);
        return Promise.resolve();
      },
      lee: function (id) {
        if (db) return pide('visitas', 'readonly', function (s) { return s.get(id); });
        return Promise.resolve((lsLee('psismo.visitas') || {})[id] || null);
      },
      todas: function () {
        if (db) return pide('visitas', 'readonly', function (s) { return s.getAll(); })
          .then(function (l) { return (l || []).sort(function (a, b) { return b.tocada - a.tocada; }); });
        var t = lsLee('psismo.visitas') || {};
        return Promise.resolve(Object.keys(t).map(function (k) { return t[k]; })
          .sort(function (a, b) { return b.tocada - a.tocada; }));
      },
      borra: function (id) {
        if (db) return pide('visitas', 'readwrite', function (s) { return s.delete(id); });
        var t = lsLee('psismo.visitas') || {}; delete t[id]; lsPon('psismo.visitas', t);
        return Promise.resolve();
      }
    },

    perfil: {
      guarda: function (p) {
        lsPon('psismo.perfil', p);                       // duplicado: se lee al arrancar sin esperar
        if (db) return pide('ajustes', 'readwrite', function (s) { return s.put({ k: 'perfil', v: p }); });
        return Promise.resolve();
      },
      lee: function () { return lsLee('psismo.perfil') || {}; }
    },

    // cuánto espacio ocupa lo guardado, para avisar antes de que se llene
    uso: function () {
      if (navigator.storage && navigator.storage.estimate) {
        return navigator.storage.estimate().then(function (e) {
          return { usado: e.usage || 0, cuota: e.quota || 0 };
        }).catch(function () { return null; });
      }
      return Promise.resolve(null);
    },

    // pedir al navegador que no borre los datos si le falta espacio
    persiste: function () {
      if (navigator.storage && navigator.storage.persist) {
        return navigator.storage.persist().catch(function () { return false; });
      }
      return Promise.resolve(false);
    }
  };

  API.listo = abre().then(function () {
    API.conFotos = true;
    return true;
  }).catch(function () {
    db = null; API.conFotos = false;
    return false;
  });

  return API;
})();
