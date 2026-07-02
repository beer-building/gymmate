import type { Exercise } from '$lib/shared/types';

// «Похожие» = упражнения с пересечением по основным группам мышц,
// отсортированные по числу совпавших групп (больше пересечение — выше),
// при равенстве — по алфавиту. Само упражнение исключается.
export function findSimilarExercises(target: Exercise, pool: Exercise[]): Exercise[] {
	const targetMuscles = new Set(target.primary_muscles);
	return pool
		.filter((item) => item.id !== target.id)
		.map((item) => ({
			item,
			score: item.primary_muscles.filter((muscle) => targetMuscles.has(muscle)).length
		}))
		.filter(({ score }) => score > 0)
		.sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name, 'ru'))
		.map(({ item }) => item);
}
