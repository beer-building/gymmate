import type {
	UserProgram,
	UserProgramWorkout,
	UserProgramWorkoutExercise
} from '$lib/shared/types';

// Обмен программами через JSON-файл. Упражнения переносятся по slug
// (стабилен между инстансами, в отличие от id); name — только подпись
// для сообщения о пропущенных. Порядок задаётся порядком в массивах.

export const PROGRAM_FILE_FORMAT = 'gymmate-program';
export const PROGRAM_FILE_VERSION = 1;

export interface ProgramFileExercise {
	slug: string;
	name: string;
	target_sets: number;
	target_reps_min: number;
	target_reps_max: number;
	target_weight: number;
	rest_seconds: number;
	notes: string;
}

export interface ProgramFileWorkout {
	name: string;
	exercises: ProgramFileExercise[];
}

export interface ProgramFile {
	format: typeof PROGRAM_FILE_FORMAT;
	version: number;
	name: string;
	description: string;
	difficulty: number; // 1..5, 0 = не указана
	workouts: ProgramFileWorkout[];
}

export function serializeProgram(
	program: UserProgram,
	workouts: UserProgramWorkout[],
	exercises: UserProgramWorkoutExercise[]
): ProgramFile {
	return {
		format: PROGRAM_FILE_FORMAT,
		version: PROGRAM_FILE_VERSION,
		name: program.name,
		description: program.description,
		difficulty: program.difficulty || 0,
		workouts: [...workouts]
			.sort((a, b) => a.order_index - b.order_index)
			.map((workout) => ({
				name: workout.name,
				exercises: exercises
					.filter((item) => item.user_program_workout === workout.id && item.expand?.exercise)
					.sort((a, b) => a.order_index - b.order_index)
					.map((item) => ({
						slug: item.expand!.exercise.slug,
						name: item.expand!.exercise.name,
						target_sets: item.target_sets,
						target_reps_min: item.target_reps_min,
						target_reps_max: item.target_reps_max,
						target_weight: item.target_weight,
						rest_seconds: item.rest_seconds,
						notes: item.notes
					}))
			}))
	};
}

function asNonNegativeNumber(value: unknown): number {
	const num = typeof value === 'number' ? value : Number(value);
	return Number.isFinite(num) && num > 0 ? num : 0;
}

function asText(value: unknown): string {
	return typeof value === 'string' ? value.trim() : '';
}

function asDifficulty(value: unknown): number {
	const num = typeof value === 'number' ? value : Number(value);
	return Number.isInteger(num) && num >= 1 && num <= 5 ? num : 0;
}

export function parseProgramFile(text: string): ProgramFile {
	let raw: unknown;
	try {
		raw = JSON.parse(text);
	} catch {
		throw new Error('Файл повреждён: это не корректный JSON.');
	}
	if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
		throw new Error('Это не файл программы GymMate.');
	}
	const data = raw as Record<string, unknown>;
	if (data.format !== PROGRAM_FILE_FORMAT) {
		throw new Error('Это не файл программы GymMate.');
	}
	if (data.version !== PROGRAM_FILE_VERSION) {
		throw new Error('Файл создан в более новой версии приложения — обнови GymMate.');
	}
	const name = asText(data.name);
	if (!name) throw new Error('В файле нет названия программы.');
	if (!Array.isArray(data.workouts)) throw new Error('В файле нет списка тренировок.');

	return {
		format: PROGRAM_FILE_FORMAT,
		version: PROGRAM_FILE_VERSION,
		name,
		description: asText(data.description),
		difficulty: asDifficulty(data.difficulty),
		workouts: data.workouts.map((workout, index) => {
			if (typeof workout !== 'object' || workout === null) {
				throw new Error(`Тренировка ${index + 1} в файле задана неверно.`);
			}
			const item = workout as Record<string, unknown>;
			const exercises = Array.isArray(item.exercises) ? item.exercises : [];
			return {
				name: asText(item.name) || `Тренировка ${index + 1}`,
				exercises: exercises.map((exercise, exerciseIndex) => {
					if (typeof exercise !== 'object' || exercise === null) {
						throw new Error(
							`Упражнение ${exerciseIndex + 1} в тренировке ${index + 1} задано неверно.`
						);
					}
					const fields = exercise as Record<string, unknown>;
					const slug = asText(fields.slug);
					if (!slug) {
						throw new Error(
							`У упражнения ${exerciseIndex + 1} в тренировке ${index + 1} нет slug.`
						);
					}
					return {
						slug,
						name: asText(fields.name) || slug,
						target_sets: asNonNegativeNumber(fields.target_sets),
						target_reps_min: asNonNegativeNumber(fields.target_reps_min),
						target_reps_max: asNonNegativeNumber(fields.target_reps_max),
						target_weight: asNonNegativeNumber(fields.target_weight),
						rest_seconds: asNonNegativeNumber(fields.rest_seconds),
						notes: asText(fields.notes)
					};
				})
			};
		})
	};
}

export function downloadProgramFile(file: ProgramFile): void {
	const blob = new Blob([JSON.stringify(file, null, '\t')], { type: 'application/json' });
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = `${file.name.replace(/[\\/:*?"<>|]/g, '').trim() || 'program'}.json`;
	link.click();
	URL.revokeObjectURL(url);
}
