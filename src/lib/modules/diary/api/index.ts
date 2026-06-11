import { noCancel, pb, serialize } from '$lib/shared/api';
import type {
	UserProgram,
	UserProgramWorkout,
	UserProgramWorkoutExercise,
	WorkoutLog,
	WorkoutLogExercise,
	WorkoutLogSet
} from '$lib/shared/types';

// --- программы пользователя (fork) ---

export async function getUserPrograms(userId: string): Promise<UserProgram[]> {
	return pb.collection('user_programs').getFullList<UserProgram>({
		filter: pb.filter('user = {:id}', { id: userId }),
		sort: '-created'
	});
}

export async function getUserProgram(id: string): Promise<UserProgram> {
	return pb.collection('user_programs').getOne<UserProgram>(id);
}

export async function createUserProgram(data: {
	user: string;
	name: string;
	source_program?: string;
	description?: string;
	difficulty?: number;
	started_at?: string;
}): Promise<UserProgram> {
	return pb.collection('user_programs').create<UserProgram>(data, noCancel);
}

export async function updateUserProgram(
	id: string,
	data: Partial<UserProgram>
): Promise<UserProgram> {
	return serialize(() => pb.collection('user_programs').update<UserProgram>(id, data, noCancel));
}

export async function deleteUserProgram(id: string): Promise<void> {
	await pb.collection('user_programs').delete(id, noCancel);
}

export async function getUserProgramWorkouts(userProgramId: string): Promise<UserProgramWorkout[]> {
	return pb.collection('user_program_workouts').getFullList<UserProgramWorkout>({
		filter: pb.filter('user_program = {:id}', { id: userProgramId }),
		sort: 'order_index'
	});
}

// один запрос на несколько программ: параллельные getFullList к одной коллекции
// PocketBase SDK автоотменяет, поэтому батчим через OR-фильтр
export async function getUserProgramWorkoutsBatch(
	userProgramIds: string[]
): Promise<UserProgramWorkout[]> {
	if (userProgramIds.length === 0) return [];
	const filter = userProgramIds.map((id, i) => `user_program = {:p${i}}`).join(' || ');
	const params = Object.fromEntries(userProgramIds.map((id, i) => [`p${i}`, id]));
	return pb.collection('user_program_workouts').getFullList<UserProgramWorkout>({
		filter: pb.filter(filter, params),
		sort: 'order_index'
	});
}

export async function createUserProgramWorkout(
	data: Omit<UserProgramWorkout, 'id'>
): Promise<UserProgramWorkout> {
	return pb.collection('user_program_workouts').create<UserProgramWorkout>(data, noCancel);
}

export async function updateUserProgramWorkout(
	id: string,
	data: Partial<UserProgramWorkout>
): Promise<UserProgramWorkout> {
	return serialize(() =>
		pb.collection('user_program_workouts').update<UserProgramWorkout>(id, data, noCancel)
	);
}

export async function deleteUserProgramWorkout(id: string): Promise<void> {
	await pb.collection('user_program_workouts').delete(id, noCancel);
}

export async function getUserProgramWorkoutExercises(
	workoutIds: string[]
): Promise<UserProgramWorkoutExercise[]> {
	if (workoutIds.length === 0) return [];
	const filter = workoutIds.map((id, i) => `user_program_workout = {:w${i}}`).join(' || ');
	const params = Object.fromEntries(workoutIds.map((id, i) => [`w${i}`, id]));
	return pb.collection('user_program_workout_exercises').getFullList<UserProgramWorkoutExercise>({
		filter: pb.filter(filter, params),
		sort: 'order_index',
		expand: 'exercise'
	});
}

export async function createUserProgramWorkoutExercise(
	data: Omit<UserProgramWorkoutExercise, 'id' | 'expand'>
): Promise<UserProgramWorkoutExercise> {
	return pb
		.collection('user_program_workout_exercises')
		.create<UserProgramWorkoutExercise>(data, { expand: 'exercise', requestKey: null });
}

export async function updateUserProgramWorkoutExercise(
	id: string,
	data: Partial<UserProgramWorkoutExercise>
): Promise<UserProgramWorkoutExercise> {
	return serialize(() =>
		pb
			.collection('user_program_workout_exercises')
			.update<UserProgramWorkoutExercise>(id, data, { expand: 'exercise', requestKey: null })
	);
}

export async function deleteUserProgramWorkoutExercise(id: string): Promise<void> {
	await pb.collection('user_program_workout_exercises').delete(id, noCancel);
}

// --- история выполнения ---

export async function getWorkoutLogs(userId: string): Promise<WorkoutLog[]> {
	return pb.collection('workout_logs').getFullList<WorkoutLog>({
		filter: pb.filter('user = {:id}', { id: userId }),
		sort: '-started_at'
	});
}

export async function getWorkoutLog(id: string): Promise<WorkoutLog> {
	return pb.collection('workout_logs').getOne<WorkoutLog>(id);
}

export async function createWorkoutLog(data: {
	user: string;
	name_snapshot: string;
	started_at: string;
	user_program?: string;
	user_program_workout?: string;
	notes?: string;
}): Promise<WorkoutLog> {
	return pb.collection('workout_logs').create<WorkoutLog>(data, noCancel);
}

export async function updateWorkoutLog(id: string, data: Partial<WorkoutLog>): Promise<WorkoutLog> {
	return serialize(() => pb.collection('workout_logs').update<WorkoutLog>(id, data, noCancel));
}

export async function deleteWorkoutLog(id: string): Promise<void> {
	await pb.collection('workout_logs').delete(id, noCancel);
}

export async function getWorkoutLogExercises(workoutLogId: string): Promise<WorkoutLogExercise[]> {
	return pb.collection('workout_log_exercises').getFullList<WorkoutLogExercise>({
		filter: pb.filter('workout_log = {:id}', { id: workoutLogId }),
		sort: 'order_index',
		expand: 'exercise'
	});
}

export async function createWorkoutLogExercise(data: {
	workout_log: string;
	exercise: string;
	exercise_name_snapshot: string;
	order_index: number;
	notes?: string;
}): Promise<WorkoutLogExercise> {
	return pb
		.collection('workout_log_exercises')
		.create<WorkoutLogExercise>(data, { expand: 'exercise', requestKey: null });
}

export async function deleteWorkoutLogExercise(id: string): Promise<void> {
	await pb.collection('workout_log_exercises').delete(id, noCancel);
}

// все подходы тренировки одним запросом (фильтр через вложенную relation)
export async function getWorkoutLogSets(workoutLogId: string): Promise<WorkoutLogSet[]> {
	return pb.collection('workout_log_sets').getFullList<WorkoutLogSet>({
		filter: pb.filter('workout_log_exercise.workout_log = {:id}', { id: workoutLogId }),
		sort: 'created'
	});
}

export async function createWorkoutLogSet(data: {
	workout_log_exercise: string;
	set_index: number;
	reps?: number;
	weight?: number;
	duration_seconds?: number;
	distance_meters?: number;
	rir?: number;
	rpe?: number;
	is_warmup?: boolean;
	completed?: boolean;
}): Promise<WorkoutLogSet> {
	return pb.collection('workout_log_sets').create<WorkoutLogSet>(data, noCancel);
}

export async function updateWorkoutLogSet(
	id: string,
	data: Partial<WorkoutLogSet>
): Promise<WorkoutLogSet> {
	return serialize(() =>
		pb.collection('workout_log_sets').update<WorkoutLogSet>(id, data, noCancel)
	);
}

export async function deleteWorkoutLogSet(id: string): Promise<void> {
	await pb.collection('workout_log_sets').delete(id, noCancel);
}
