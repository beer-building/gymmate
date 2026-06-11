import { createEffect, createEvent, createStore, sample } from 'effector';
import * as api from '../api';
import { getExercises } from '$lib/modules/exercises/api';
import type {
	Exercise,
	UserProgram,
	UserProgramWorkout,
	UserProgramWorkoutExercise
} from '$lib/shared/types';

// Редактор своей программы: имя, тренировки, упражнения с целевыми
// подходами/повторами/весами. Все правки сохраняются сразу (PocketBase).

// --- загрузка ---

export const editorOpened = createEvent<string>();

export const loadEditorFx = createEffect(async (id: string) => {
	const program = await api.getUserProgram(id);
	const workouts = await api.getUserProgramWorkouts(id);
	const exercises = await api.getUserProgramWorkoutExercises(workouts.map((item) => item.id));
	return { program, workouts, exercises };
});

export const editorProgram = createStore<UserProgram | null>(null)
	.on(loadEditorFx.doneData, (_, { program }) => program)
	.reset(editorOpened);

export const editorWorkouts = createStore<UserProgramWorkout[]>([])
	.on(loadEditorFx.doneData, (_, { workouts }) => workouts)
	.reset(editorOpened);

export const editorExercises = createStore<UserProgramWorkoutExercise[]>([])
	.on(loadEditorFx.doneData, (_, { exercises }) => exercises)
	.reset(editorOpened);

export const editorLoading = loadEditorFx.pending;
export const editorError = createStore(false)
	.on(loadEditorFx.fail, () => true)
	.reset(editorOpened);

sample({ clock: editorOpened, target: loadEditorFx });

// каталог упражнений для добавления
export const loadCatalogFx = createEffect(() => getExercises());

export const catalog = createStore<Exercise[]>([]).on(loadCatalogFx.doneData, (_, items) => items);

sample({ clock: editorOpened, target: loadCatalogFx });

// --- программа ---

export const programChanged = createEvent<Partial<UserProgram>>();

export const updateProgramFx = createEffect(
	({ id, data }: { id: string; data: Partial<UserProgram> }) => api.updateUserProgram(id, data)
);

sample({
	clock: programChanged,
	source: editorProgram,
	filter: (program) => program !== null,
	fn: (program, data) => ({ id: program!.id, data }),
	target: updateProgramFx
});

editorProgram.on(updateProgramFx.doneData, (_, program) => program);

// --- тренировки ---

export const workoutAdded = createEvent();

export const addWorkoutFx = createEffect(
	({ programId, orderIndex }: { programId: string; orderIndex: number }) =>
		api.createUserProgramWorkout({
			user_program: programId,
			name: `Тренировка ${orderIndex}`,
			order_index: orderIndex
		})
);

sample({
	clock: workoutAdded,
	source: { program: editorProgram, workouts: editorWorkouts },
	filter: ({ program }) => program !== null,
	fn: ({ program, workouts }) => ({
		programId: program!.id,
		orderIndex: Math.max(0, ...workouts.map((item) => item.order_index)) + 1
	}),
	target: addWorkoutFx
});

editorWorkouts.on(addWorkoutFx.doneData, (workouts, created) => [...workouts, created]);

export const workoutChanged = createEvent<{ id: string; data: Partial<UserProgramWorkout> }>();

export const updateWorkoutFx = createEffect(
	({ id, data }: { id: string; data: Partial<UserProgramWorkout> }) =>
		api.updateUserProgramWorkout(id, data)
);

sample({ clock: workoutChanged, target: updateWorkoutFx });

editorWorkouts.on(updateWorkoutFx.doneData, (workouts, updated) =>
	workouts.map((item) => (item.id === updated.id ? updated : item))
);

export const workoutRemoved = createEvent<string>();

export const deleteWorkoutFx = createEffect(async (id: string) => {
	await api.deleteUserProgramWorkout(id);
	return id;
});

sample({ clock: workoutRemoved, target: deleteWorkoutFx });

editorWorkouts.on(deleteWorkoutFx.doneData, (workouts, id) =>
	workouts.filter((item) => item.id !== id)
);
// упражнения тренировки удаляются на сервере каскадом
editorExercises.on(deleteWorkoutFx.doneData, (exercises, id) =>
	exercises.filter((item) => item.user_program_workout !== id)
);

// --- упражнения ---

export const exerciseAdded = createEvent<{ workoutId: string; exerciseId: string }>();

export const addExerciseFx = createEffect(
	({
		workoutId,
		exerciseId,
		orderIndex
	}: {
		workoutId: string;
		exerciseId: string;
		orderIndex: number;
	}) =>
		api.createUserProgramWorkoutExercise({
			user_program_workout: workoutId,
			exercise: exerciseId,
			order_index: orderIndex,
			target_sets: 3,
			target_reps_min: 0,
			target_reps_max: 0,
			target_weight: 0,
			rest_seconds: 0,
			notes: ''
		})
);

sample({
	clock: exerciseAdded,
	source: editorExercises,
	fn: (exercises, { workoutId, exerciseId }) => ({
		workoutId,
		exerciseId,
		orderIndex: exercises.filter((item) => item.user_program_workout === workoutId).length
	}),
	target: addExerciseFx
});

editorExercises.on(addExerciseFx.doneData, (exercises, created) => [...exercises, created]);

export const exerciseChanged = createEvent<{
	id: string;
	data: Partial<UserProgramWorkoutExercise>;
}>();

export const updateExerciseFx = createEffect(
	({ id, data }: { id: string; data: Partial<UserProgramWorkoutExercise> }) =>
		api.updateUserProgramWorkoutExercise(id, data)
);

sample({ clock: exerciseChanged, target: updateExerciseFx });

editorExercises.on(updateExerciseFx.doneData, (exercises, updated) =>
	exercises.map((item) => (item.id === updated.id ? updated : item))
);

export const exerciseRemoved = createEvent<string>();

export const deleteExerciseFx = createEffect(async (id: string) => {
	await api.deleteUserProgramWorkoutExercise(id);
	return id;
});

sample({ clock: exerciseRemoved, target: deleteExerciseFx });

editorExercises.on(deleteExerciseFx.doneData, (exercises, id) =>
	exercises.filter((item) => item.id !== id)
);
