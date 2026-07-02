import type { Exercise, MuscleGroup } from '$lib/shared/types';

// Растяжки на мышцы, задействованные в плане тренировки: пересечение по
// primary_muscles, ранжирование по числу покрытых групп (при равенстве — по
// алфавиту), уже добавленные в план исключаются. Растяжки из плана мышцы
// «не задействуют» — на них новые растяжки не предлагаем.
export function suggestStretches(planned: Exercise[], catalog: Exercise[], limit = 5): Exercise[] {
	const used = new Set<MuscleGroup>(
		planned
			.filter((exercise) => exercise.kind !== 'stretching')
			.flatMap((exercise) => exercise.primary_muscles)
	);
	const plannedIds = new Set(planned.map((exercise) => exercise.id));
	return catalog
		.filter((exercise) => exercise.kind === 'stretching' && !plannedIds.has(exercise.id))
		.map((exercise) => ({
			exercise,
			score: exercise.primary_muscles.filter((muscle) => used.has(muscle)).length
		}))
		.filter(({ score }) => score > 0)
		.sort((a, b) => b.score - a.score || a.exercise.name.localeCompare(b.exercise.name, 'ru'))
		.slice(0, limit)
		.map(({ exercise }) => exercise);
}
