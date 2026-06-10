<script lang="ts">
	import {
		exercisesError,
		exercisesLoading,
		exercisesPageOpened,
		filteredExercises,
		muscleGroup,
		muscleGroupSelected,
		searchChanged,
		searchQuery
	} from '$lib/models/exercises';
	import { muscleGroupLabels, equipmentLabels, difficultyLabels } from '$lib/labels';
	import { user, genderSelected } from '$lib/models/auth';
	import MuscleMap from '$lib/components/MuscleMap.svelte';
	import type { Gender, MuscleGroup } from '$lib/types';

	let tab = $state<'map' | 'search'>('map');

	const groups = Object.entries(muscleGroupLabels) as [MuscleGroup, string][];
	const gender = $derived(($user?.gender as Gender) || 'male');

	$effect(() => {
		exercisesPageOpened();
	});

	const hasFilters = $derived($muscleGroup !== null || $searchQuery.trim() !== '');

	function resetFilters() {
		muscleGroupSelected(null);
		searchChanged('');
	}
</script>

<div class="container">
	<header class="rise">
		<p class="eyebrow">// справочник</p>
		<h1>УПРАЖНЕНИЯ</h1>
	</header>

	<div class="tabs rise" style="animation-delay: 0.04s" role="tablist">
		<button class="tab" class:active={tab === 'map'} role="tab" onclick={() => (tab = 'map')}>
			Карта мышц
		</button>
		<button class="tab" class:active={tab === 'search'} role="tab" onclick={() => (tab = 'search')}>
			Поиск
		</button>
	</div>

	<div class="filters plate rise" style="animation-delay: 0.08s">
		{#if tab === 'map'}
			<div class="map-layout">
				<div class="map-col">
					<MuscleMap
						interactive
						variant={gender}
						selected={$muscleGroup}
						onselect={(group) => muscleGroupSelected(group)}
					/>
					{#if $user}
						<div class="gender-toggle" role="radiogroup" aria-label="Модель фигуры">
							<button
								class="chip"
								class:active={gender === 'male'}
								onclick={() => genderSelected('male')}
							>
								М
							</button>
							<button
								class="chip"
								class:active={gender === 'female'}
								onclick={() => genderSelected('female')}
							>
								Ж
							</button>
						</div>
					{/if}
				</div>
				<div class="chips">
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
			</div>
		{:else}
			<div class="field">
				<label for="search">Название упражнения</label>
				<input
					id="search"
					type="search"
					placeholder="Например: жим, тяга, присед…"
					value={$searchQuery}
					oninput={(event) => searchChanged(event.currentTarget.value)}
				/>
			</div>
		{/if}
	</div>

	{#if $exercisesError}
		<p class="error-text">Не удалось загрузить упражнения. Проверь, что бэкенд запущен.</p>
	{:else if $exercisesLoading && $filteredExercises.length === 0}
		<p class="muted">Загружаю…</p>
	{:else}
		<div class="meta-row mono">
			<span>Найдено: <b>{$filteredExercises.length}</b></span>
			{#if $muscleGroup}
				<span class="filter-tag">{muscleGroupLabels[$muscleGroup]}</span>
			{/if}
			{#if $searchQuery.trim()}
				<span class="filter-tag">«{$searchQuery.trim()}»</span>
			{/if}
			{#if hasFilters}
				<button class="reset" onclick={resetFilters}>сбросить</button>
			{/if}
		</div>

		<div class="grid">
			{#each $filteredExercises as exercise, i (exercise.id)}
				<a
					href="/exercises/{exercise.id}"
					class="plate card rise"
					style="animation-delay: {Math.min(i * 0.03, 0.3)}s"
				>
					<span class="group mono">{muscleGroupLabels[exercise.muscle_group]}</span>
					<h2>{exercise.name}</h2>
					{#if exercise.description}
						<p class="muted">{exercise.description}</p>
					{/if}
					<div class="meta mono">
						<span>{equipmentLabels[exercise.equipment]}</span>
						<span class="dot">·</span>
						<span>{difficultyLabels[exercise.difficulty]}</span>
					</div>
				</a>
			{:else}
				<p class="muted">Ничего не нашлось. Попробуй изменить запрос или сбросить фильтры.</p>
			{/each}
		</div>
	{/if}
</div>

<style>
	header {
		margin-bottom: 24px;
	}

	h1 {
		font-size: clamp(34px, 5vw, 56px);
		margin-top: 12px;
	}

	.tabs {
		display: flex;
		gap: 4px;
		margin-bottom: 14px;
	}

	.tab {
		font-family: var(--font-mono);
		font-size: 12px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: var(--muted);
		background: transparent;
		border: 1px solid var(--line);
		border-radius: 3px 3px 0 0;
		padding: 10px 18px;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.tab:hover {
		color: var(--ink);
	}

	.tab.active {
		color: var(--volt);
		border-color: var(--volt);
		background: var(--bg-raised);
	}

	.filters {
		padding: 24px;
		margin-bottom: 24px;
	}

	.map-layout {
		display: grid;
		grid-template-columns: minmax(260px, 400px) 1fr;
		gap: 28px;
		align-items: center;
	}

	.map-col {
		display: flex;
		flex-direction: column;
		gap: 12px;
		align-items: center;
	}

	.gender-toggle {
		display: flex;
		gap: 6px;
	}

	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		align-content: flex-start;
	}

	.meta-row {
		display: flex;
		align-items: center;
		gap: 12px;
		font-size: 12px;
		color: var(--muted);
		margin-bottom: 16px;
		flex-wrap: wrap;
	}

	.meta-row b {
		color: var(--volt);
	}

	.filter-tag {
		border: 1px solid var(--line-strong);
		border-radius: 999px;
		padding: 3px 10px;
		font-size: 11px;
		color: var(--ink);
	}

	.reset {
		background: none;
		border: none;
		color: var(--danger);
		font-family: var(--font-mono);
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		cursor: pointer;
		padding: 0;
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

	@media (max-width: 760px) {
		.map-layout {
			grid-template-columns: 1fr;
		}
	}
</style>
