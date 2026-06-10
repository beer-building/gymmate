import { createEffect, createEvent, createStore, sample } from 'effector';
import * as api from '$lib/api';
import type { Exercise, MuscleGroup } from '$lib/types';

// --- список упражнений ---

export const exercisesPageOpened = createEvent();
export const muscleGroupSelected = createEvent<MuscleGroup | null>();

export const loadExercisesFx = createEffect((group: MuscleGroup | null) =>
	api.getExercises(group ?? undefined)
);

export const muscleGroup = createStore<MuscleGroup | null>(null).on(
	muscleGroupSelected,
	(_, group) => group
);

export const exercises = createStore<Exercise[]>([]).on(
	loadExercisesFx.doneData,
	(_, items) => items
);

export const exercisesLoading = loadExercisesFx.pending;
export const exercisesError = createStore(false)
	.on(loadExercisesFx.fail, () => true)
	.reset(loadExercisesFx.done);

sample({
	clock: exercisesPageOpened,
	source: muscleGroup,
	target: loadExercisesFx
});

sample({
	clock: muscleGroupSelected,
	target: loadExercisesFx
});

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
