import { createEffect, createEvent, createStore, sample } from 'effector';
import * as diaryApi from '$lib/modules/diary/api';
import { pb } from '$lib/shared/api';
import {
	buildExerciseSeries,
	buildHeatmap,
	findRecentRecords,
	pickNextWorkout,
	setsPerDay,
	volumeSince,
	weekStreak,
	type ExerciseSeries,
	type HeatmapDay,
	type NextWorkout,
	type PersonalRecord
} from '../helpers/stats';
import type { UserProgramWorkoutExercise, WorkoutLog } from '$lib/shared/types';

const HEATMAP_WEEKS = 16;

export interface Dashboard {
	// незавершённая тренировка — предлагаем продолжить вместо новой
	activeLog: WorkoutLog | null;
	next: (NextWorkout & { exercises: UserProgramWorkoutExercise[] }) | null;
	hasPrograms: boolean;
	streakWeeks: number;
	workoutsLast30: number;
	volumeLast7: number;
	heatmap: HeatmapDay[][];
	records: PersonalRecord[];
	exerciseSeries: ExerciseSeries[];
}

export const profilePageOpened = createEvent();

export const loadDashboardFx = createEffect(async (): Promise<Dashboard> => {
	const userId = pb.authStore.record?.id;
	if (!userId) throw new Error('not authenticated');

	// все коллекции разные — параллельные запросы SDK не автоотменяет
	const [logs, programs, logExercises, sets] = await Promise.all([
		diaryApi.getWorkoutLogs(userId),
		diaryApi.getUserPrograms(userId),
		diaryApi.getAllUserLogExercises(userId),
		diaryApi.getAllUserSets(userId)
	]);

	const active = programs.filter((program) => !program.archived_at);
	const workouts = await diaryApi.getUserProgramWorkoutsBatch(active.map((item) => item.id));
	const myPrograms = active.map((program) => ({
		program,
		workouts: workouts.filter((workout) => workout.user_program === program.id)
	}));

	const next = pickNextWorkout(myPrograms, logs);
	const nextExercises = next
		? await diaryApi.getUserProgramWorkoutExercises([next.workout.id])
		: [];

	const today = new Date();
	const perDay = setsPerDay(logs, logExercises, sets);
	const dayMs = 24 * 60 * 60 * 1000;

	return {
		activeLog: logs.find((log) => !log.completed_at) ?? null,
		next: next ? { ...next, exercises: nextExercises } : null,
		hasPrograms: myPrograms.length > 0,
		streakWeeks: weekStreak(perDay, today),
		workoutsLast30: logs.filter(
			(log) => Date.now() - new Date(log.started_at).getTime() <= 30 * dayMs
		).length,
		volumeLast7: volumeSince(logs, logExercises, sets, new Date(Date.now() - 7 * dayMs)),
		heatmap: buildHeatmap(perDay, today, HEATMAP_WEEKS),
		records: findRecentRecords(logs, logExercises, sets, 4),
		exerciseSeries: buildExerciseSeries(logs, logExercises, sets)
	};
});

export const dashboard = createStore<Dashboard | null>(null).on(
	loadDashboardFx.doneData,
	(_, data) => data
);

export const dashboardLoading = loadDashboardFx.pending;

sample({ clock: profilePageOpened, target: loadDashboardFx });
