// Nom du cache. Changez la version (v5, v6...) si vous modifiez des fichiers pour forcer la mise à jour.
const CACHE_NAME = 'nephrocalc-cache-v5';

// Liste complète des fichiers à mettre en cache.
// Elle inclut les fichiers locaux ET les ressources externes (polices, styles).
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.1.1/css/all.min.css'
];

/**
 * Événement d'installation : se déclenche lors de la première installation du service worker.
 * Ouvre le cache et y ajoute tous les fichiers essentiels.
 */
self.addEventListener('install', event => {
  console.log('[Service Worker] Installation...');
  // Effectue les étapes d'installation.
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Cache ouvert. Mise en cache des fichiers de base.');
        return cache.addAll(URLS_TO_CACHE);
      })
      .catch(error => {
        console.error('[Service Worker] Échec de la mise en cache initiale :', error);
      })
  );
});

/**
 * Événement fetch : se déclenche pour chaque requête réseau faite par la page.
 * Stratégie : Cache d'abord, puis réseau (Cache-First).
 * C'est la stratégie la plus rapide pour le hors-ligne.
 */
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Si la réponse est trouvée dans le cache, on la retourne.
        if (response) {
          console.log('[Service Worker] Ressource trouvée dans le cache :', event.request.url);
          return response;
        }

        // Si la ressource n'est pas dans le cache, on la récupère sur le réseau.
        console.log('[Service Worker] Ressource non trouvée dans le cache, fetch sur le réseau :', event.request.url);
        return fetch(event.request).then(
          networkResponse => {
            // On ne met en cache que les requêtes valides et de type GET.
            // On fait attention aux réponses "opaques" des CDN qui sont valides.
            if (!networkResponse || (networkResponse.status !== 200 && networkResponse.type !== 'opaque') || event.request.method !== 'GET') {
              return networkResponse;
            }

            // On clone la réponse car elle ne peut être lue qu'une seule fois.
            const responseToCache = networkResponse.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return networkResponse;
          }
        );
      })
  );
});

/**
 * Événement d'activation : utilisé pour nettoyer les anciens caches.
 */
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activation...');
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Si le nom du cache n'est pas dans notre liste blanche, on le supprime.
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('[Service Worker] Suppression de l\'ancien cache :', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
