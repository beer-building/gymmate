// Уведомление об окончании отдыха, работающее при свёрнутом приложении.
//
// Лучший вариант — Notification Triggers (TimestampTrigger): система показывает
// уведомление в назначенное время сама, даже если вкладка свёрнута или закрыта.
// Где его нет — best-effort: показываем уведомление в момент срабатывания таймера,
// если вкладка скрыта (работает в фоне на десктопе). На залоченном мобильном без
// серверного web-push разбудить нас системе нечем — это честное ограничение фронта.

const TAG = 'gymmate-rest';
const TITLE = 'Отдых окончен';
const BODY = 'Пора к следующему подходу.';

export function notificationsSupported(): boolean {
	return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;
}

export function notificationPermission(): NotificationPermission | 'unsupported' {
	return notificationsSupported() ? Notification.permission : 'unsupported';
}

export async function requestNotifications(): Promise<NotificationPermission | 'unsupported'> {
	if (!notificationsSupported()) return 'unsupported';
	try {
		return await Notification.requestPermission();
	} catch {
		return Notification.permission;
	}
}

// Конструктор TimestampTrigger — экспериментальный, нет в стандартных типах.
// Берём через globalThis, чтобы не словить ReferenceError там, где его нет.
function timestampTrigger(at: number): object | null {
	const ctor = (globalThis as { TimestampTrigger?: new (ts: number) => object }).TimestampTrigger;
	if (!ctor) return null;
	try {
		return new ctor(at);
	} catch {
		return null;
	}
}

function triggersSupported(): boolean {
	return (
		notificationsSupported() &&
		'showTrigger' in Notification.prototype &&
		'TimestampTrigger' in globalThis
	);
}

async function readyRegistration(): Promise<ServiceWorkerRegistration | null> {
	if (!notificationsSupported()) return null;
	try {
		return await navigator.serviceWorker.ready;
	} catch {
		return null;
	}
}

// Снимаем ранее запланированное/показанное уведомление об отдыхе
// (например, при «+30 сек», пропуске или завершении тренировки).
export async function cancelRestEnd(): Promise<void> {
	const reg = await readyRegistration();
	if (!reg) return;
	try {
		// includeTriggered — захватить и ещё не сработавшие запланированные
		const filter = { tag: TAG } as Record<string, unknown>;
		filter.includeTriggered = true;
		const pending = await reg.getNotifications(filter as GetNotificationOptions);
		pending.forEach((note) => note.close());
	} catch {
		/* ignore */
	}
}

// Планирует системное уведомление на endsAt. Возвращает true, если запланировано
// средствами ОС (сработает даже в фоне/закрытым) — тогда in-page fallback не нужен.
export async function scheduleRestEnd(endsAt: number): Promise<boolean> {
	if (notificationPermission() !== 'granted') return false;
	const trigger = triggersSupported() ? timestampTrigger(endsAt) : null;
	if (!trigger) return false;
	const reg = await readyRegistration();
	if (!reg) return false;
	try {
		await cancelRestEnd();
		const options = { tag: TAG, body: BODY, requireInteraction: false } as Record<string, unknown>;
		options.showTrigger = trigger;
		await reg.showNotification(TITLE, options as NotificationOptions);
		return true;
	} catch {
		return false;
	}
}

// Немедленное уведомление — fallback, когда триггеры не поддерживаются,
// но JS успел сработать (вкладка свёрнута, но не заморожена).
export async function notifyRestEndNow(): Promise<void> {
	if (notificationPermission() !== 'granted') return;
	const reg = await readyRegistration();
	if (!reg) return;
	try {
		const options = { tag: TAG, body: BODY, renotify: true } as Record<string, unknown>;
		await reg.showNotification(TITLE, options as NotificationOptions);
	} catch {
		/* ignore */
	}
}
