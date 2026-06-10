import { createEffect, createEvent, createStore } from 'effector';
import type { AuthRecord } from 'pocketbase';
import { pb } from '$lib/pb';

// Сторы во всех моделях экспортируются без `$`-префикса:
// идентификаторы, начинающиеся с `$`, зарезервированы синтаксисом Svelte,
// а подписка в компонентах выглядит как `$user`.

const authChanged = createEvent<AuthRecord | null>();

export const loginFx = createEffect(
	async ({ email, password }: { email: string; password: string }) => {
		await pb.collection('users').authWithPassword(email, password);
	}
);

export const registerFx = createEffect(
	async ({ email, password, name }: { email: string; password: string; name: string }) => {
		await pb.collection('users').create({ email, password, passwordConfirm: password, name });
		await loginFx({ email, password });
	}
);

export const loggedOut = createEvent();

export const user = createStore<AuthRecord | null>(pb.authStore.record).on(
	authChanged,
	(_, record) => record
);

pb.authStore.onChange(() => authChanged(pb.authStore.record));

loggedOut.watch(() => pb.authStore.clear());
