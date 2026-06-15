import { pb } from '$lib/shared/api';
import type { Exercise, MuscleGroup } from '$lib/shared/types';

export async function getExercises(muscleGroup?: MuscleGroup): Promise<Exercise[]> {
	return pb.collection('exercises').getFullList<Exercise>({
		filter: muscleGroup ? pb.filter('primary_muscles ?= {:group}', { group: muscleGroup }) : '',
		sort: 'name'
	});
}

export async function getExercise(id: string): Promise<Exercise> {
	return pb.collection('exercises').getOne<Exercise>(id);
}

export async function getExerciseBySlug(slug: string): Promise<Exercise> {
	return pb
		.collection('exercises')
		.getFirstListItem<Exercise>(pb.filter('slug = {:slug}', { slug }));
}
