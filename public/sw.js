const CACHE_NAME = 'newshub-v1';
const STATIC_CACHE = 'newshub-static-v1';
const DYNAMIC_CACHE = 'newshub-dynamic-v1';

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/categories',
  '/search',
  '/offline.html',
  '/manifest.json',
  '/favicon.svg',
  '/apple-touch-icon.png'
];

// Cache strategies for different types of requests
const CACHE_STRATEGIES = {
  // Images - Cache first, fallback to network
  images: /\.(jpg|jpeg|png|gif|webp|svg|ico)$/i,

  // Static assets - Cache first
  static: /\.(css|js|woff|woff2|ttf|eot)$/i,

  // API/RSS feeds - Network first, fallback to cache
  feeds: /\/(api\/|rss|feed)/i,

  // News articles - Stale while revalidate
  articles: /\/news\//i,

  // Category pages - Stale while revalidate
  categories: /\/category\//i
};

// Install event - cache static assets
self.addEventListener('install', event => {
  console.log('SW: Installing service worker...');

  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('SW: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('SW: Static assets cached successfully');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('SW: Failed to cache static assets:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('SW: Activating service worker...');

  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(cacheName => {
              return cacheName.startsWith('newshub-') &&
                     cacheName !== STATIC_CACHE &&
                     cacheName !== DYNAMIC_CACHE;
            })
            .map(cacheName => {
              console.log('SW: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('SW: Old caches cleaned up');
        return self.clients.claim();
      })
  );
});

// Fetch event - handle requests with appropriate caching strategy
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and external requests
  if (request.method !== 'GET' || !url.origin.includes(self.location.origin)) {
    return;
  }

  // Determine cache strategy based on request type
  if (CACHE_STRATEGIES.images.test(url.pathname)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
  } else if (CACHE_STRATEGIES.static.test(url.pathname)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
  } else if (CACHE_STRATEGIES.feeds.test(url.pathname)) {
    event.respondWith(networkFirst(request, DYNAMIC_CACHE));
  } else if (CACHE_STRATEGIES.articles.test(url.pathname) ||
             CACHE_STRATEGIES.categories.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request, DYNAMIC_CACHE));
  } else {
    // Default strategy for other requests
    event.respondWith(networkFirst(request, DYNAMIC_CACHE));
  }
});

// Cache first strategy - try cache first, fallback to network
async function cacheFirst(request, cacheName) {
  try {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    const networkResponse = await fetch(request);

    // Cache successful responses
    if (networkResponse.ok) {
      await cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.error('SW: Cache first strategy failed:', error);
    return handleOfflineRequest(request);
  }
}

// Network first strategy - try network first, fallback to cache
async function networkFirst(request, cacheName) {
  try {
    const networkResponse = await fetch(request);

    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      await cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log('SW: Network failed, trying cache:', error.message);

    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    return handleOfflineRequest(request);
  }
}

// Stale while revalidate - return cached version immediately, update cache in background
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);

  // Get cached response immediately
  const cachedResponse = await cache.match(request);

  // Fetch fresh version in background
  const networkPromise = fetch(request)
    .then(networkResponse => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch(error => {
      console.log('SW: Background fetch failed:', error.message);
    });

  // Return cached version immediately, or wait for network if no cache
  if (cachedResponse) {
    return cachedResponse;
  } else {
    try {
      return await networkPromise;
    } catch (error) {
      return handleOfflineRequest(request);
    }
  }
}

// Handle offline requests
function handleOfflineRequest(request) {
  const url = new URL(request.url);

  // For HTML pages, return offline page
  if (request.headers.get('Accept')?.includes('text/html')) {
    return caches.match('/offline.html');
  }

  // For images, return a placeholder or cached fallback
  if (CACHE_STRATEGIES.images.test(url.pathname)) {
    return new Response(
      `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150" viewBox="0 0 200 150">
        <rect width="200" height="150" fill="#f3f4f6"/>
        <text x="100" y="75" text-anchor="middle" fill="#6b7280" font-family="Arial" font-size="14">
          Image unavailable
        </text>
      </svg>`,
      {
        headers: { 'Content-Type': 'image/svg+xml' }
      }
    );
  }

  // For other requests, return a generic offline response
  return new Response(
    JSON.stringify({ error: 'Offline', message: 'Content not available offline' }),
    {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

// Background sync for when connection is restored
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    console.log('SW: Background sync triggered');
    event.waitUntil(performBackgroundSync());
  }
});

// Perform background sync operations
async function performBackgroundSync() {
  try {
    // Clear old cached articles to free up space
    await cleanupOldCache();

    // Prefetch critical pages
    await prefetchCriticalPages();

    console.log('SW: Background sync completed');
  } catch (error) {
    console.error('SW: Background sync failed:', error);
  }
}

// Clean up old cached content
async function cleanupOldCache() {
  const cache = await caches.open(DYNAMIC_CACHE);
  const requests = await cache.keys();

  // Remove articles older than 7 days
  const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

  for (const request of requests) {
    if (CACHE_STRATEGIES.articles.test(request.url)) {
      const response = await cache.match(request);
      const dateHeader = response?.headers.get('date');

      if (dateHeader && new Date(dateHeader).getTime() < oneWeekAgo) {
        await cache.delete(request);
        console.log('SW: Removed old cached article:', request.url);
      }
    }
  }
}

// Prefetch critical pages
async function prefetchCriticalPages() {
  const criticalPages = ['/', '/categories'];
  const cache = await caches.open(DYNAMIC_CACHE);

  for (const page of criticalPages) {
    try {
      const response = await fetch(page);
      if (response.ok) {
        await cache.put(page, response);
        console.log('SW: Prefetched critical page:', page);
      }
    } catch (error) {
      console.log('SW: Failed to prefetch page:', page, error.message);
    }
  }
}

// Push notification handling
self.addEventListener('push', event => {
  const options = {
    body: 'Breaking news update available',
    icon: '/android-chrome-192x192.png',
    badge: '/android-chrome-192x192.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '1'
    },
    actions: [
      {
        action: 'explore',
        title: 'Read Now',
        icon: '/icons/checkmark.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icons/xmark.png'
      }
    ]
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      options.body = payload.body || options.body;
      options.data.url = payload.url || '/';
    } catch (error) {
      console.error('SW: Invalid push payload:', error);
    }
  }

  event.waitUntil(
    self.registration.showNotification('NewsHub', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'explore') {
    const url = event.notification.data.url || '/';
    event.waitUntil(
      self.clients.openWindow(url)
    );
  } else if (event.action !== 'close') {
    // Default click action
    event.waitUntil(
      self.clients.openWindow('/')
    );
  }
});

// Message handling from main thread
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CACHE_URLS') {
    const urls = event.data.urls;
    event.waitUntil(cacheUrls(urls));
  }
});

// Cache specific URLs on demand
async function cacheUrls(urls) {
  const cache = await caches.open(DYNAMIC_CACHE);

  for (const url of urls) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        await cache.put(url, response);
        console.log('SW: Cached URL on demand:', url);
      }
    } catch (error) {
      console.log('SW: Failed to cache URL:', url, error.message);
    }
  }
}
