<script lang="ts">
	import {
		exercises,
		exercisesError,
		exercisesLoading,
		exercisesPageOpened,
		muscleGroup,
		muscleGroupSelected
	} from '$lib/models/exercises';
	import { muscleGroupLabels, equipmentLabels, difficultyLabels } from '$lib/labels';
	import type { MuscleGroup } from '$lib/types';

	const groups = Object.entries(muscleGroupLabels) as [MuscleGroup, string][];

	$effect(() => {
		exercisesPageOpened();
	});
</script>

<div class="container">
	<header class="rise">
		<p class="eyebrow">// справочник</p>
		<h1>УПРАЖНЕНИЯ</h1>
	</header>

	<div class="filters rise" style="animation-delay: 0.06s">
		<button
			class="chip"
			class:active={$muscleGroup === null}
			onclick={() => muscleGroupSelected(null)}
		>
			Все
		</button>
		{#each groups as [value, label] (value)}
			<button
				class="chip"
				class:active={$muscleGroup === value}
				onclick={() => muscleGroupSelected(value)}
			>
				{label}
			</button>
		{/each}
	</div>

	{#if $exercisesError}
		<p class="error-text">Не удалось загрузить упражнения. Проверь, что бэкенд запущен.</p>
	{:else if $exercisesLoading && $exercises.length === 0}
		<p class="muted">Загружаю…</p>
	{:else}
		<div class="grid">
			{#each $exercises as exercise, i (exercise.id)}
				<a
					href="/exercises/{exercise.id}"
					class="plate card rise"
					style="animation-delay: {Math.min(i * 0.04, 0.4)}s"
				>
					<span class="group mono">{muscleGroupLabels[exercise.muscle_group]}</span>
					<h2>{exercise.name}</h2>
					<p class="muted">{exercise.description}</p>
					<div class="meta mono">
						<span>{equipmentLabels[exercise.equipment]}</span>
						<span class="dot">·</span>
						<span>{difficultyLabels[exercise.difficulty]}</span>
					</div>
				</a>
			{:else}
				<p class="muted">Ничего не нашлось.</p>
			{/each}
		</div>
	{/if}
</div>

<style>
	header {
		margin-bottom: 28px;
	}

	h1 {
		font-size: clamp(34px, 5vw, 56px);
		margin-top: 12px;
	}

	.filters {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-bottom: 32px;
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 14px;
	}

	.card {
		padding: 22px;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.card h2 {
		font-size: 16px;
		line-height: 1.25;
	}

	.card p {
		font-size: 13.5px;
		margin: 0;
		flex: 1;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.group {
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.15em;
		color: var(--volt);
	}

	.meta {
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--muted);
		display: flex;
		gap: 8px;
	}

	.dot {
		color: var(--line-strong);
	}
</style>
