import { describe, expect, it } from 'vitest';
import { parseProgramFile, serializeProgram } from './program-transfer';
import type {
	Exercise,
	UserProgram,
	UserProgramWorkout,
	UserProgramWorkoutExercise
} from '$lib/shared/types';

const program: UserProgram = {
	id: 'p1',
	user: 'u1',
	source_program: '',
	name: 'Фулбоди',
	description: 'Три раза в неделю',
	started_at: '',
	archived_at: ''
};

const workouts: UserProgramWorkout[] = [
	{ id: 'w2', user_program: 'p1', name: 'День Б', order_index: 2 },
	{ id: 'w1', user_program: 'p1', name: 'День А', order_index: 1 }
];

function exercise(slug: string, name: string): Exercise {
	return {
		id: `id-${slug}`,
		name,
		slug,
		primary_muscle: 'chest',
		equipment: 'barbell',
		difficulty: 'beginner',
		instructions: '',
		videos: null
	};
}

const exercises: UserProgramWorkoutExercise[] = [
	{
		id: 'e2',
		user_program_workout: 'w1',
		exercise: 'id-prised',
		order_index: 1,
		target_sets: 5,
		target_reps_min: 5,
		target_reps_max: 5,
		target_weight: 100,
		rest_seconds: 180,
		notes: '',
		expand: { exercise: exercise('prised', 'Приседания') }
	},
	{
		id: 'e1',
		user_program_workout: 'w1',
		exercise: 'id-zhim-lezha',
		order_index: 0,
		target_sets: 3,
		target_reps_min: 8,
		target_reps_max: 12,
		target_weight: 60,
		rest_seconds: 90,
		notes: 'пауза внизу',
		expand: { exercise: exercise('zhim-lezha', 'Жим лёжа') }
	}
];

describe('program-transfer', () => {
	it('сериализует программу: сортировка по order_index, упражнения по slug', () => {
		const file = serializeProgram(program, workouts, exercises);
		expect(file.format).toBe('gymmate-program');
		expect(file.name).toBe('Фулбоди');
		expect(file.workouts.map((workout) => workout.name)).toEqual(['День А', 'День Б']);
		expect(file.workouts[0].exercises.map((item) => item.slug)).toEqual(['zhim-lezha', 'prised']);
		expect(file.workouts[0].exercises[0]).toMatchObject({
			name: 'Жим лёжа',
			target_sets: 3,
			notes: 'пауза внизу'
		});
		expect(file.workouts[1].exercises).toEqual([]);
	});

	it('сериализация и парсинг дают одинаковый результат (roundtrip)', () => {
		const file = serializeProgram(program, workouts, exercises);
		expect(parseProgramFile(JSON.stringify(file))).toEqual(file);
	});

	it('отклоняет не-JSON и чужие файлы', () => {
		expect(() => parseProgramFile('не json')).toThrow('не корректный JSON');
		expect(() => parseProgramFile('{"foo": 1}')).toThrow('не файл программы GymMate');
		expect(() => parseProgramFile('[1, 2]')).toThrow('не файл программы GymMate');
	});

	it('отклоняет файл более новой версии', () => {
		const file = { ...serializeProgram(program, workouts, exercises), version: 99 };
		expect(() => parseProgramFile(JSON.stringify(file))).toThrow('более новой версии');
	});

	it('требует название и список тренировок', () => {
		expect(() =>
			parseProgramFile(JSON.stringify({ format: 'gymmate-program', version: 1, name: ' ' }))
		).toThrow('нет названия');
		expect(() =>
			parseProgramFile(JSON.stringify({ format: 'gymmate-program', version: 1, name: 'X' }))
		).toThrow('нет списка тренировок');
	});

	it('нормализует кривые значения: числа, имена', () => {
		const parsed = parseProgramFile(
			JSON.stringify({
				format: 'gymmate-program',
				version: 1,
				name: 'X',
				workouts: [
					{
						exercises: [
							{ slug: 'prised', target_sets: -2, target_weight: '60', rest_seconds: 'долго' }
						]
					}
				]
			})
		);
		expect(parsed.workouts[0].name).toBe('Тренировка 1');
		expect(parsed.workouts[0].exercises[0]).toEqual({
			slug: 'prised',
			name: 'prised',
			target_sets: 0,
			target_reps_min: 0,
			target_reps_max: 0,
			target_weight: 60,
			rest_seconds: 0,
			notes: ''
		});
	});

	it('требует slug у каждого упражнения', () => {
		expect(() =>
			parseProgramFile(
				JSON.stringify({
					format: 'gymmate-program',
					version: 1,
					name: 'X',
					workouts: [{ name: 'A', exercises: [{ name: 'Жим' }] }]
				})
			)
		).toThrow('нет slug');
	});
});
