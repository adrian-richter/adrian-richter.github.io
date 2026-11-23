const CACHE='toepferkurs-wg-v2';
const CORE=['./','./index.html','./style.css?v=1','./app.js?v=1','./icon.svg','./manifest.webmanifest'];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('toepferkurs-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET'||new URL(request.url).origin!==self.location.origin)return;
  if(request.mode==='navigate'){
    event.respondWith(fetch(request).then(response=>{
      if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(request,copy))}
      return response;
    }).catch(()=>caches.match(request).then(response=>response||caches.match('./index.html'))));
    return;
  }
  event.respondWith(caches.match(request).then(response=>response||fetch(request).then(fresh=>{
    if(fresh.ok){const copy=fresh.clone();caches.open(CACHE).then(cache=>cache.put(request,copy))}
    return fresh;
  })));
});