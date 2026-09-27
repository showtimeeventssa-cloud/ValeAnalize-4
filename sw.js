const CACHE = "valeanalize-v33-stem-accuracy";
const ASSETS=["./index.html","./manifest.webmanifest","./apple-touch-icon-v30.png","./icons/favicon-v30.png","./icons/icon-192-v30.png","./icons/icon-512-v30.png","./icons/icon-1024-v30.png","./data/gp50-database.json","./templates/COUNTRY26.prst"];
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",e=>{if(e.request.method!=="GET")return;if(e.request.mode==="navigate"){e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(CACHE).then(x=>x.put("./index.html",c));return r}).catch(()=>caches.match("./index.html")))}else e.respondWith(caches.match(e.request).then(c=>c||fetch(e.request)))})
