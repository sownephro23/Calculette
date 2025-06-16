// Nom du cache. Changez-le si vous mettez à jour les fichiers du cache.
const CACHE_NAME = 'nephrocalc-cache-v1';

// Liste des URLs à mettre en cache lors de l'installation.
// Cela inclut la page principale, les styles et les polices externes.
const URLS_TO_CACHE = [
  '/',
  'index.html',
  'manifest.json',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.1.1/css/all.min.css'
];

// Événement d'installation : est déclenché lorsque le service worker est installé.
self.addEventListener('install', event => {
  console.log('Service Worker: Installation...');
  // Met en cache les fichiers essentiels de l'application.
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Mise en cache des fichiers de l\'application');
        return cache.addAll(URLS_TO_CACHE);
      })
      .then(() => {
        // Force le nouveau service worker à devenir actif immédiatement.
        return self.skipWaiting();
      })
  );
});

// Événement d'activation : est déclenché lorsque le service worker est activé.
self.addEventListener('activate', event => {
    console.log('Service Worker: Activation...');
    // Supprime les anciens caches qui ne sont plus utilisés.
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        console.log('Service Worker: Suppression de l\'ancien cache', cache);
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => {
            // Prend le contrôle de la page immédiatement.
            return self.clients.claim();
        })
    );
});

// Événement fetch : est déclenché pour chaque requête faite par la page.
self.addEventListener('fetch', event => {
  console.log('Service Worker: Fetching', event.request.url);
  // Stratégie "Cache-First" (Cache en priorité)
  // Le service worker essaie de servir la requête depuis le cache.
  // Si la ressource n'est pas dans le cache, il la récupère depuis le réseau,
  // la met en cache pour les prochaines fois, et la renvoie à l'application.
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Si la réponse est dans le cache, on la retourne.
        if (response) {
          console.log('Service Worker: Ressource trouvée dans le cache', event.request.url);
          return response;
        }

        // Sinon, on essaie de la récupérer sur le réseau.
        console.log('Service Worker: Ressource non trouvée dans le cache, fetch sur le réseau', event.request.url);
        return fetch(event.request).then(
          response => {
            // Si la requête a échoué ou si la réponse n'est pas valide, on ne fait rien.
            if (!response || response.status !== 200 || response.type !== 'basic' && response.type !== 'cors') {
              return response;
            }

            // On clone la réponse car on ne peut la lire qu'une seule fois.
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                // On met la nouvelle ressource en cache.
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        );
      })
  );
});
