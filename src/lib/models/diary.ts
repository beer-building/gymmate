import { createEffect, createEvent, createStore, sample } from 'effector';
import * as api from '$lib/api';
import { pb } from '$lib/pb';
import type { Exercise, ProgramExercise, Workout, WorkoutSet } from '$lib/types';

// --- список тренировок ---

export const diaryPageOpened = createEvent();

export const loadWorkoutsFx = createEffect(() => {
	const userId = pb.authStore.record?.id;
	if (!userId) throw new Error('not authenticated');
	return api.getWorkouts(userId);
});

export const workouts = createStore<Workout[]>([]).on(
	loadWorkoutsFx.doneData,
	(_, items) => items
);

export const workoutsLoading = loadWorkoutsFx.pending;

sample({ clock: diaryPageOpened, target: loadWorkoutsFx });

// --- создание/удаление тренировки ---

export const workoutCreateRequested = createEvent<{ name?: string; programDay?: string }>();

export const createWorkoutFx = createEffect(
	({ name, programDay }: { name?: string; programDay?: string }) => {
		const userId = pb.authStore.record?.id;
		if (!userId) throw new Error('not authenticated');
		return api.createWorkout({
			user: userId,
			date: new Date().toISOString(),
			name: name || 'Тренировка',
			program_day: programDay
		});
	}
);

export const workoutDeleteRequested = createEvent<string>();

export const deleteWorkoutFx = createEffect((id: string) => api.deleteWorkout(id));

sample({ clock: workoutCreateRequested, target: createWorkoutFx });
sample({ clock: workoutDeleteRequested, target: deleteWorkoutFx });
sample({ clock: deleteWorkoutFx.done, target: loadWorkoutsFx });

// --- страница тренировки: подходы и план из программы ---

export const workoutPageOpened = createEvent<string>();

export const loadWorkoutFx = createEffect(async (id: string) => {
	const workout = await api.getWorkout(id);
	const sets = await api.getWorkoutSets(id);
	let plan: ProgramExercise[] = [];
	if (workout.program_day) {
		plan = await api.getProgramDayExercises([workout.program_day]);
	}
	return { workout, sets, plan };
});

export const currentWorkout = createStore<Workout | null>(null)
	.on(loadWorkoutFx.doneData, (_, { workout }) => workout)
	.reset(workoutPageOpened);

export const workoutSets = createStore<WorkoutSet[]>([])
	.on(loadWorkoutFx.doneData, (_, { sets }) => sets)
	.reset(workoutPageOpened);

export const workoutPlan = createStore<ProgramExercise[]>([])
	.on(loadWorkoutFx.doneData, (_, { plan }) => plan)
	.reset(workoutPageOpened);

export const workoutLoading = loadWorkoutFx.pending;
export const workoutError = createStore(false)
	.on(loadWorkoutFx.fail, () => true)
	.reset(workoutPageOpened);

sample({ clock: workoutPageOpened, target: loadWorkoutFx });

// общий справочник упражнений для добавления подхода
export const loadAllExercisesFx = createEffect(() => api.getExercises());

export const allExercises = createStore<Exercise[]>([]).on(
	loadAllExercisesFx.doneData,
	(_, items) => items
);

sample({ clock: workoutPageOpened, target: loadAllExercisesFx });

// --- подходы ---

export const setAdded = createEvent<{ exercise: string; reps: number; weight: number }>();

export const addSetFx = createEffect(
	async ({
		workoutId,
		exercise,
		reps,
		weight,
		setNumber
	}: {
		workoutId: string;
		exercise: string;
		reps: number;
		weight: number;
		setNumber: number;
	}) => api.createWorkoutSet({ workout: workoutId, exercise, set_number: setNumber, reps, weight })
);

sample({
	clock: setAdded,
	source: { workout: currentWorkout, sets: workoutSets },
	filter: ({ workout }) => workout !== null,
	fn: ({ workout, sets }, { exercise, reps, weight }) => ({
		workoutId: workout!.id,
		exercise,
		reps,
		weight,
		// номер подхода в рамках одного упражнения
		setNumber: sets.filter((set) => set.exercise === exercise).length + 1
	}),
	target: addSetFx
});

workoutSets.on(addSetFx.doneData, (sets, created) => [...sets, created]);

export const setDeleted = createEvent<string>();

export const deleteSetFx = createEffect(async (id: string) => {
	await api.deleteWorkoutSet(id);
	return id;
});

sample({ clock: setDeleted, target: deleteSetFx });

workoutSets.on(deleteSetFx.doneData, (sets, id) => sets.filter((set) => set.id !== id));

// --- заметки и поля тренировки ---

export const workoutUpdated = createEvent<Partial<Workout>>();

export const updateWorkoutFx = createEffect(
	({ id, data }: { id: string; data: Partial<Workout> }) => api.updateWorkout(id, data)
);

sample({
	clock: workoutUpdated,
	source: currentWorkout,
	filter: (workout) => workout !== null,
	fn: (workout, data) => ({ id: workout!.id, data }),
	target: updateWorkoutFx
});

// ответ update приходит без expand — сохраняем уже загруженный
currentWorkout.on(updateWorkoutFx.doneData, (current, workout) =>
	current ? { ...workout, expand: current.expand } : workout
);
