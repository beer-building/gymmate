import { describe, it, expect } from 'vitest';
import { applyReorder } from './reorder';
import type { UserProgramWorkoutExercise } from '$lib/shared/types';

const ex = (id: string, workout: string, order_index: number) =>
	({ id, user_program_workout: workout, order_index }) as UserProgramWorkoutExercise;

describe('applyReorder', () => {
	it('перенумеровывает по orderedIds и не трогает упражнения других тренировок', () => {
		const items = [
			ex('a', 'w1', 0),
			ex('b', 'w1', 1),
			ex('c', 'w1', 2),
			ex('x', 'w2', 0) // другая тренировка
		];
		const result = applyReorder(items, ['c', 'a', 'b']); // c переносим в начало
		const byId = Object.fromEntries(result.map((i) => [i.id, i.order_index]));
		expect(byId).toEqual({ c: 0, a: 1, b: 2, x: 0 });
	});

	it('нормализует дыры в order_index после удалений', () => {
		const items = [ex('a', 'w1', 0), ex('b', 'w1', 3), ex('c', 'w1', 7)];
		const result = applyReorder(items, ['a', 'b', 'c']); // порядок тот же
		expect(result.map((i) => i.order_index)).toEqual([0, 1, 2]);
	});
});
