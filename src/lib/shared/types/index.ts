export type Gender = 'male' | 'female';

export type MuscleGroup =
	| 'chest'
	| 'back'
	| 'legs'
	| 'glutes'
	| 'calves'
	| 'shoulders'
	| 'biceps'
	| 'triceps'
	| 'forearms'
	| 'abs'
	| 'neck';

export type Equipment =
	| 'barbell'
	| 'dumbbell'
	| 'machine'
	| 'cable'
	| 'bodyweight'
	| 'kettlebell'
	| 'band';

export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export type Goal = 'mass' | 'weight_loss' | 'relief' | 'strength';

// У необязательных number-полей PocketBase 0 означает «не задано»
// (target_reps_min/max, target_weight, rest_seconds, rir, rpe и т.п.).

export interface Exercise {
	id: string;
	name: string;
	slug: string;
	primary_muscle: MuscleGroup;
	equipment: Equipment;
	difficulty: Difficulty;
	instructions: string;
	videos: string[] | null;
}

// --- шаблоны программ ---

export interface Program {
	id: string;
	creator: string; // '' = системная программа
	name: string;
	description: string;
	goal: Goal | '';
	is_public: boolean;
}

export interface ProgramWorkout {
	id: string;
	program: string;
	name: string;
	description: string;
	order_index: number;
}

export interface ProgramWorkoutExercise {
	id: string;
	program_workout: string;
	exercise: string;
	order_index: number;
	target_sets: number;
	target_reps_min: number;
	target_reps_max: number;
	target_weight: number;
	rest_seconds: number;
	notes: string;
	expand?: { exercise: Exercise };
}

// --- программы пользователя (независимый fork шаблона) ---

export interface UserProgram {
	id: string;
	user: string;
	source_program: string; // '' = создана с нуля
	name: string;
	description: string;
	started_at: string;
	archived_at: string;
}

export interface UserProgramWorkout {
	id: string;
	user_program: string;
	name: string;
	order_index: number;
}

export interface UserProgramWorkoutExercise {
	id: string;
	user_program_workout: string;
	exercise: string;
	order_index: number;
	target_sets: number;
	target_reps_min: number;
	target_reps_max: number;
	target_weight: number;
	rest_seconds: number;
	notes: string;
	expand?: { exercise: Exercise };
}

// --- история выполнения (snapshot-поля переживают изменения каталога/программ) ---

export interface WorkoutLog {
	id: string;
	user: string;
	user_program: string;
	user_program_workout: string;
	name_snapshot: string;
	started_at: string;
	completed_at: string; // '' = тренировка идёт сейчас
	duration_seconds: number;
	notes: string;
	created: string;
}

export interface WorkoutLogExercise {
	id: string;
	workout_log: string;
	exercise: string; // может быть '' — упражнение удалено из каталога
	exercise_name_snapshot: string;
	order_index: number;
	notes: string;
	expand?: { exercise?: Exercise };
}

export interface WorkoutLogSet {
	id: string;
	workout_log_exercise: string;
	set_index: number;
	reps: number;
	weight: number;
	duration_seconds: number;
	distance_meters: number;
	rir: number;
	rpe: number;
	is_warmup: boolean;
	completed: boolean;
	created: string;
}
