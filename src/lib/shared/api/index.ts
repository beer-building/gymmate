export { pb } from './pb';

// Автоотмена SDK (одинаковый метод+путь → отмена предыдущего запроса) полезна
// для перезагрузок списков, но теряет мутации при быстрых последовательных
// правках — у всех create/update/delete она выключена.
export const noCancel = { requestKey: null };

// PocketBase выполняет PATCH как read-merge-write всей записи, поэтому
// параллельные частичные апдейты затирают поля друг друга (последний
// перезаписывает запись целиком). Все update идут через одну очередь.
let mutationChain: Promise<unknown> = Promise.resolve();
export function serialize<T>(task: () => Promise<T>): Promise<T> {
	const next = mutationChain.then(task, task);
	mutationChain = next.then(
		() => undefined,
		() => undefined
	);
	return next;
}
