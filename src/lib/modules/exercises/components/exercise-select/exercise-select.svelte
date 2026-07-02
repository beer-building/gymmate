<script lang="ts">
	import { Select } from '$lib/shared/components/select';
	import { exerciseKindLabels, muscleGroupLabels } from '$lib/shared/helpers/labels';
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

	// силовые — optgroup по группам мышц (внутри по алфавиту); разминки и
	// растяжки — своими optgroup в конце, чтобы не смешивались с силовыми
	const groups = $derived.by(() => {
		const result: { key: string; label: string; items: Exercise[] }[] = [];
		const byName = (a: Exercise, b: Exercise) => a.name.localeCompare(b.name, 'ru');
		const strength = exercises.filter((exercise) => exercise.kind === 'strength');
		for (const muscle of Object.keys(muscleGroupLabels) as MuscleGroup[]) {
			const items = strength
				.filter((exercise) => exercise.primary_muscles.includes(muscle))
				.sort(byName);
			if (items.length > 0) result.push({ key: muscle, label: muscleGroupLabels[muscle], items });
		}
		for (const kind of ['warmup', 'stretching'] as const) {
			const items = exercises.filter((exercise) => exercise.kind === kind).sort(byName);
			if (items.length > 0) result.push({ key: kind, label: exerciseKindLabels[kind], items });
		}
		return result;
	});
</script>

<Select bind:value {...rest}>
	<option value="" disabled>{placeholder}</option>
	{#each groups as group (group.key)}
		<optgroup label={group.label}>
			{#each group.items as exercise (exercise.id)}
				<option value={exercise.id}>{exercise.name}</option>
			{/each}
		</optgroup>
	{/each}
</Select>
