const BASE_PATH = '/autolog-public/';
const CACHE_PREFIX = 'autolog-pwa-';
const CACHE_VERSION =
  new URL(self.location.href).searchParams.get('v') || 'unversioned';
const CACHE_NAME = `${CACHE_PREFIX}shell-${CACHE_VERSION}`;
const INDEX_URL = `${BASE_PATH}index.html`;
const SHELL_FILES = [
  BASE_PATH,
  INDEX_URL,
  `${BASE_PATH}manifest.webmanifest`,
  `${BASE_PATH}icons/autolog-192.png`,
  `${BASE_PATH}icons/autolog-512.png`,
  `${BASE_PATH}icons/autolog-maskable-192.png`,
  `${BASE_PATH}icons/autolog-maskable-512.png`,
];

const getInitialBuildAssets = async () => {
  const response = await fetch(INDEX_URL, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Unable to fetch AutoLog shell: ${response.status}`);
  }

  const html = await response.text();
  return Array.from(html.matchAll(/(?:src|href)=["']([^"']+)["']/g))
    .map((match) => new URL(match[1], self.location.origin))
    .filter(
      (url) =>
        url.origin === self.location.origin &&
        url.pathname.startsWith(`${BASE_PATH}assets/`)
    )
    .map((url) => `${url.pathname}${url.search}`);
};

self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([caches.open(CACHE_NAME), getInitialBuildAssets()]).then(
      ([cache, buildAssets]) =>
        cache.addAll([...new Set([...SHELL_FILES, ...buildAssets])])
    )
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter(
              (cacheName) =>
                cacheName.startsWith(CACHE_PREFIX) && cacheName !== CACHE_NAME
            )
            .map((cacheName) => caches.delete(cacheName))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

const cacheResponse = async (cache, request, response) => {
  if (response.ok && response.type === 'basic') {
    await cache.put(request, response.clone());
  }
  return response;
};

const fetchNavigation = async (request) => {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request, { cache: 'no-store' });
    if (response.ok && response.type === 'basic') {
      await cache.put(INDEX_URL, response.clone());
    }
    return response;
  } catch {
    return (await cache.match(INDEX_URL)) || (await cache.match(BASE_PATH));
  }
};

const fetchCachedAsset = async (request) => {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  const response = await fetch(request);
  return cacheResponse(cache, request, response);
};

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  if (
    request.mode === 'navigate' &&
    (url.pathname === BASE_PATH || url.pathname === INDEX_URL)
  ) {
    event.respondWith(fetchNavigation(request));
    return;
  }

  const isImmutableBuildAsset = url.pathname.startsWith(
    `${BASE_PATH}assets/`
  );
  const isDeclaredShellFile = SHELL_FILES.includes(url.pathname);

  if (isImmutableBuildAsset || isDeclaredShellFile) {
    event.respondWith(fetchCachedAsset(request));
  }
});
