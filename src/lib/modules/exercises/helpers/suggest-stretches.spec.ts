import { describe, expect, it } from 'vitest';
import { suggestStretches } from './suggest-stretches';
import type { Exercise, ExerciseKind, MuscleGroup } from '$lib/shared/types';

const ex = (id: string, kind: ExerciseKind, primary: MuscleGroup[]): Exercise => ({
	id,
	name: id,
	slug: id,
	kind,
	primary_muscles: primary,
	secondary_muscles: [],
	equipment: 'bodyweight',
	difficulty: 'beginner',
	instructions: '',
	videos: null
});

describe('suggestStretches', () => {
	it('подбирает растяжки по пересечению мышц, ранжирует по покрытию, исключает уже добавленные в план', () => {
		const planned = [
			ex('bench', 'strength', ['chest', 'triceps']),
			ex('stretch-in-plan', 'stretching', ['back'])
		];
		const catalog = [
			...planned,
			ex('chest-stretch', 'stretching', ['chest']),
			ex('chest-triceps-stretch', 'stretching', ['chest', 'triceps']),
			ex('legs-stretch', 'stretching', ['legs']),
			ex('chest-warmup', 'warmup', ['chest'])
		];

		expect(suggestStretches(planned, catalog).map((item) => item.id)).toEqual([
			'chest-triceps-stretch',
			'chest-stretch'
		]);
	});

	it('режет список по limit', () => {
		const planned = [ex('bench', 'strength', ['chest'])];
		const catalog = [ex('s1', 'stretching', ['chest']), ex('s2', 'stretching', ['chest'])];
		expect(suggestStretches(planned, catalog, 1)).toHaveLength(1);
	});
});
