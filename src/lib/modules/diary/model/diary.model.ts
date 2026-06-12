import { createEffect, createEvent, createStore, sample } from 'effector';
import * as api from '../api';
import { getExercises } from '$lib/modules/exercises/api';
import { parseProgramFile } from '../helpers/program-transfer';
import { pb } from '$lib/shared/api';
import type { ProgramDetails } from '$lib/modules/programs/model';
import type {
	Exercise,
	UserProgram,
	UserProgramWorkout,
	UserProgramWorkoutExercise,
	WorkoutLog,
	WorkoutLogExercise,
	WorkoutLogSet
} from '$lib/shared/types';

function authUserId(): string {
	const userId = pb.authStore.record?.id;
	if (!userId) throw new Error('not authenticated');
	return userId;
}

// --- список тренировок (история) ---

export const diaryPageOpened = createEvent();

export const loadWorkoutLogsFx = createEffect(() => api.getWorkoutLogs(authUserId()));

export const workoutLogs = createStore<WorkoutLog[]>([]).on(
	loadWorkoutLogsFx.doneData,
	(_, items) => items
);

export const workoutLogsLoading = loadWorkoutLogsFx.pending;

sample({ clock: diaryPageOpened, target: loadWorkoutLogsFx });

// --- создание/удаление тренировки ---

export const createWorkoutLogFx = createEffect((params: { name?: string } = {}) =>
	api.createWorkoutLog({
		user: authUserId(),
		name_snapshot: params.name || 'Тренировка',
		started_at: new Date().toISOString()
	})
);

export const workoutLogDeleteRequested = createEvent<string>();

export const deleteWorkoutLogFx = createEffect((id: string) => api.deleteWorkoutLog(id));

sample({ clock: workoutLogDeleteRequested, target: deleteWorkoutLogFx });
sample({ clock: deleteWorkoutLogFx.done, target: loadWorkoutLogsFx });

// --- мои программы (форки) в дневнике ---

export interface MyProgram {
	program: UserProgram;
	workouts: UserProgramWorkout[];
}

export const loadMyProgramsFx = createEffect(async (): Promise<MyProgram[]> => {
	const userId = authUserId();
	const active = (await api.getUserPrograms(userId)).filter((item) => !item.archived_at);
	const workouts = await api.getUserProgramWorkoutsBatch(active.map((program) => program.id));
	return active.map((program) => ({
		program,
		workouts: workouts.filter((workout) => workout.user_program === program.id)
	}));
});

export const myPrograms = createStore<MyProgram[]>([]).on(
	loadMyProgramsFx.doneData,
	(_, items) => items
);

export const myProgramsLoading = loadMyProgramsFx.pending;

sample({ clock: diaryPageOpened, target: loadMyProgramsFx });

// Копирование шаблона целиком в user_program_* (fork). Лог тренировки
// ссылается только на пользовательский слой, поэтому без форка программу
// начать нельзя. Повторное добавление возвращает уже существующий форк.
export const forkProgramFx = createEffect(async (details: ProgramDetails) => {
	const userId = authUserId();
	const { program, workouts, exercisesByWorkout } = details;

	const existing = (await api.getUserPrograms(userId)).find(
		(item) => item.source_program === program.id && !item.archived_at
	);
	if (existing) return existing;

	const userProgram = await api.createUserProgram({
		user: userId,
		source_program: program.id,
		name: program.name,
		description: program.description,
		difficulty: program.difficulty || undefined,
		started_at: new Date().toISOString()
	});
	for (const workout of workouts) {
		const userWorkout = await api.createUserProgramWorkout({
			user_program: userProgram.id,
			name: workout.name,
			order_index: workout.order_index
		});
		for (const item of exercisesByWorkout[workout.id] ?? []) {
			await api.createUserProgramWorkoutExercise({
				user_program_workout: userWorkout.id,
				exercise: item.exercise,
				order_index: item.order_index,
				target_sets: item.target_sets,
				target_reps_min: item.target_reps_min,
				target_reps_max: item.target_reps_max,
				target_weight: item.target_weight,
				rest_seconds: item.rest_seconds,
				notes: item.notes
			});
		}
	}
	return userProgram;
});

// создание своей программы с нуля
export const createOwnProgramFx = createEffect(() =>
	api.createUserProgram({ user: authUserId(), name: 'Моя программа' })
);

// Импорт программы из JSON-файла (экспортирован другом). Упражнения
// матчатся по slug; отсутствующие в каталоге пропускаются и возвращаются
// списком, чтобы показать пользователю.
export const importProgramFx = createEffect(async (file: File) => {
	const parsed = parseProgramFile(await file.text());
	const userId = authUserId();
	const catalog = await getExercises();
	const bySlug = new Map(catalog.map((item) => [item.slug, item]));

	const program = await api.createUserProgram({
		user: userId,
		name: parsed.name,
		description: parsed.description,
		difficulty: parsed.difficulty || undefined,
		started_at: new Date().toISOString()
	});
	const skipped: string[] = [];
	for (const [workoutIndex, workout] of parsed.workouts.entries()) {
		const created = await api.createUserProgramWorkout({
			user_program: program.id,
			name: workout.name,
			order_index: workoutIndex + 1
		});
		let orderIndex = 0;
		for (const exercise of workout.exercises) {
			const catalogExercise = bySlug.get(exercise.slug);
			if (!catalogExercise) {
				skipped.push(exercise.name);
				continue;
			}
			await api.createUserProgramWorkoutExercise({
				user_program_workout: created.id,
				exercise: catalogExercise.id,
				order_index: orderIndex++,
				target_sets: exercise.target_sets,
				target_reps_min: exercise.target_reps_min,
				target_reps_max: exercise.target_reps_max,
				target_weight: exercise.target_weight,
				rest_seconds: exercise.rest_seconds,
				notes: exercise.notes
			});
		}
	}
	return { program, skipped };
});

sample({ clock: importProgramFx.done, target: loadMyProgramsFx });

// старт тренировки из своей программы
export const startUserWorkoutFx = createEffect(
	({ program, workout }: { program: UserProgram; workout: UserProgramWorkout }) =>
		api.createWorkoutLog({
			user: authUserId(),
			name_snapshot: workout.name,
			started_at: new Date().toISOString(),
			user_program: program.id,
			user_program_workout: workout.id
		})
);

// программа уходит в архив, история логов остаётся
export const programArchiveRequested = createEvent<string>();

export const archiveUserProgramFx = createEffect((id: string) =>
	api.updateUserProgram(id, { archived_at: new Date().toISOString() })
);

sample({ clock: programArchiveRequested, target: archiveUserProgramFx });
sample({ clock: archiveUserProgramFx.done, target: loadMyProgramsFx });

// --- план тренировки (список упражнений без лога) ---

export const workoutPlanPageOpened = createEvent<string>();

export const loadWorkoutPlanFx = createEffect(async (id: string) => {
	const workout = await api.getUserProgramWorkout(id);
	const exercises = await api.getUserProgramWorkoutExercises([id]);
	return { workout, exercises };
});

export const currentWorkoutPlan = createStore<UserProgramWorkout | null>(null)
	.on(loadWorkoutPlanFx.doneData, (_, { workout }) => workout)
	.reset(workoutPlanPageOpened);

export const workoutPlanExercises = createStore<UserProgramWorkoutExercise[]>([])
	.on(loadWorkoutPlanFx.doneData, (_, { exercises }) => exercises)
	.reset(workoutPlanPageOpened);

export const workoutPlanLoading = loadWorkoutPlanFx.pending;
export const workoutPlanError = createStore(false)
	.on(loadWorkoutPlanFx.fail, () => true)
	.reset(workoutPlanPageOpened);

sample({ clock: workoutPlanPageOpened, target: loadWorkoutPlanFx });

// --- страница тренировки: упражнения, подходы и план из форка ---

export const workoutPageOpened = createEvent<string>();

export const loadWorkoutLogFx = createEffect(async (id: string) => {
	const log = await api.getWorkoutLog(id);
	const [exercises, sets, plan] = await Promise.all([
		api.getWorkoutLogExercises(id),
		api.getWorkoutLogSets(id),
		log.user_program_workout
			? api.getUserProgramWorkoutExercises([log.user_program_workout])
			: Promise.resolve([] as UserProgramWorkoutExercise[])
	]);
	return { log, exercises, sets, plan };
});

export const currentWorkoutLog = createStore<WorkoutLog | null>(null)
	.on(loadWorkoutLogFx.doneData, (_, { log }) => log)
	.reset(workoutPageOpened);

export const logExercises = createStore<WorkoutLogExercise[]>([])
	.on(loadWorkoutLogFx.doneData, (_, { exercises }) => exercises)
	.reset(workoutPageOpened);

export const logSets = createStore<WorkoutLogSet[]>([])
	.on(loadWorkoutLogFx.doneData, (_, { sets }) => sets)
	.reset(workoutPageOpened);

export const workoutPlan = createStore<UserProgramWorkoutExercise[]>([])
	.on(loadWorkoutLogFx.doneData, (_, { plan }) => plan)
	.reset(workoutPageOpened);

export const workoutLoading = loadWorkoutLogFx.pending;
export const workoutError = createStore(false)
	.on(loadWorkoutLogFx.fail, () => true)
	.reset(workoutPageOpened);

sample({ clock: workoutPageOpened, target: loadWorkoutLogFx });

// общий справочник упражнений для добавления подхода
export const loadAllExercisesFx = createEffect(() => getExercises());

export const allExercises = createStore<Exercise[]>([]).on(
	loadAllExercisesFx.doneData,
	(_, items) => items
);

sample({ clock: workoutPageOpened, target: loadAllExercisesFx });

// --- подходы ---

export const setAdded = createEvent<{ exercise: string; reps: number; weight: number }>();

export const addSetFx = createEffect(
	async ({
		log,
		exercises,
		sets,
		exerciseId,
		exerciseName,
		reps,
		weight
	}: {
		log: WorkoutLog;
		exercises: WorkoutLogExercise[];
		sets: WorkoutLogSet[];
		exerciseId: string;
		exerciseName: string;
		reps: number;
		weight: number;
	}) => {
		let logExercise = exercises.find((item) => item.exercise === exerciseId);
		let createdExercise: WorkoutLogExercise | null = null;
		if (!logExercise) {
			createdExercise = await api.createWorkoutLogExercise({
				workout_log: log.id,
				exercise: exerciseId,
				exercise_name_snapshot: exerciseName,
				order_index: exercises.length
			});
			logExercise = createdExercise;
		}
		const set = await api.createWorkoutLogSet({
			workout_log_exercise: logExercise.id,
			set_index: sets.filter((item) => item.workout_log_exercise === logExercise.id).length + 1,
			reps,
			weight,
			completed: true
		});
		return { exercise: createdExercise, set };
	}
);

sample({
	clock: setAdded,
	source: {
		log: currentWorkoutLog,
		exercises: logExercises,
		sets: logSets,
		catalog: allExercises
	},
	filter: ({ log }) => log !== null,
	fn: ({ log, exercises, sets, catalog }, { exercise, reps, weight }) => ({
		log: log!,
		exercises,
		sets,
		exerciseId: exercise,
		exerciseName: catalog.find((item) => item.id === exercise)?.name ?? 'Упражнение',
		reps,
		weight
	}),
	target: addSetFx
});

logExercises.on(addSetFx.doneData, (exercises, { exercise }) =>
	exercise ? [...exercises, exercise] : exercises
);
logSets.on(addSetFx.doneData, (sets, { set }) => [...sets, set]);

export const setDeleted = createEvent<string>();

// вместе с последним подходом удаляем и опустевшее упражнение лога
export const deleteSetFx = createEffect(
	async ({ id, sets }: { id: string; sets: WorkoutLogSet[] }) => {
		const set = sets.find((item) => item.id === id);
		await api.deleteWorkoutLogSet(id);
		let removedExercise: string | null = null;
		if (
			set &&
			!sets.some((item) => item.workout_log_exercise === set.workout_log_exercise && item.id !== id)
		) {
			await api.deleteWorkoutLogExercise(set.workout_log_exercise);
			removedExercise = set.workout_log_exercise;
		}
		return { id, removedExercise };
	}
);

sample({
	clock: setDeleted,
	source: logSets,
	fn: (sets, id) => ({ id, sets }),
	target: deleteSetFx
});

logSets.on(deleteSetFx.doneData, (sets, { id }) => sets.filter((set) => set.id !== id));
logExercises.on(deleteSetFx.doneData, (exercises, { removedExercise }) =>
	removedExercise ? exercises.filter((item) => item.id !== removedExercise) : exercises
);

// --- заметки и завершение тренировки ---

export const workoutUpdated = createEvent<Partial<WorkoutLog>>();

export const updateWorkoutLogFx = createEffect(
	({ id, data }: { id: string; data: Partial<WorkoutLog> }) => api.updateWorkoutLog(id, data)
);

sample({
	clock: workoutUpdated,
	source: currentWorkoutLog,
	filter: (log) => log !== null,
	fn: (log, data) => ({ id: log!.id, data }),
	target: updateWorkoutLogFx
});

currentWorkoutLog.on(updateWorkoutLogFx.doneData, (_, log) => log);

export const workoutFinishRequested = createEvent();

sample({
	clock: workoutFinishRequested,
	source: currentWorkoutLog,
	filter: (log) => log !== null && !log.completed_at,
	fn: (log) => {
		const startedAt = new Date(log!.started_at).getTime();
		return {
			id: log!.id,
			data: {
				completed_at: new Date().toISOString(),
				duration_seconds: Math.max(0, Math.round((Date.now() - startedAt) / 1000))
			}
		};
	},
	target: updateWorkoutLogFx
});
