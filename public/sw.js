/*
 * Avmall staff PWA service worker (hand-rolled, no build step).
 *
 * Goals: make the admin installable + fast on repeat loads, while staying
 * correct for an online-first ops app.
 *   - Static build assets (/_next/static, icons, fonts) → cache-first.
 *   - Page navigations → network-first, fall back to the last cached page
 *     (and an offline notice) when the network is down.
 *   - API calls, auth, and anything non-GET / cross-origin → never cached.
 *
 * Bump CACHE_VERSION to invalidate old caches on the next activation.
 */

const CACHE_VERSION = "avmall-v1";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const PAGE_CACHE = `${CACHE_VERSION}-pages`;

const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      // Best-effort: don't fail install if the offline page isn't there yet.
      await cache.add(OFFLINE_URL).catch(() => {});
    })(),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => !k.startsWith(CACHE_VERSION))
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/fonts/") ||
    url.pathname.startsWith("/brand/") ||
    /\.(?:png|jpg|jpeg|svg|webp|ico|woff2?)$/.test(url.pathname)
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Same-origin only — leave R2 images, APIs on other hosts, etc. to the network.
  if (url.origin !== self.location.origin) return;

  // Never cache API or auth traffic — always go to the network.
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.includes("/auth/") ||
    url.pathname.startsWith("/admin-login")
  ) {
    return;
  }

  // Static build assets: cache-first (they're content-hashed / immutable).
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const hit = await cache.match(request);
        if (hit) return hit;
        const res = await fetch(request);
        if (res.ok) cache.put(request, res.clone());
        return res;
      }),
    );
    return;
  }

  // Page navigations: network-first, fall back to cache, then the offline page.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(request);
          const cache = await caches.open(PAGE_CACHE);
          cache.put(request, res.clone());
          return res;
        } catch {
          const cache = await caches.open(PAGE_CACHE);
          const cached = await cache.match(request);
          if (cached) return cached;
          const offline = await caches.match(OFFLINE_URL);
          return (
            offline ??
            new Response("You are offline.", {
              status: 503,
              headers: { "Content-Type": "text/plain" },
            })
          );
        }
      })(),
    );
  }
});
