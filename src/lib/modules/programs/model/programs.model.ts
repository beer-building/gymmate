import { createEffect, createEvent, createStore, sample } from 'effector';
import * as api from '../api';
import type { Program, ProgramWorkout, ProgramWorkoutExercise } from '$lib/shared/types';

// --- список программ ---

export const programsPageOpened = createEvent();

export const loadProgramsFx = createEffect(async () => {
	const programs = await api.getPrograms();
	const workouts = await api.getProgramWorkoutsBatch(programs.map((program) => program.id));
	const workoutCounts: Record<string, number> = {};
	for (const workout of workouts) {
		workoutCounts[workout.program] = (workoutCounts[workout.program] ?? 0) + 1;
	}
	return { programs, workoutCounts };
});

export const programs = createStore<Program[]>([]).on(
	loadProgramsFx.doneData,
	(_, { programs }) => programs
);

export const programWorkoutCounts = createStore<Record<string, number>>({}).on(
	loadProgramsFx.doneData,
	(_, { workoutCounts }) => workoutCounts
);

export const programsLoading = loadProgramsFx.pending;
export const programsError = createStore(false)
	.on(loadProgramsFx.fail, () => true)
	.reset(loadProgramsFx.done);

sample({ clock: programsPageOpened, target: loadProgramsFx });

// --- деталка программы: тренировки и упражнения ---

export interface ProgramDetails {
	program: Program;
	workouts: ProgramWorkout[];
	exercisesByWorkout: Record<string, ProgramWorkoutExercise[]>;
}

export const programPageOpened = createEvent<string>();

export const loadProgramFx = createEffect(async (programId: string): Promise<ProgramDetails> => {
	const [program, workouts] = await Promise.all([
		api.getProgram(programId),
		api.getProgramWorkouts(programId)
	]);
	const exercises = await api.getProgramWorkoutExercises(workouts.map((workout) => workout.id));
	const exercisesByWorkout: Record<string, ProgramWorkoutExercise[]> = {};
	for (const item of exercises) {
		(exercisesByWorkout[item.program_workout] ??= []).push(item);
	}
	return { program, workouts, exercisesByWorkout };
});

export const programDetails = createStore<ProgramDetails | null>(null)
	.on(loadProgramFx.doneData, (_, details) => details)
	.reset(programPageOpened);

export const programLoading = loadProgramFx.pending;
export const programError = createStore(false)
	.on(loadProgramFx.fail, () => true)
	.reset(programPageOpened);

sample({ clock: programPageOpened, target: loadProgramFx });
