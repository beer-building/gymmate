import { createEffect, createEvent, createStore, sample } from 'effector';
import * as api from '$lib/api';
import type { Program, ProgramDay, ProgramExercise } from '$lib/types';

// --- список программ ---

export const programsPageOpened = createEvent();

export const loadProgramsFx = createEffect(() => api.getPrograms());

export const programs = createStore<Program[]>([]).on(loadProgramsFx.doneData, (_, items) => items);

export const programsLoading = loadProgramsFx.pending;
export const programsError = createStore(false)
	.on(loadProgramsFx.fail, () => true)
	.reset(loadProgramsFx.done);

sample({ clock: programsPageOpened, target: loadProgramsFx });

// --- деталка программы: дни и упражнения ---

export interface ProgramDetails {
	program: Program;
	days: ProgramDay[];
	exercisesByDay: Record<string, ProgramExercise[]>;
}

export const programPageOpened = createEvent<string>();

export const loadProgramFx = createEffect(async (programId: string): Promise<ProgramDetails> => {
	const [program, days] = await Promise.all([
		api.getProgram(programId),
		api.getProgramDays(programId)
	]);
	const exercises = await api.getProgramDayExercises(days.map((day) => day.id));
	const exercisesByDay: Record<string, ProgramExercise[]> = {};
	for (const item of exercises) {
		(exercisesByDay[item.day] ??= []).push(item);
	}
	return { program, days, exercisesByDay };
});

export const programDetails = createStore<ProgramDetails | null>(null)
	.on(loadProgramFx.doneData, (_, details) => details)
	.reset(programPageOpened);

export const programLoading = loadProgramFx.pending;
export const programError = createStore(false)
	.on(loadProgramFx.fail, () => true)
	.reset(programPageOpened);

sample({ clock: programPageOpened, target: loadProgramFx });
