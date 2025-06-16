// Nom du cache. Changez-le si vous modifiez des fichiers CSS/JS.
const STATIC_CACHE_NAME = 'nephrocalc-static-cache-v2';
const DYNAMIC_CACHE_NAME = 'nephrocalc-dynamic-cache-v2';

// Liste des fichiers "coquille" de l'application à mettre en cache immédiatement.
const APP_SHELL_FILES = [
  '/',
  '/index.html',
  '/manifest.json'
  // Ajoutez ici les chemins vers vos icônes, par ex: '/icon-192x192.png'
];

// Événement d'installation
self.addEventListener('install', event => {
  console.log('[Service Worker] Installation');
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then(cache => {
      console.log('[Service Worker] Mise en cache de la coquille de l\'application');
      return cache.addAll(APP_SHELL_FILES);
    })
  );
});

// Événement d'activation
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activation');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Supprime les anciens caches qui ne sont plus nécessaires
          if (cacheName !== STATIC_CACHE_NAME && cacheName !== DYNAMIC_CACHE_NAME) {
            console.log('[Service Worker] Suppression de l\'ancien cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Événement fetch : intercepte toutes les requêtes réseau
self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);

  // Gère les requêtes vers les CDN (Tailwind, Font Awesome, Google Fonts)
  // Stratégie : Stale-While-Revalidate (rapide et à jour)
  if (requestUrl.hostname === 'cdn.tailwindcss.com' || 
      requestUrl.hostname === 'cdnjs.cloudflare.com' ||
      requestUrl.hostname === 'fonts.googleapis.com' ||
      requestUrl.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.open(DYNAMIC_CACHE_NAME).then(cache => {
        return cache.match(event.request).then(response => {
          const fetchPromise = fetch(event.request).then(networkResponse => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
          // Retourne la version du cache si elle existe, tout en rafraîchissant en arrière-plan
          return response || fetchPromise;
        });
      })
    );
  } else {
    // Pour toutes les autres requêtes (fichiers locaux)
    // Stratégie : Network First, then Cache
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Si la requête réussit, on met la réponse en cache dynamique
          return caches.open(DYNAMIC_CACHE_NAME).then(cache => {
            // Ne pas mettre en cache les requêtes non-GET
            if(event.request.method === 'GET') {
               cache.put(event.request, response.clone());
            }
            return response;
          });
        })
        .catch(() => {
          // Si le réseau échoue, on cherche dans le cache
          return caches.match(event.request).then(response => {
            if (response) {
              return response; // On a trouvé dans le cache
            }
            // Si la requête n'est dans aucun cache, on peut renvoyer une page de secours (optionnel)
          });
        })
    );
  }
});
