<script lang="ts">
	import { Select } from '$lib/shared/components/select';
	import { muscleGroupLabels } from '$lib/shared/helpers/labels';
	import type { Exercise, MuscleGroup } from '$lib/shared/types';

	type Props = {
		exercises: Exercise[];
		value: string;
		placeholder?: string;
		size?: 'sm' | 'md' | 'lg';
		id?: string;
		required?: boolean;
	};

	let {
		exercises,
		value = $bindable(),
		placeholder = 'Выбери упражнение',
		...rest
	}: Props = $props();

	// optgroup по группам мышц, внутри — по алфавиту
	const groups = $derived.by(() => {
		const result: { muscle: MuscleGroup; label: string; items: Exercise[] }[] = [];
		for (const muscle of Object.keys(muscleGroupLabels) as MuscleGroup[]) {
			const items = exercises
				.filter((exercise) => exercise.primary_muscle === muscle)
				.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
			if (items.length > 0) result.push({ muscle, label: muscleGroupLabels[muscle], items });
		}
		return result;
	});
</script>

<Select bind:value {...rest}>
	<option value="" disabled>{placeholder}</option>
	{#each groups as group (group.muscle)}
		<optgroup label={group.label}>
			{#each group.items as exercise (exercise.id)}
				<option value={exercise.id}>{exercise.name}</option>
			{/each}
		</optgroup>
	{/each}
</Select>
