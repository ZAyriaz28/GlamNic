// sw.js (Service Worker funcional - Estrategia: Cache-First)

// 1. Define el nombre de la caché
const CACHE_NAME = 'glamnic-cache-v1'; 

// 2. Lista los archivos esenciales que deben estar disponibles sin conexión
const urlsToCache = [
  './', // Ruta raíz para la aplicación
  '/index.html',
  '/style.css',
  '/script.js',
  // Rutas de los favicons/iconos importantes (para el ícono en el celular)
  '/favicon/manifest.json', 
  '/favicon/apple-touch-icon.png',
  '/favicon/android-chrome-192x192.png',
  '/favicon/android-chrome-512x512.png',
  '/favicon/favicon-32x32.png',
  '/favicon/favicon-16x16.png',
  // Agrega también 'admin.html' si quieres que esa página funcione offline
  '/admin.html',
  // No olvides la fuente de Google Fonts si quieres que se vea bien offline
  'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600&display=swap'
];

// 3. Evento 'install': se dispara cuando se instala el Service Worker
self.addEventListener('install', event => {
  console.log('[Service Worker] Install');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

// 4. Evento 'fetch': intercepta peticiones de red para servir desde la caché
self.addEventListener('fetch', event => {
  event.respondWith(
    // Intenta encontrar la respuesta en la caché
    caches.match(event.request)
      .then(response => {
        // Devuelve la respuesta de la caché si existe
        if (response) {
          return response;
        }
        // De lo contrario, realiza la petición de red
        return fetch(event.request);
      })
  );
});