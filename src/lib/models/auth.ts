import { combine, createEffect, createEvent, createStore } from 'effector';
import type { AuthRecord } from 'pocketbase';
import { pb } from '$lib/pb';
import type { Gender } from '$lib/types';

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

// Пол — выбирает модель фигуры (м/ж) на карте мышц.
// У залогиненного берётся из профиля (поле `gender`, заполнится в будущем
// онбординг-опросе), у гостя — ручной переключатель с памятью в localStorage.
const GUEST_GENDER_KEY = 'gymmate:gender';

export const genderSelected = createEvent<Gender>();

const guestGender = createStore<Gender>(
	(localStorage.getItem(GUEST_GENDER_KEY) as Gender) || 'male'
).on(genderSelected, (_, gender) => gender);

guestGender.watch((gender) => localStorage.setItem(GUEST_GENDER_KEY, gender));

export const user = createStore<AuthRecord | null>(pb.authStore.record).on(
	authChanged,
	(_, record) => record
);

export const gender = combine(user, guestGender, (record, guest) =>
	record ? ((record.gender as Gender) || 'male') : guest
);

pb.authStore.onChange(() => authChanged(pb.authStore.record));

loggedOut.watch(() => pb.authStore.clear());
