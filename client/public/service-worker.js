// This is the service worker with the combined offline experience (Offline page + Offline copy of pages)

const CACHE = "simple-family-calendar-offline";

// Install stage sets up the offline page in the cache and opens a new cache
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE).then(function(cache) {
      console.log('[PWA] Cached offline page during install');
      return cache.addAll([
        '/',
        '/index.html',
        '/manifest.json',
        '/favicon.ico',
        '/favicon.svg',
        '/logo192.png',
        '/logo512.png',
        '/offline.html'
      ]);
    })
  );
});

// If any fetch fails, it will look for the request in the cache and serve it from there first
self.addEventListener('fetch', function(event) {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then(function(response) {
        // If request was successful, add result to cache
        event.waitUntil(updateCache(event.request, response.clone()));
        return response;
      })
      .catch(function(error) {
        // Check to see if you have it in the cache
        // Return response
        // If not in the cache, then return the offline page
        return fromCache(event.request).catch(function() {
          // If the resource is not in the cache, return the offline page
          return caches.match('/offline.html');
        });
      })
  );
});

function fromCache(request) {
  // Check to see if you have it in the cache
  // Return response
  // If not in the cache, then return
  return caches.open(CACHE).then(function(cache) {
    return cache.match(request).then(function(matching) {
      if (!matching || matching.status === 404) {
        return Promise.reject('no-match');
      }
      return matching;
    });
  });
}

function updateCache(request, response) {
  return caches.open(CACHE).then(function(cache) {
    return cache.put(request, response);
  });
} 