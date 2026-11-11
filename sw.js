// Buget Familie — service worker
// Keeps the whole app on the computer so it opens with no internet at all.
// It only ever caches the app's own files; it never touches the user's data, which lives
// in the file they chose and in the browser's own storage.

var CACHE = "buget-familie-v1";
var FILES = [
  "./", "./index.html", "./manifest.webmanifest",
  "./css/style.css",
  "./icon.png", "./icon-192.png", "./icon-512.png", "./icon-maskable.png",
  "./lib/chart.umd.min.js", "./lib/xlsx.full.min.js",
  "./lib/fontawesome/css/all.min.css",
  "./lib/fontawesome/webfonts/fa-solid-900.woff2",
  "./lib/fontawesome/webfonts/fa-regular-400.woff2",
  "./lib/fontawesome/webfonts/fa-brands-400.woff2",
  "./lib/fontawesome/webfonts/fa-v4compatibility.woff2",
  "./js/cats.js", "./js/storage.js", "./js/core.js", "./js/ui.js", "./js/dashboard.js",
  "./js/expenses.js", "./js/incomes.js", "./js/budget.js", "./js/stats.js", "./js/savings.js",
  "./js/settings.js", "./js/welcome.js", "./js/exportxls.js", "./js/app.js"
];

self.addEventListener("install", function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(FILES); }).then(function(){ return self.skipWaiting(); }));
});

self.addEventListener("activate", function(e){
  e.waitUntil(caches.keys().then(function(ks){
    return Promise.all(ks.map(function(k){ return k===CACHE ? null : caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});

// Cache first — the app must work offline. A newer version is picked up on the next start.
self.addEventListener("fetch", function(e){
  if(e.request.method!=="GET") return;
  e.respondWith(
    caches.match(e.request).then(function(hit){
      if(hit) return hit;
      return fetch(e.request).then(function(res){
        if(res && res.ok && new URL(e.request.url).origin===self.location.origin){
          var copy=res.clone();
          caches.open(CACHE).then(function(c){ c.put(e.request, copy); });
        }
        return res;
      }).catch(function(){ return caches.match("./index.html"); });
    })
  );
});
