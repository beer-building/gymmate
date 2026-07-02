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

// незавершённая тренировка — для плашки «продолжить» над табами дневника:
// вернувшийся после прерывания пользователь должен увидеть её сразу
export const activeWorkoutLog = workoutLogs.map(
	(logs) => logs.find((log) => !log.completed_at) ?? null
);

// фейл загрузки не должен маскироваться под «Пока пусто»
export const workoutLogsError = createStore(false)
	.on(loadWorkoutLogsFx.fail, () => true)
	.reset(loadWorkoutLogsFx.done);

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

export const myProgramsError = createStore(false)
	.on(loadMyProgramsFx.fail, () => true)
	.reset(loadMyProgramsFx.done);

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
				target_duration_seconds: item.target_duration_seconds,
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
				target_duration_seconds: exercise.target_duration_seconds,
				notes: exercise.notes
			});
		}
	}
	return { program, skipped };
});

sample({ clock: importProgramFx.done, target: loadMyProgramsFx });

// старт тренировки из своей программы; повторное «Начать» по той же
// тренировке возвращает уже идущий лог вместо создания дубликата.
// program.id избыточен — он же лежит в workout.user_program
export const startUserWorkoutFx = createEffect(async (workout: UserProgramWorkout) => {
	const logs = await api.getWorkoutLogs(authUserId());
	const active = logs.find((log) => !log.completed_at && log.user_program_workout === workout.id);
	if (active) return active;
	return api.createWorkoutLog({
		user: authUserId(),
		name_snapshot: workout.name,
		started_at: new Date().toISOString(),
		user_program: workout.user_program,
		user_program_workout: workout.id
	});
});

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

// --- последний подход упражнения: автоподстановка веса/повторов ---

export const lastSetRequested = createEvent<string>();

export const loadLastSetFx = createEffect(
	async ({ exerciseId, excludeLogId }: { exerciseId: string; excludeLogId: string }) => ({
		exerciseId,
		set: await api.getLastExerciseSet(authUserId(), exerciseId, excludeLogId)
	})
);

// exerciseId хранится рядом с подходом: ответ может прийти после того,
// как пользователь уже выбрал другое упражнение
export const lastSet = createStore<{ exerciseId: string; set: WorkoutLogSet | null } | null>(null)
	.on(loadLastSetFx.doneData, (_, data) => data)
	.reset(lastSetRequested)
	.reset(workoutPageOpened);

sample({
	clock: lastSetRequested,
	source: currentWorkoutLog,
	filter: (log) => log !== null,
	fn: (log, exerciseId) => ({ exerciseId, excludeLogId: log!.id }),
	target: loadLastSetFx
});

// --- таймер отдыха между подходами ---

export const DEFAULT_REST_SECONDS = 90;

export const restStarted = createEvent<number>();
export const restStopped = createEvent();
export const restExtended = createEvent<number>();

export interface RestTimer {
	endsAt: number;
	totalSeconds: number;
}

// таймер переживает навигацию и перезагрузку: храним в localStorage и
// восстанавливаем при старте приложения, если он ещё не истёк
const REST_TIMER_KEY = 'gymmate:rest-timer';

function loadPersistedRest(): RestTimer | null {
	if (typeof localStorage === 'undefined') return null;
	try {
		const raw = localStorage.getItem(REST_TIMER_KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as RestTimer;
		if (parsed && typeof parsed.endsAt === 'number' && parsed.endsAt > Date.now()) {
			return parsed;
		}
		localStorage.removeItem(REST_TIMER_KEY);
	} catch {
		/* битое значение — игнорируем */
	}
	return null;
}

// reset на workoutPageOpened убран намеренно: таймер глобальный и не должен
// гаснуть при переходе на другую страницу или возврате в тренировку
export const restTimer = createStore<RestTimer | null>(loadPersistedRest())
	.on(restStarted, (_, seconds) => ({
		endsAt: Date.now() + seconds * 1000,
		totalSeconds: seconds
	}))
	.on(restExtended, (timer, seconds) =>
		timer
			? { endsAt: timer.endsAt + seconds * 1000, totalSeconds: timer.totalSeconds + seconds }
			: timer
	)
	.reset(restStopped);

restTimer.watch((timer) => {
	if (typeof localStorage === 'undefined') return;
	if (timer) localStorage.setItem(REST_TIMER_KEY, JSON.stringify(timer));
	else localStorage.removeItem(REST_TIMER_KEY);
});

// после записанного подхода отдых стартует сам; длительность — из плана
// упражнения, если оно там есть. На завершённой тренировке (правка задним
// числом) таймер не нужен.
sample({
	clock: addSetFx.done,
	source: { plan: workoutPlan, log: currentWorkoutLog },
	filter: ({ log }) => log !== null && !log.completed_at,
	fn: ({ plan }, { params }) =>
		plan.find((item) => item.exercise === params.exerciseId)?.rest_seconds || DEFAULT_REST_SECONDS,
	target: restStarted
});

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

// завершённая тренировка не должна через минуту кричать «ПОГНАЛИ»
restTimer.reset(workoutFinishRequested);

// «раз-завершить»: случайный тап по «Завершить» не должен быть необратимым.
// duration_seconds обнуляем — при повторном завершении пересчитается от started_at
export const workoutResumeRequested = createEvent();

sample({
	clock: workoutResumeRequested,
	source: currentWorkoutLog,
	filter: (log) => log !== null && !!log.completed_at,
	fn: (log) => ({ id: log!.id, data: { completed_at: '', duration_seconds: 0 } }),
	target: updateWorkoutLogFx
});

// --- видимые ошибки записи ---

// молчаливый фейл в зале означает «подход не записался, а я не узнал»:
// каждый пишущий эффект страницы тренировки обязан показать ошибку
export const workoutActionError = createStore<string | null>(null)
	.on(addSetFx.fail, () => 'Подход не записался — проверь соединение и попробуй ещё раз.')
	.on(deleteSetFx.fail, () => 'Не удалось удалить подход — попробуй ещё раз.')
	.on(
		updateWorkoutLogFx.fail,
		() => 'Не удалось сохранить — проверь соединение и попробуй ещё раз.'
	)
	.reset(addSetFx.done)
	.reset(deleteSetFx.done)
	.reset(updateWorkoutLogFx.done)
	.reset(workoutPageOpened);

// --- сводка завершённой тренировки ---

// «прошлый раз» по каждому упражнению лога — тот же ориентир, что и хинт в форме
// (последний рабочий подход из прошлых тренировок). Нужен для дельты «вес вырос/упал»
// в итоговой плите. Один запрос на упражнение; noCancel в getLastExerciseSet снимает
// автоотмену параллельных вызовов к одной коллекции.
export interface ExercisePrevWeight {
	exerciseId: string;
	prevWeight: number | null;
}

export const workoutSummaryRequested = createEvent<{ logId: string; exerciseIds: string[] }>();

export const loadWorkoutSummaryFx = createEffect(
	async ({
		logId,
		exerciseIds
	}: {
		logId: string;
		exerciseIds: string[];
	}): Promise<ExercisePrevWeight[]> => {
		const userId = authUserId();
		return Promise.all(
			exerciseIds.map(async (exerciseId) => ({
				exerciseId,
				prevWeight: (await api.getLastExerciseSet(userId, exerciseId, logId))?.weight ?? null
			}))
		);
	}
);

export const workoutSummary = createStore<ExercisePrevWeight[]>([])
	.on(loadWorkoutSummaryFx.doneData, (_, items) => items)
	.reset(workoutPageOpened);

sample({ clock: workoutSummaryRequested, target: loadWorkoutSummaryFx });
