import type { UserProgramWorkoutExercise } from '$lib/shared/types';

// Новый порядок упражнений внутри одной тренировки: orderedIds задаёт позиции
// (order_index), упражнения других тренировок остаются нетронутыми.
export function applyReorder(
	exercises: UserProgramWorkoutExercise[],
	orderedIds: string[]
): UserProgramWorkoutExercise[] {
	const position = new Map(orderedIds.map((id, index) => [id, index]));
	return exercises.map((item) =>
		position.has(item.id) ? { ...item, order_index: position.get(item.id)! } : item
	);
}
