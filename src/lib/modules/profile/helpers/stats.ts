import { muscleGroupLabels } from '$lib/shared/helpers/labels';
import type {
	Exercise,
	MuscleGroup,
	UserProgram,
	UserProgramWorkout,
	WorkoutLog,
	WorkoutLogExercise,
	WorkoutLogSet
} from '$lib/shared/types';

// Все расчёты в локальном времени пользователя: день тренировки —
// календарный день, а не UTC-сутки.

export function dayKey(date: Date): string {
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${date.getFullYear()}-${month}-${day}`;
}

function startOfWeek(date: Date): Date {
	const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
	// неделя с понедельника: getDay() даёт 0 для воскресенья
	const offset = (result.getDay() + 6) % 7;
	result.setDate(result.getDate() - offset);
	return result;
}

function addDays(date: Date, days: number): Date {
	const result = new Date(date);
	result.setDate(result.getDate() + days);
	return result;
}

// подходы по дням: дата берётся из тренировки, а не из created подхода —
// тренировка, записанная задним числом, попадает в свой день
export function setsPerDay(
	logs: WorkoutLog[],
	logExercises: WorkoutLogExercise[],
	sets: WorkoutLogSet[]
): Map<string, number> {
	const logDay = new Map(logs.map((log) => [log.id, dayKey(new Date(log.started_at))]));
	const exerciseDay = new Map<string, string>();
	for (const item of logExercises) {
		const day = logDay.get(item.workout_log);
		if (day) exerciseDay.set(item.id, day);
	}
	const result = new Map<string, number>();
	// тренировка без подходов тоже считается активностью
	for (const day of logDay.values()) {
		result.set(day, result.get(day) ?? 0);
	}
	for (const set of sets) {
		const day = exerciseDay.get(set.workout_log_exercise);
		if (day) result.set(day, (result.get(day) ?? 0) + 1);
	}
	return result;
}

export interface HeatmapDay {
	date: string; // YYYY-MM-DD
	count: number; // подходов за день
	level: 0 | 1 | 2 | 3;
	future: boolean;
}

// сетка как contribution-граф: колонка — неделя (пн..вс), последняя — текущая
export function buildHeatmap(
	perDay: Map<string, number>,
	today: Date,
	weeks: number
): HeatmapDay[][] {
	const todayDay = dayKey(today);
	const first = startOfWeek(addDays(today, -(weeks - 1) * 7));
	const result: HeatmapDay[][] = [];
	for (let week = 0; week < weeks; week++) {
		const column: HeatmapDay[] = [];
		for (let weekday = 0; weekday < 7; weekday++) {
			const date = addDays(first, week * 7 + weekday);
			const key = dayKey(date);
			const count = perDay.get(key);
			const level = count === undefined ? 0 : count >= 20 ? 3 : count >= 10 ? 2 : 1;
			column.push({ date: key, count: count ?? 0, level, future: key > todayDay });
		}
		result.push(column);
	}
	return result;
}

// стрик недель: сколько недель подряд была хотя бы одна тренировка;
// текущая неделя без тренировки стрик не обнуляет — она ещё не закончилась
export function weekStreak(perDay: Map<string, number>, today: Date): number {
	const trainedWeeks = new Set<string>();
	for (const key of perDay.keys()) {
		const [year, month, day] = key.split('-').map(Number);
		trainedWeeks.add(dayKey(startOfWeek(new Date(year, month - 1, day))));
	}
	let streak = 0;
	let cursor = startOfWeek(today);
	if (!trainedWeeks.has(dayKey(cursor))) {
		cursor = addDays(cursor, -7);
	}
	while (trainedWeeks.has(dayKey(cursor))) {
		streak += 1;
		cursor = addDays(cursor, -7);
	}
	return streak;
}

export function workoutsSince(logs: WorkoutLog[], since: Date): number {
	return logs.filter((log) => new Date(log.started_at) >= since).length;
}

// тоннаж за период: подходы тренировок, начатых не раньше since
export function volumeSince(
	logs: WorkoutLog[],
	logExercises: WorkoutLogExercise[],
	sets: WorkoutLogSet[],
	since: Date
): number {
	const recentLogs = new Set(
		logs.filter((log) => new Date(log.started_at) >= since).map((log) => log.id)
	);
	const recentExercises = new Set(
		logExercises.filter((item) => recentLogs.has(item.workout_log)).map((item) => item.id)
	);
	return sets
		.filter((set) => recentExercises.has(set.workout_log_exercise))
		.reduce((sum, set) => sum + set.reps * (set.weight || 0), 0);
}

export interface PersonalRecord {
	exercise: string; // id из каталога; '' если упражнение удалено
	name: string;
	weight: number;
	reps: number;
	date: string; // ISO started_at тренировки
}

// Личный рекорд — подход тяжелее всех предыдущих по этому упражнению.
// Первый в истории подход рекордом не считается: сравнивать не с чем.
export function findRecentRecords(
	logs: WorkoutLog[],
	logExercises: WorkoutLogExercise[],
	sets: WorkoutLogSet[],
	limit: number
): PersonalRecord[] {
	const logById = new Map(logs.map((log) => [log.id, log]));
	const exerciseById = new Map(logExercises.map((item) => [item.id, item]));

	const chronological = sets
		.map((set) => {
			const logExercise = exerciseById.get(set.workout_log_exercise);
			const log = logExercise && logById.get(logExercise.workout_log);
			return logExercise && log ? { set, logExercise, log } : null;
		})
		.filter((item) => item !== null)
		.filter(({ set }) => !set.is_warmup && set.weight > 0)
		.sort(
			(a, b) =>
				new Date(a.log.started_at).getTime() - new Date(b.log.started_at).getTime() ||
				a.set.created.localeCompare(b.set.created)
		);

	const maxWeight = new Map<string, number>();
	// по каждому упражнению храним только свежайший рекорд
	const latestRecord = new Map<string, PersonalRecord>();
	for (const { set, logExercise, log } of chronological) {
		const key = logExercise.exercise || logExercise.exercise_name_snapshot;
		const previous = maxWeight.get(key);
		if (previous !== undefined && set.weight > previous) {
			latestRecord.set(key, {
				exercise: logExercise.exercise,
				name: logExercise.exercise_name_snapshot,
				weight: set.weight,
				reps: set.reps,
				date: log.started_at
			});
		}
		if (previous === undefined || set.weight > previous) {
			maxWeight.set(key, set.weight);
		}
	}

	return [...latestRecord.values()]
		.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
		.slice(0, limit);
}

export interface ExerciseSeriesPoint {
	date: string; // YYYY-MM-DD
	weight: number; // max рабочий вес за день
}

export interface ExerciseSeries {
	key: string; // id упражнения; имя-snapshot, если упражнение удалено из каталога
	exercise: string;
	name: string;
	lastTrained: string; // YYYY-MM-DD
	points: ExerciseSeriesPoint[]; // по дням, отсортированы по дате
}

// Серии «вес по дням» для графика прогресса. Только подходы с весом
// и без разминки; день — из started_at тренировки. Серии отсортированы
// по свежести — первым идёт последнее тренированное упражнение.
export function buildExerciseSeries(
	logs: WorkoutLog[],
	logExercises: WorkoutLogExercise[],
	sets: WorkoutLogSet[]
): ExerciseSeries[] {
	const logDay = new Map(logs.map((log) => [log.id, dayKey(new Date(log.started_at))]));
	const exerciseById = new Map(logExercises.map((item) => [item.id, item]));

	const series = new Map<string, ExerciseSeries & { byDay: Map<string, number> }>();
	for (const set of sets) {
		if (set.is_warmup || set.weight <= 0) continue;
		const logExercise = exerciseById.get(set.workout_log_exercise);
		const day = logExercise && logDay.get(logExercise.workout_log);
		if (!logExercise || !day) continue;

		const key = logExercise.exercise || logExercise.exercise_name_snapshot;
		let entry = series.get(key);
		if (!entry) {
			entry = {
				key,
				exercise: logExercise.exercise,
				name: logExercise.exercise_name_snapshot,
				lastTrained: day,
				points: [],
				byDay: new Map()
			};
			series.set(key, entry);
		}
		entry.byDay.set(day, Math.max(entry.byDay.get(day) ?? 0, set.weight));
		if (day >= entry.lastTrained) {
			entry.lastTrained = day;
			entry.name = logExercise.exercise_name_snapshot; // самое свежее имя
		}
	}

	return [...series.values()]
		.map(({ byDay, ...entry }) => ({
			...entry,
			points: [...byDay.entries()]
				.map(([date, weight]) => ({ date, weight }))
				.sort((a, b) => a.date.localeCompare(b.date))
		}))
		.sort((a, b) => b.lastTrained.localeCompare(a.lastTrained));
}

export interface NextWorkout {
	program: UserProgram;
	workout: UserProgramWorkout;
}

// Следующая тренировка: программа с самой свежей активностью (либо первая
// без логов), в ней — тренировка после последней выполненной, по кругу.
export function pickNextWorkout(
	programs: { program: UserProgram; workouts: UserProgramWorkout[] }[],
	logs: WorkoutLog[] // отсортированы по -started_at
): NextWorkout | null {
	const candidates = programs.filter(({ workouts }) => workouts.length > 0);
	if (candidates.length === 0) return null;

	const lastLog = logs.find((log) =>
		candidates.some(({ program }) => program.id === log.user_program)
	);
	const current = lastLog
		? candidates.find(({ program }) => program.id === lastLog.user_program)!
		: candidates[0];

	const lastProgramLog = logs.find(
		(log) => log.user_program === current.program.id && log.user_program_workout
	);
	const lastIndex = lastProgramLog
		? current.workouts.findIndex((workout) => workout.id === lastProgramLog.user_program_workout)
		: -1;
	const workout = current.workouts[(lastIndex + 1) % current.workouts.length];
	return { program: current.program, workout };
}

export interface MuscleHeatmapEntry {
	group: MuscleGroup;
	sets7d: number; // рабочие подходы за последние 7 дней (включая сегодня)
	lastTrainedDay: string | null; // YYYY-MM-DD; null если никогда
	daysSinceTrained: number | null; // null если никогда
	level: 0 | 1 | 2 | 3; // 0 / 1–9 / 10–19 / 20+
}

// Карта нагрузки по группам мышц. Подходы считаем рабочие (без разминки),
// группу мышцы берём из каталога exercises по primary_muscle. Если упражнение
// удалено из каталога (нет id или нет записи) — подход не считаем: группа неизвестна.
// Возвращает все 11 групп, даже пустые — фронту нужно рисовать всю фигуру.
export function buildMuscleHeatmap(
	logs: WorkoutLog[],
	logExercises: WorkoutLogExercise[],
	sets: WorkoutLogSet[],
	exercises: Exercise[],
	today: Date
): MuscleHeatmapEntry[] {
	const muscleByExerciseId = new Map(exercises.map((item) => [item.id, item.primary_muscle]));
	const logDay = new Map(logs.map((log) => [log.id, dayKey(new Date(log.started_at))]));

	const exerciseInfo = new Map<string, { day: string; muscle: MuscleGroup }>();
	for (const item of logExercises) {
		const day = logDay.get(item.workout_log);
		if (!day) continue;
		const muscle = muscleByExerciseId.get(item.exercise);
		if (!muscle) continue;
		exerciseInfo.set(item.id, { day, muscle });
	}

	const todayKey = dayKey(today);
	const since = dayKey(addDays(today, -6));
	const sets7d = new Map<MuscleGroup, number>();
	const lastDay = new Map<MuscleGroup, string>();
	for (const set of sets) {
		if (set.is_warmup) continue;
		const info = exerciseInfo.get(set.workout_log_exercise);
		if (!info) continue;
		// логи с датой в будущем (опечатка) не должны раздувать sets7d и lastDay
		if (info.day > todayKey) continue;
		if (info.day >= since) {
			sets7d.set(info.muscle, (sets7d.get(info.muscle) ?? 0) + 1);
		}
		const previous = lastDay.get(info.muscle);
		if (!previous || info.day > previous) {
			lastDay.set(info.muscle, info.day);
		}
	}

	const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
	const dayMs = 24 * 60 * 60 * 1000;
	const groups = Object.keys(muscleGroupLabels) as MuscleGroup[];

	return groups.map<MuscleHeatmapEntry>((group) => {
		const count = sets7d.get(group) ?? 0;
		const lastTrainedDay = lastDay.get(group) ?? null;
		let daysSinceTrained: number | null = null;
		if (lastTrainedDay) {
			const [year, month, day] = lastTrainedDay.split('-').map(Number);
			const lastMidnight = new Date(year, month - 1, day).getTime();
			daysSinceTrained = Math.max(0, Math.round((todayMidnight - lastMidnight) / dayMs));
		}
		const level: 0 | 1 | 2 | 3 = count >= 20 ? 3 : count >= 10 ? 2 : count >= 1 ? 1 : 0;
		return { group, sets7d: count, lastTrainedDay, daysSinceTrained, level };
	});
}
