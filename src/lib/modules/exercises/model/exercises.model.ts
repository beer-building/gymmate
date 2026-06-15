import { combine, createEffect, createEvent, createStore, sample } from 'effector';
import * as api from '../api';
import type { Exercise, MuscleGroup } from '$lib/shared/types';

// --- список упражнений: грузим весь каталог, фильтруем на клиенте ---

export const exercisesPageOpened = createEvent();
export const muscleGroupSelected = createEvent<MuscleGroup | null>();
export const searchChanged = createEvent<string>();

export const loadExercisesFx = createEffect(() => api.getExercises());

export const exercises = createStore<Exercise[]>([]).on(
	loadExercisesFx.doneData,
	(_, items) => items
);

export const muscleGroup = createStore<MuscleGroup | null>(null).on(
	muscleGroupSelected,
	(_, group) => group
);

export const searchQuery = createStore('').on(searchChanged, (_, query) => query);

export const filteredExercises = combine(
	exercises,
	muscleGroup,
	searchQuery,
	(items, group, query) => {
		const normalized = query.trim().toLowerCase();
		return items.filter(
			(item) =>
				(!group || item.primary_muscles.includes(group)) &&
				(!normalized || item.name.toLowerCase().includes(normalized))
		);
	}
);

export const exercisesLoading = loadExercisesFx.pending;
export const exercisesError = createStore(false)
	.on(loadExercisesFx.fail, () => true)
	.reset(loadExercisesFx.done);

sample({ clock: exercisesPageOpened, target: loadExercisesFx });

// --- деталка упражнения ---

export const exercisePageOpened = createEvent<string>();

export const loadExerciseFx = createEffect((id: string) => api.getExercise(id));

export const currentExercise = createStore<Exercise | null>(null)
	.on(loadExerciseFx.doneData, (_, item) => item)
	.reset(exercisePageOpened);

export const exerciseLoading = loadExerciseFx.pending;
export const exerciseError = createStore(false)
	.on(loadExerciseFx.fail, () => true)
	.reset(exercisePageOpened);

sample({
	clock: exercisePageOpened,
	target: loadExerciseFx
});
