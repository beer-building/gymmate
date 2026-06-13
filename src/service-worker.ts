/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true" />
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { build, files, version } from '$service-worker';

const sw = self as unknown as ServiceWorkerGlobalScope;

// Уникальное имя кэша на каждую сборку — старые версии чистятся при активации
const CACHE = `gymmate-cache-${version}`;

// Всё, что SvelteKit может закэшировать заранее: бандлы + содержимое static
const ASSETS = [...build, ...files];

sw.addEventListener('install', (event) => {
	// не ждём закрытия всех вкладок/PWA — новая версия активируется сразу
	sw.skipWaiting();
	event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
});

sw.addEventListener('activate', (event) => {
	event.waitUntil(
		(async () => {
			for (const key of await caches.keys()) {
				if (key !== CACHE) await caches.delete(key);
			}
			await sw.clients.claim();
		})()
	);
});

// Тап по уведомлению об окончании отдыха — фокусируем открытое окно приложения
// (или открываем дневник), чтобы вернуться к тренировке в один тап
sw.addEventListener('notificationclick', (event) => {
	event.notification.close();
	event.waitUntil(
		(async () => {
			const clients = await sw.clients.matchAll({ type: 'window', includeUncontrolled: true });
			const existing = clients.find((client) => client.url.includes('/diary')) ?? clients[0];
			if (existing) {
				await existing.focus();
			} else {
				await sw.clients.openWindow('/diary');
			}
		})()
	);
});

sw.addEventListener('fetch', (event) => {
	if (event.request.method !== 'GET') return;

	const url = new URL(event.request.url);

	// Сторонние запросы (PocketBase API, Google Fonts) не трогаем — отдаём браузеру как есть
	if (url.origin !== sw.location.origin) return;

	async function respond() {
		const cache = await caches.open(CACHE);

		// Статика из сборки всегда берётся из кэша
		if (ASSETS.includes(url.pathname)) {
			const cached = await cache.match(url.pathname);
			if (cached) return cached;
		}

		// Остальное — сеть в приоритете, кэш как fallback в офлайне
		try {
			const response = await fetch(event.request);
			if (response instanceof Response && response.status === 200) {
				cache.put(event.request, response.clone());
			}
			return response;
		} catch (err) {
			const cached = await cache.match(event.request);
			if (cached) return cached;
			throw err;
		}
	}

	event.respondWith(respond());
});
