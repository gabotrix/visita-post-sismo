/* Service worker de "Visita post-sismo".
   Guarda la aplicación entera la primera vez que se abre con señal; a partir de
   ahí arranca sin red. Los datos de las visitas no pasan por aquí: viven en
   IndexedDB, que ya funciona sin conexión por su cuenta.

   Se sirve junto a visita.html desde un servidor propio (https o localhost).
   Al publicar una versión nueva, subir CACHE para que se reemplace la vieja. */

var CACHE = 'psismo-v1';
var ARCHIVOS = ['./', './visita.html', './manifest.webmanifest'];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return c.addAll(ARCHIVOS); })
      .then(function () { return self.skipWaiting(); })
      .catch(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (ks) {
      return Promise.all(ks.map(function (k) {
        return k === CACHE ? null : caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var r = e.request;
  if (r.method !== 'GET') return;
  if (new URL(r.url).origin !== location.origin) return;

  // Primero la red, para que una versión nueva llegue sola en cuanto haya señal;
  // si no hay red, lo guardado. Al revés, el evaluador seguiría con la versión
  // vieja hasta vaciar la caché a mano.
  e.respondWith(
    fetch(r).then(function (resp) {
      var copia = resp.clone();
      caches.open(CACHE).then(function (c) { c.put(r, copia); }).catch(function () {});
      return resp;
    }).catch(function () {
      return caches.match(r).then(function (hit) {
        return hit || caches.match('./visita.html');
      });
    })
  );
});
