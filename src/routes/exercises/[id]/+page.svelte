<script lang="ts">
	import { page } from '$app/state';
	import {
		currentExercise,
		exerciseError,
		exercisePageOpened
	} from '$lib/models/exercises';
	import { muscleGroupLabels, equipmentLabels, difficultyLabels } from '$lib/labels';

	$effect(() => {
		exercisePageOpened(page.params.id!);
	});
</script>

<div class="container narrow">
	{#if $exerciseError}
		<p class="error-text">Упражнение не найдено.</p>
	{:else if !$currentExercise}
		<p class="muted">Загружаю…</p>
	{:else}
		{@const item = $currentExercise}
		<a href="/exercises" class="back mono">← Все упражнения</a>

		<header class="rise">
			<p class="eyebrow">// {muscleGroupLabels[item.muscle_group]}</p>
			<h1>{item.name}</h1>
			<div class="chips">
				<span class="chip static">{equipmentLabels[item.equipment]}</span>
				<span class="chip static">{difficultyLabels[item.difficulty]}</span>
			</div>
		</header>

		<section class="plate block rise" style="animation-delay: 0.08s">
			<h2 class="mono">Что это</h2>
			<p>{item.description}</p>
		</section>

		<section class="plate block volt rise" style="animation-delay: 0.14s">
			<h2 class="mono">Техника выполнения</h2>
			<p>{item.technique}</p>
		</section>
	{/if}
</div>

<style>
	.narrow {
		max-width: 720px;
	}

	.back {
		font-size: 12px;
		color: var(--muted);
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}

	.back:hover {
		color: var(--volt);
	}

	header {
		margin-block: 20px 28px;
	}

	h1 {
		font-size: clamp(28px, 4.5vw, 44px);
		margin-block: 12px 18px;
	}

	.chips {
		display: flex;
		gap: 8px;
	}

	.chip.static {
		cursor: default;
		color: var(--ink);
	}

	.block {
		padding: 24px;
		margin-bottom: 14px;
	}

	.block h2 {
		font-family: var(--font-mono);
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.2em;
		color: var(--muted);
		margin-bottom: 12px;
	}

	.block p {
		margin: 0;
		font-size: 15px;
	}

	.block.volt {
		border-left: 3px solid var(--volt);
	}

	.block.volt h2 {
		color: var(--volt);
	}
</style>
