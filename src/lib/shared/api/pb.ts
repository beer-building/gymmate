import PocketBase from 'pocketbase';

// SvelteKit 3.0.0-next не поддерживает $env/static/*, поэтому обычный Vite env.
const url = import.meta.env.VITE_POCKETBASE_URL ?? 'http://127.0.0.1:8090';

export const pb = new PocketBase(url);

// PocketBase сам токен не продлевает — без этого он истекает по сроку и юзер
// логинится заново. На старте при наличии токена дёргаем authRefresh: годный —
// меняется на новый с продлённым сроком (скользящая сессия, пока заходишь в пределах
// срока — остаёшься залогинен); протухший/невалидный — 401 → чистим стор, чтобы не
// висеть в состоянии «залогинен, но запросы 401», и guard увёл на /login.
if (pb.authStore.token) {
	pb.collection('users')
		.authRefresh()
		.catch(() => pb.authStore.clear());
}
