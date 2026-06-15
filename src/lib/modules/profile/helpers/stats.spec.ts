import { describe, expect, it } from 'vitest';
import {
	buildExerciseSeries,
	buildHeatmap,
	buildMuscleHeatmap,
	findRecentRecords,
	pickNextWorkout,
	setsPerDay,
	volumeSince,
	weekStreak
} from './stats';
import type {
	Exercise,
	MuscleGroup,
	UserProgram,
	UserProgramWorkout,
	WorkoutLog,
	WorkoutLogExercise,
	WorkoutLogSet
} from '$lib/shared/types';

function log(id: string, startedAt: string, extra: Partial<WorkoutLog> = {}): WorkoutLog {
	return {
		id,
		user: 'u1',
		user_program: '',
		user_program_workout: '',
		name_snapshot: 'Тренировка',
		started_at: startedAt,
		completed_at: '',
		duration_seconds: 0,
		notes: '',
		created: startedAt,
		...extra
	};
}

function logExercise(
	id: string,
	workoutLog: string,
	exercise: string,
	name: string
): WorkoutLogExercise {
	return {
		id,
		workout_log: workoutLog,
		exercise,
		exercise_name_snapshot: name,
		order_index: 0,
		notes: ''
	};
}

function set(
	id: string,
	logExerciseId: string,
	weight: number,
	reps: number,
	extra: Partial<WorkoutLogSet> = {}
): WorkoutLogSet {
	return {
		id,
		workout_log_exercise: logExerciseId,
		set_index: 1,
		reps,
		weight,
		duration_seconds: 0,
		distance_meters: 0,
		rir: 0,
		rpe: 0,
		is_warmup: false,
		completed: true,
		created: '2026-06-01 10:00:00',
		...extra
	};
}

function exercise(id: string, muscle: MuscleGroup): Exercise {
	return {
		id,
		name: `Упражнение ${id}`,
		slug: id,
		primary_muscle: muscle,
		secondary_muscles: [],
		equipment: 'barbell',
		difficulty: 'intermediate',
		instructions: '',
		videos: null
	};
}

function userProgram(id: string): UserProgram {
	return {
		id,
		user: 'u1',
		source_program: '',
		name: 'Программа',
		description: '',
		difficulty: 0,
		started_at: '',
		archived_at: ''
	};
}

function programWorkout(id: string, program: string, orderIndex: number): UserProgramWorkout {
	return { id, user_program: program, name: `День ${orderIndex}`, order_index: orderIndex };
}

describe('setsPerDay', () => {
	it('считает подходы по дню тренировки и учитывает пустые тренировки', () => {
		const logs = [log('l1', '2026-06-10 09:00:00'), log('l2', '2026-06-11 09:00:00')];
		const exercises = [logExercise('e1', 'l1', 'ex1', 'Жим')];
		const sets = [set('s1', 'e1', 60, 8), set('s2', 'e1', 60, 8)];

		const perDay = setsPerDay(logs, exercises, sets);

		expect(perDay.get('2026-06-10')).toBe(2);
		// тренировка без подходов — день всё равно активен
		expect(perDay.get('2026-06-11')).toBe(0);
	});
});

describe('buildHeatmap', () => {
	it('строит сетку недель с понедельника и помечает будущие дни', () => {
		// 2026-06-12 — пятница
		const today = new Date(2026, 5, 12);
		const perDay = new Map([
			['2026-06-10', 5],
			['2026-06-01', 12]
		]);

		const grid = buildHeatmap(perDay, today, 2);

		expect(grid).toHaveLength(2);
		expect(grid[0][0].date).toBe('2026-06-01'); // понедельник прошлой недели
		expect(grid[0][0].level).toBe(2); // 12 подходов
		expect(grid[1][2].date).toBe('2026-06-10');
		expect(grid[1][2].level).toBe(1);
		expect(grid[1][4].future).toBe(false); // сегодня
		expect(grid[1][5].future).toBe(true); // суббота ещё не наступила
	});
});

describe('weekStreak', () => {
	it('считает недели подряд и не рвёт стрик на пустой текущей неделе', () => {
		const today = new Date(2026, 5, 12); // пятница
		const perDay = new Map([
			['2026-06-03', 1], // прошлая неделя
			['2026-05-27', 1] // позапрошлая
		]);

		expect(weekStreak(perDay, today)).toBe(2);

		// тренировка на этой неделе продлевает стрик
		perDay.set('2026-06-09', 1);
		expect(weekStreak(perDay, today)).toBe(3);
	});

	it('обнуляется после пропущенной недели', () => {
		const today = new Date(2026, 5, 12);
		const perDay = new Map([['2026-05-27', 1]]); // две недели назад
		expect(weekStreak(perDay, today)).toBe(0);
	});
});

describe('volumeSince', () => {
	it('суммирует тоннаж только недавних тренировок', () => {
		const logs = [log('l1', '2026-06-10 09:00:00'), log('l2', '2026-05-01 09:00:00')];
		const exercises = [
			logExercise('e1', 'l1', 'ex1', 'Жим'),
			logExercise('e2', 'l2', 'ex1', 'Жим')
		];
		const sets = [set('s1', 'e1', 60, 10), set('s2', 'e2', 100, 10)];

		expect(volumeSince(logs, exercises, sets, new Date(2026, 5, 5))).toBe(600);
	});
});

describe('findRecentRecords', () => {
	it('находит рекорд, игнорируя первый подход и разминку', () => {
		const logs = [log('l1', '2026-06-01 09:00:00'), log('l2', '2026-06-08 09:00:00')];
		const exercises = [
			logExercise('e1', 'l1', 'ex1', 'Жим лёжа'),
			logExercise('e2', 'l2', 'ex1', 'Жим лёжа')
		];
		const sets = [
			set('s1', 'e1', 60, 8, { created: '2026-06-01 10:00:00' }),
			set('s2', 'e2', 120, 1, { created: '2026-06-08 10:00:00', is_warmup: true }),
			set('s3', 'e2', 65, 6, { created: '2026-06-08 10:05:00' })
		];

		const records = findRecentRecords(logs, exercises, sets, 5);

		expect(records).toHaveLength(1);
		expect(records[0]).toMatchObject({ name: 'Жим лёжа', weight: 65, reps: 6 });
	});

	it('оставляет только свежайший рекорд по упражнению', () => {
		const logs = [
			log('l1', '2026-06-01 09:00:00'),
			log('l2', '2026-06-05 09:00:00'),
			log('l3', '2026-06-09 09:00:00')
		];
		const exercises = [
			logExercise('e1', 'l1', 'ex1', 'Присед'),
			logExercise('e2', 'l2', 'ex1', 'Присед'),
			logExercise('e3', 'l3', 'ex1', 'Присед')
		];
		const sets = [
			set('s1', 'e1', 80, 5, { created: '2026-06-01 10:00:00' }),
			set('s2', 'e2', 85, 5, { created: '2026-06-05 10:00:00' }),
			set('s3', 'e3', 90, 5, { created: '2026-06-09 10:00:00' })
		];

		const records = findRecentRecords(logs, exercises, sets, 5);

		expect(records).toHaveLength(1);
		expect(records[0].weight).toBe(90);
	});
});

describe('buildExerciseSeries', () => {
	it('берёт max вес за день, пропуская разминку и подходы без веса', () => {
		const logs = [log('l1', '2026-06-01 09:00:00'), log('l2', '2026-06-08 09:00:00')];
		const exercises = [
			logExercise('e1', 'l1', 'ex1', 'Жим лёжа'),
			logExercise('e2', 'l2', 'ex1', 'Жим лёжа')
		];
		const sets = [
			set('s1', 'e1', 60, 8),
			set('s2', 'e1', 65, 6),
			set('s3', 'e1', 100, 1, { is_warmup: true }),
			set('s4', 'e2', 0, 12),
			set('s5', 'e2', 70, 5)
		];

		const series = buildExerciseSeries(logs, exercises, sets);

		expect(series).toHaveLength(1);
		expect(series[0].points).toEqual([
			{ date: '2026-06-01', weight: 65 },
			{ date: '2026-06-08', weight: 70 }
		]);
		expect(series[0].lastTrained).toBe('2026-06-08');
	});

	it('сортирует упражнения по свежести и подставляет имя для удалённых', () => {
		const logs = [log('l1', '2026-06-01 09:00:00'), log('l2', '2026-06-08 09:00:00')];
		const exercises = [
			logExercise('e1', 'l1', 'ex1', 'Жим лёжа'),
			logExercise('e2', 'l2', '', 'Удалённое упражнение')
		];
		const sets = [set('s1', 'e1', 60, 8), set('s2', 'e2', 40, 10)];

		const series = buildExerciseSeries(logs, exercises, sets);

		expect(series.map((item) => item.name)).toEqual(['Удалённое упражнение', 'Жим лёжа']);
		expect(series[0].key).toBe('Удалённое упражнение');
	});
});

describe('pickNextWorkout', () => {
	const programA = {
		program: userProgram('p1'),
		workouts: [programWorkout('w1', 'p1', 1), programWorkout('w2', 'p1', 2)]
	};

	it('без логов берёт первую тренировку первой программы', () => {
		const next = pickNextWorkout([programA], []);
		expect(next?.workout.id).toBe('w1');
	});

	it('после выполненной тренировки даёт следующую, по кругу', () => {
		const logs = [
			log('l1', '2026-06-10 09:00:00', { user_program: 'p1', user_program_workout: 'w2' })
		];
		const next = pickNextWorkout([programA], logs);
		expect(next?.workout.id).toBe('w1'); // w2 была последней — цикл с начала
	});

	it('выбирает программу с самой свежей активностью', () => {
		const programB = {
			program: userProgram('p2'),
			workouts: [programWorkout('w3', 'p2', 1)]
		};
		const logs = [
			log('l2', '2026-06-11 09:00:00', { user_program: 'p2', user_program_workout: 'w3' }),
			log('l1', '2026-06-10 09:00:00', { user_program: 'p1', user_program_workout: 'w1' })
		];
		const next = pickNextWorkout([programA, programB], logs);
		expect(next?.program.id).toBe('p2');
	});

	it('пропускает программы без тренировок', () => {
		const empty = { program: userProgram('p0'), workouts: [] };
		const next = pickNextWorkout([empty, programA], []);
		expect(next?.workout.id).toBe('w1');
	});
});

describe('buildMuscleHeatmap', () => {
	const catalog = [
		exercise('ex-chest', 'chest'),
		exercise('ex-legs', 'legs'),
		exercise('ex-back', 'back')
	];

	function find(entries: ReturnType<typeof buildMuscleHeatmap>, group: MuscleGroup) {
		return entries.find((item) => item.group === group)!;
	}

	it('считает рабочие подходы по группе за последние 7 дней, исключая разминку', () => {
		const today = new Date(2026, 5, 13); // 2026-06-13
		const logs = [
			log('l1', '2026-06-13 10:00:00'),
			log('l2', '2026-06-10 10:00:00'),
			log('l3', '2026-06-05 10:00:00') // за пределами окна 7 дней
		];
		const exercises = [
			logExercise('le1', 'l1', 'ex-chest', 'Жим'),
			logExercise('le2', 'l2', 'ex-chest', 'Жим'),
			logExercise('le3', 'l3', 'ex-chest', 'Жим')
		];
		const sets = [
			set('s1', 'le1', 60, 8),
			set('s2', 'le1', 60, 8),
			set('s3', 'le1', 40, 12, { is_warmup: true }), // разминка не считается
			set('s4', 'le2', 60, 8),
			set('s5', 'le3', 60, 8) // вне окна
		];

		const entries = buildMuscleHeatmap(logs, exercises, sets, catalog, today);

		expect(find(entries, 'chest').sets7d).toBe(3);
		expect(find(entries, 'legs').sets7d).toBe(0);
	});

	it('возвращает все 11 групп даже без истории', () => {
		const today = new Date(2026, 5, 13);
		const entries = buildMuscleHeatmap([], [], [], catalog, today);
		expect(entries).toHaveLength(11);
		for (const entry of entries) {
			expect(entry.sets7d).toBe(0);
			expect(entry.lastTrainedDay).toBeNull();
			expect(entry.daysSinceTrained).toBeNull();
			expect(entry.level).toBe(0);
		}
	});

	it('игнорирует подходы упражнений, которых нет в каталоге', () => {
		const today = new Date(2026, 5, 13);
		const logs = [log('l1', '2026-06-13 10:00:00')];
		const exercises = [
			logExercise('le1', 'l1', 'unknown-id', 'Удалённое'),
			logExercise('le2', 'l1', '', 'Тоже удалённое')
		];
		const sets = [set('s1', 'le1', 60, 8), set('s2', 'le2', 60, 8)];

		const entries = buildMuscleHeatmap(logs, exercises, sets, catalog, today);

		for (const entry of entries) {
			expect(entry.sets7d).toBe(0);
			expect(entry.lastTrainedDay).toBeNull();
		}
	});

	it('находит последний день тренировки группы за всю историю и считает дни', () => {
		const today = new Date(2026, 5, 13); // 13 июня
		const logs = [
			log('l1', '2026-06-01 10:00:00'), // 12 дней назад
			log('l2', '2026-05-20 10:00:00') // совсем давно
		];
		const exercises = [
			logExercise('le1', 'l1', 'ex-legs', 'Присед'),
			logExercise('le2', 'l2', 'ex-legs', 'Присед')
		];
		const sets = [set('s1', 'le1', 100, 5), set('s2', 'le2', 90, 5)];

		const entries = buildMuscleHeatmap(logs, exercises, sets, catalog, today);
		const legs = find(entries, 'legs');

		expect(legs.lastTrainedDay).toBe('2026-06-01');
		expect(legs.daysSinceTrained).toBe(12);
		expect(legs.sets7d).toBe(0); // тренировки вне окна 7 дней
	});

	it('выставляет уровни: 0 / 1–9 / 10–19 / 20+', () => {
		const today = new Date(2026, 5, 13);
		const logs = [log('l1', '2026-06-13 10:00:00')];
		const exercises = [
			logExercise('le-chest', 'l1', 'ex-chest', 'Жим'),
			logExercise('le-legs', 'l1', 'ex-legs', 'Присед'),
			logExercise('le-back', 'l1', 'ex-back', 'Тяга')
		];
		const sets: WorkoutLogSet[] = [];
		// 5 подходов на грудь → level 1
		for (let i = 0; i < 5; i++) sets.push(set(`c${i}`, 'le-chest', 60, 8));
		// 15 подходов на ноги → level 2
		for (let i = 0; i < 15; i++) sets.push(set(`l${i}`, 'le-legs', 100, 5));
		// 22 подхода на спину → level 3
		for (let i = 0; i < 22; i++) sets.push(set(`b${i}`, 'le-back', 80, 6));

		const entries = buildMuscleHeatmap(logs, exercises, sets, catalog, today);

		expect(find(entries, 'chest').level).toBe(1);
		expect(find(entries, 'legs').level).toBe(2);
		expect(find(entries, 'back').level).toBe(3);
		expect(find(entries, 'shoulders').level).toBe(0);
	});

	it('игнорирует логи с датой в будущем (опечатка в started_at)', () => {
		const today = new Date(2026, 5, 13);
		const logs = [
			log('l-now', '2026-06-13 10:00:00'),
			log('l-future', '2027-06-13 10:00:00') // на год вперёд — опечатка
		];
		const exercises = [
			logExercise('le-now', 'l-now', 'ex-chest', 'Жим'),
			logExercise('le-future', 'l-future', 'ex-legs', 'Присед')
		];
		const sets = [set('s1', 'le-now', 60, 8), set('s2', 'le-future', 100, 5)];

		const entries = buildMuscleHeatmap(logs, exercises, sets, catalog, today);

		expect(find(entries, 'chest').sets7d).toBe(1);
		expect(find(entries, 'legs').sets7d).toBe(0);
		expect(find(entries, 'legs').lastTrainedDay).toBeNull();
		expect(find(entries, 'legs').daysSinceTrained).toBeNull();
	});

	it('окно 7 дней включает сегодня и 6 предыдущих календарных дней', () => {
		const today = new Date(2026, 5, 13); // понедельник? — неважно, главное dayKey
		const logs = [
			log('l-old', '2026-06-06 23:30:00'), // 7 дней назад — ВНЕ окна
			log('l-edge', '2026-06-07 00:30:00'), // 6 дней назад — В окне
			log('l-today', '2026-06-13 10:00:00')
		];
		const exercises = [
			logExercise('le1', 'l-old', 'ex-chest', 'Жим'),
			logExercise('le2', 'l-edge', 'ex-chest', 'Жим'),
			logExercise('le3', 'l-today', 'ex-chest', 'Жим')
		];
		const sets = [set('s1', 'le1', 60, 8), set('s2', 'le2', 60, 8), set('s3', 'le3', 60, 8)];

		const entries = buildMuscleHeatmap(logs, exercises, sets, catalog, today);
		expect(find(entries, 'chest').sets7d).toBe(2);
	});
});
