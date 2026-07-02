import { describe, it, expect } from 'vitest';
import { findSimilarExercises } from './find-similar';
import type { Exercise, MuscleGroup } from '$lib/shared/types';

const ex = (id: string, name: string, primary: MuscleGroup[]): Exercise => ({
	id,
	name,
	slug: id,
	kind: 'strength',
	primary_muscles: primary,
	secondary_muscles: [],
	equipment: 'barbell',
	difficulty: 'beginner',
	instructions: '',
	videos: null
});

describe('findSimilarExercises', () => {
	it('исключает само упражнение, отсеивает без пересечения и ранжирует по совпадениям', () => {
		const target = ex('1', 'Жим лёжа', ['chest', 'triceps']);
		const pool = [
			target,
			ex('2', 'Разводка', ['chest']), // пересечение 1
			ex('3', 'Отжимания', ['chest', 'triceps']), // пересечение 2 → выше
			ex('4', 'Присед', ['legs']) // пересечение 0 → отсеивается
		];

		const result = findSimilarExercises(target, pool);

		expect(result.map((item) => item.id)).toEqual(['3', '2']);
	});
});
