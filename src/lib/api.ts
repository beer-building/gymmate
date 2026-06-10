import { pb } from './pb';
import type {
	Exercise,
	MuscleGroup,
	Program,
	ProgramDay,
	ProgramExercise,
	Workout,
	WorkoutSet
} from './types';

export async function getExercises(muscleGroup?: MuscleGroup): Promise<Exercise[]> {
	return pb.collection('exercises').getFullList<Exercise>({
		filter: muscleGroup ? pb.filter('muscle_group = {:group}', { group: muscleGroup }) : '',
		sort: 'name'
	});
}

export async function getExercise(id: string): Promise<Exercise> {
	return pb.collection('exercises').getOne<Exercise>(id);
}

export async function getPrograms(): Promise<Program[]> {
	return pb.collection('programs').getFullList<Program>({ sort: 'created' });
}

export async function getProgram(id: string): Promise<Program> {
	return pb.collection('programs').getOne<Program>(id);
}

export async function getProgramDays(programId: string): Promise<ProgramDay[]> {
	return pb.collection('program_days').getFullList<ProgramDay>({
		filter: pb.filter('program = {:id}', { id: programId }),
		sort: 'day_order'
	});
}

export async function getProgramDay(id: string): Promise<ProgramDay> {
	return pb.collection('program_days').getOne<ProgramDay>(id);
}

export async function getProgramDayExercises(dayIds: string[]): Promise<ProgramExercise[]> {
	if (dayIds.length === 0) return [];
	const filter = dayIds.map((id, i) => `day = {:day${i}}`).join(' || ');
	const params = Object.fromEntries(dayIds.map((id, i) => [`day${i}`, id]));
	return pb.collection('program_exercises').getFullList<ProgramExercise>({
		filter: pb.filter(filter, params),
		sort: 'sort',
		expand: 'exercise'
	});
}

export async function getWorkouts(userId: string): Promise<Workout[]> {
	return pb.collection('workouts').getFullList<Workout>({
		filter: pb.filter('user = {:id}', { id: userId }),
		sort: '-date,-created',
		expand: 'program_day'
	});
}

export async function getWorkout(id: string): Promise<Workout> {
	return pb.collection('workouts').getOne<Workout>(id, { expand: 'program_day' });
}

export async function createWorkout(data: {
	user: string;
	date: string;
	name?: string;
	program_day?: string;
}): Promise<Workout> {
	return pb.collection('workouts').create<Workout>(data);
}

export async function updateWorkout(id: string, data: Partial<Workout>): Promise<Workout> {
	return pb.collection('workouts').update<Workout>(id, data);
}

export async function deleteWorkout(id: string): Promise<void> {
	await pb.collection('workouts').delete(id);
}

export async function getWorkoutSets(workoutId: string): Promise<WorkoutSet[]> {
	return pb.collection('workout_sets').getFullList<WorkoutSet>({
		filter: pb.filter('workout = {:id}', { id: workoutId }),
		sort: 'created',
		expand: 'exercise'
	});
}

export async function createWorkoutSet(data: {
	workout: string;
	exercise: string;
	set_number: number;
	reps: number;
	weight: number;
}): Promise<WorkoutSet> {
	return pb.collection('workout_sets').create<WorkoutSet>(data, { expand: 'exercise' });
}

export async function deleteWorkoutSet(id: string): Promise<void> {
	await pb.collection('workout_sets').delete(id);
}
