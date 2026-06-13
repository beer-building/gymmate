import { pb } from '$lib/shared/api';
import type { Program, ProgramWorkout, ProgramWorkoutExercise } from '$lib/shared/types';

export async function getPrograms(): Promise<Program[]> {
	return pb.collection('programs').getFullList<Program>({ sort: '-created' });
}

export async function getProgram(id: string): Promise<Program> {
	return pb.collection('programs').getOne<Program>(id);
}

export async function getProgramWorkouts(programId: string): Promise<ProgramWorkout[]> {
	return pb.collection('program_workouts').getFullList<ProgramWorkout>({
		filter: pb.filter('program = {:id}', { id: programId }),
		sort: 'order_index'
	});
}

export async function getProgramWorkout(id: string): Promise<ProgramWorkout> {
	return pb.collection('program_workouts').getOne<ProgramWorkout>(id);
}

export async function getProgramWorkoutsBatch(programIds: string[]): Promise<ProgramWorkout[]> {
	if (programIds.length === 0) return [];
	const filter = programIds.map((id, i) => `program = {:p${i}}`).join(' || ');
	const params = Object.fromEntries(programIds.map((id, i) => [`p${i}`, id]));
	return pb.collection('program_workouts').getFullList<ProgramWorkout>({
		filter: pb.filter(filter, params),
		sort: 'order_index'
	});
}

export async function getProgramWorkoutExercises(
	workoutIds: string[]
): Promise<ProgramWorkoutExercise[]> {
	if (workoutIds.length === 0) return [];
	const filter = workoutIds.map((id, i) => `program_workout = {:w${i}}`).join(' || ');
	const params = Object.fromEntries(workoutIds.map((id, i) => [`w${i}`, id]));
	return pb.collection('program_workout_exercises').getFullList<ProgramWorkoutExercise>({
		filter: pb.filter(filter, params),
		sort: 'order_index',
		expand: 'exercise'
	});
}
