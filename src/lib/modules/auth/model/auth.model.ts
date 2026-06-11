import { combine, createEffect, createEvent, createStore, sample } from 'effector';
import type { AuthRecord } from 'pocketbase';
import { pb } from '$lib/shared/api';
import type { Gender } from '$lib/shared/types';

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

// OAuth через popup: PocketBase SDK сам открывает окно провайдера и слушает
// callback. У нового юзера поле name пустое — подтягиваем его из meta.
export const loginWithGoogleFx = createEffect(async () => {
	const auth = await pb.collection('users').authWithOAuth2({ provider: 'google' });
	const meta = auth.meta as { name?: string; isNew?: boolean } | undefined;
	if (meta?.isNew && !auth.record.name && meta.name) {
		await pb.collection('users').update(auth.record.id, { name: meta.name });
	}
});

export const loggedOut = createEvent();

export const profileUpdateFx = createEffect(
	async (data: {
		name?: string;
		gender?: Gender;
		weight?: number;
		height?: number;
		birthdate?: string;
	}) => {
		const record = pb.authStore.record;
		if (!record) throw new Error('Not authenticated');
		const updated = await pb.collection('users').update(record.id, data);
		pb.authStore.save(pb.authStore.token, updated);
		return updated;
	}
);

export const profileUpdated = createEvent<AuthRecord>();

export const profileUpdateStarted = createEvent<{
	name?: string;
	gender?: Gender;
	weight?: number;
	height?: number;
	birthdate?: string;
}>();

sample({
	clock: profileUpdateStarted,
	target: profileUpdateFx
});

sample({
	source: profileUpdateFx.doneData,
	target: profileUpdated
});

profileUpdated.watch((record) => {
	if (pb.authStore.record) {
		authChanged(record);
	}
});

// Пол — выбирает модель фигуры (м/ж) на карте мышц.
// Профильное поле `gender` (заполнится в будущем онбординг-опросе) имеет
// приоритет; пока оно пустое — ручной переключатель с памятью в localStorage.
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

export const gender = combine(
	user,
	guestGender,
	(record, guest) => ((record?.gender as Gender) || guest) ?? 'male'
);

pb.authStore.onChange(() => authChanged(pb.authStore.record));

loggedOut.watch(() => pb.authStore.clear());
