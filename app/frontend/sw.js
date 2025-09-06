// Service Worker - Fixed version for POST method caching
const CACHE_NAME = 'salon-system-v1';
const STATIC_CACHE_URLS = [
  '/',
  '/dashboard.html',
  '/login.html',
  '/landing.html',
  '/css/style.css',
  '/css/dashboard.css',
  '/js/app-new.js',
  '/js/settings.js',
  '/js/calendar.js',
  '/manifest.json'
];

// Install event
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Service Worker: Caching static assets');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .catch((error) => {
        console.error('❌ Cache installation failed:', error);
      })
  );
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Network-first strategy for API calls
function networkFirst(request) {
  return fetch(request)
    .then((response) => {
      // Only cache GET requests and successful responses
      if (request.method === 'GET' && response.ok) {
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseClone);
          console.log('🌐 ネットワークから取得・キャッシュ更新:', request.url);
        });
      } else {
        console.log('🌐 ネットワークから取得 (キャッシュなし):', request.url, request.method);
      }
      return response;
    })
    .catch(() => {
      // Only try cache for GET requests
      if (request.method === 'GET') {
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            console.log('📦 キャッシュから提供:', request.url);
            return cachedResponse;
          }
          throw new Error('No cached response available');
        });
      }
      throw new Error('Network request failed and cannot use cache for non-GET methods');
    });
}

// Cache-first strategy for static assets
function cacheFirst(request) {
  return caches.match(request).then((cachedResponse) => {
    if (cachedResponse) {
      console.log('📦 キャッシュから提供:', request.url);
      return cachedResponse;
    }
    
    return fetch(request).then((response) => {
      if (response.ok) {
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseClone);
        });
      }
      console.log('🌐 ネットワークから取得:', request.url);
      return response;
    });
  });
}

// Fetch event
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-http requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // API requests - use network first, no caching for POST/PUT/DELETE
  if (url.pathname.startsWith('/api/')) {
    if (request.method !== 'GET') {
      // For non-GET requests, just pass through without caching
      event.respondWith(
        fetch(request).then((response) => {
          console.log('🌐 API直接通信:', request.method, request.url);
          return response;
        })
      );
    } else {
      event.respondWith(networkFirst(request));
    }
    return;
  }

  // Static assets - use cache first
  if (
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.html') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.svg') ||
    url.pathname === '/'
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Default - network first
  event.respondWith(networkFirst(request));
});

// Handle messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('🔄 Service Worker: Skip waiting requested');
    self.skipWaiting();
  }
});