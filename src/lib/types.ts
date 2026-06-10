export type MuscleGroup =
	| 'chest'
	| 'back'
	| 'legs'
	| 'glutes'
	| 'calves'
	| 'shoulders'
	| 'biceps'
	| 'triceps'
	| 'abs';

export type Equipment = 'barbell' | 'dumbbell' | 'machine' | 'cable' | 'bodyweight' | 'kettlebell';

export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export type Goal = 'mass' | 'weight_loss' | 'relief' | 'strength';

export interface Exercise {
	id: string;
	name: string;
	muscle_group: MuscleGroup;
	equipment: Equipment;
	difficulty: Difficulty;
	description: string;
	technique: string;
}

export interface Program {
	id: string;
	name: string;
	goal: Goal;
	level: Difficulty;
	days_per_week: number;
	description: string;
}

export interface ProgramDay {
	id: string;
	program: string;
	name: string;
	day_order: number;
}

export interface ProgramExercise {
	id: string;
	day: string;
	exercise: string;
	sets: number;
	reps: string;
	rest_seconds: number;
	sort: number;
	expand?: { exercise: Exercise };
}

export interface Workout {
	id: string;
	user: string;
	date: string;
	name: string;
	program_day: string;
	notes: string;
	duration_minutes: number;
	expand?: { program_day: ProgramDay };
}

export interface WorkoutSet {
	id: string;
	workout: string;
	exercise: string;
	set_number: number;
	reps: number;
	weight: number;
	expand?: { exercise: Exercise };
}
