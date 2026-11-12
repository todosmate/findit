// 어디뒀지? 서비스 워커
// 파일을 고칠 때마다 아래 VERSION 숫자를 올려 주세요. (v1 → v2 → v3 ...)
const VERSION = 'v7';
const CACHE = 'my-app-cache-' + VERSION;

const FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

// 설치: 파일을 미리 저장해 두고, 기다리지 않고 바로 새 버전으로
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll(FILES.map((url) => new Request(url, { cache: 'reload' })))
    )
  );
});

// 적용: 예전 버전 저장분 지우고, 열린 화면을 바로 맡기
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((key) => key.startsWith('my-app-cache-') && key !== CACHE)
        .map((key) => caches.delete(key))
    );
    await self.clients.claim();
  })());
});

// 파일 요청: 인터넷이 되면 항상 새 파일 먼저(network-first), 안 되면 저장해 둔 파일
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    try {
      const res = await fetch(req, { cache: 'no-store' });
      if (res && res.ok) {
        const cache = await caches.open(CACHE);
        await cache.put(req, res.clone());
      }
      return res;
    } catch (err) {
      const hit = await caches.match(req, { ignoreSearch: true });
      if (hit) return hit;
      if (req.mode === 'navigate') {
        const page = await caches.match('./index.html');
        if (page) return page;
      }
      throw err;
    }
  })());
});
