<script lang="ts">
	import { exercisesModel } from '../model';
	import { authModel } from '$lib/modules/auth/model';
	import { MuscleMap } from '../components/muscle-map';
	import { Tabs } from '$lib/shared/components/tabs';
	import { Icon } from '$lib/shared/components/icon';
	import { Loader } from '$lib/shared/components/loader';
	import {
		muscleGroupLabels,
		equipmentLabels,
		difficultyLabels,
		exerciseKindLabels
	} from '$lib/shared/helpers/labels';
	import type { ExerciseKind, MuscleGroup } from '$lib/shared/types';

	const exercisesError = exercisesModel.exercisesError;
	const exercisesLoading = exercisesModel.exercisesLoading;
	const filteredExercises = exercisesModel.filteredExercises;
	const muscleGroup = exercisesModel.muscleGroup;
	const searchQuery = exercisesModel.searchQuery;
	const kind = exercisesModel.kind;
	const gender = authModel.gender;
	const user = authModel.user;

	let tab = $state<'map' | 'search'>('map');

	const groups = Object.entries(muscleGroupLabels) as [MuscleGroup, string][];
	const kinds = Object.entries(exerciseKindLabels) as [ExerciseKind, string][];

	$effect(() => {
		exercisesModel.exercisesPageOpened();
	});

	const hasFilters = $derived(
		$muscleGroup !== null || $searchQuery.trim() !== '' || $kind !== null
	);

	function resetFilters() {
		exercisesModel.muscleGroupSelected(null);
		exercisesModel.searchChanged('');
		exercisesModel.kindSelected(null);
	}

	// в карточке — текстовое превью без HTML-разметки инструкции
	function stripHtml(html: string): string {
		return html
			.replace(/<[^>]*>/g, ' ')
			.replace(/\s+/g, ' ')
			.trim();
	}
</script>

<div class="container">
	<header class="rise">
		<p class="eyebrow">// справочник</p>
		<h1>УПРАЖНЕНИЯ</h1>
	</header>

	<Tabs
		tabs={[
			{ id: 'map', label: 'Карта мышц' },
			{ id: 'search', label: 'Поиск' }
		]}
		bind:active={tab}
	/>

	<div class="filters plate rise" style="animation-delay: 0.08s">
		<div class="chips kind-chips">
			<button
				class="chip"
				class:active={$kind === null}
				onclick={() => exercisesModel.kindSelected(null)}
			>
				Все
			</button>
			{#each kinds as [value, label] (value)}
				<button
					class="chip"
					class:active={$kind === value}
					onclick={() => exercisesModel.kindSelected(value)}
				>
					{label}
				</button>
			{/each}
		</div>
		{#if tab === 'map'}
			<div class="map-layout">
				<div class="map-col">
					<MuscleMap
						interactive
						variant={$gender}
						selected={$muscleGroup}
						onselect={(group) => exercisesModel.muscleGroupSelected(group)}
					/>
					{#if !$user?.gender}
						<div class="gender-toggle">
							<Tabs
								tabs={[
									{ id: 'male', label: 'М' },
									{ id: 'female', label: 'Ж' }
								]}
								label="Модель фигуры"
								size="sm"
								bind:active={() => $gender, (value) => authModel.genderSelected(value)}
							/>
						</div>
					{/if}
				</div>
				<div class="chips">
					<button
						class="chip"
						class:active={$muscleGroup === null}
						onclick={() => exercisesModel.muscleGroupSelected(null)}
					>
						Все
					</button>
					{#each groups as [value, label] (value)}
						<button
							class="chip"
							class:active={$muscleGroup === value}
							onclick={() => exercisesModel.muscleGroupSelected(value)}
						>
							{label}
						</button>
					{/each}
				</div>
			</div>
		{:else}
			<div class="field">
				<label for="search">Название упражнения</label>
				<div class="search-input">
					<span class="search-icon"><Icon name="search" size={1.05} /></span>
					<input
						id="search"
						type="search"
						placeholder="Например: жим, тяга, присед…"
						value={$searchQuery}
						oninput={(event) => exercisesModel.searchChanged(event.currentTarget.value)}
					/>
				</div>
			</div>
		{/if}
	</div>

	{#if $exercisesError}
		<p class="error-text">Не удалось загрузить упражнения. Проверь, что бэкенд запущен.</p>
	{:else if $exercisesLoading && $filteredExercises.length === 0}
		<Loader text="Загружаю…" />
	{:else}
		<div class="meta-row mono">
			<span>Найдено: <b>{$filteredExercises.length}</b></span>
			{#if $kind}
				<span class="filter-tag">{exerciseKindLabels[$kind]}</span>
			{/if}
			{#if $muscleGroup}
				<span class="filter-tag">{muscleGroupLabels[$muscleGroup]}</span>
			{/if}
			{#if $searchQuery.trim()}
				<span class="filter-tag">«{$searchQuery.trim()}»</span>
			{/if}
			{#if hasFilters}
				<button class="reset hit-target" onclick={resetFilters}>сбросить</button>
			{/if}
		</div>

		<div class="grid">
			{#each $filteredExercises as exercise, i (exercise.id)}
				<a
					href="/exercises/{exercise.id}"
					class="plate card rise"
					style="animation-delay: {Math.min(i * 0.03, 0.3)}s"
				>
					<span class="group mono"
						>{exercise.primary_muscles.map((m) => muscleGroupLabels[m]).join(' · ')}</span
					>
					<h2>{exercise.name}</h2>
					{#if exercise.instructions}
						<p class="muted">{stripHtml(exercise.instructions)}</p>
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

	.filters {
		padding: 24px;
		margin-bottom: 24px;
	}

	.kind-chips {
		margin-bottom: 18px;
	}

	.search-input {
		position: relative;
		display: flex;
		align-items: center;
	}

	.search-icon {
		position: absolute;
		left: 13px;
		display: inline-flex;
		color: var(--muted);
		pointer-events: none;
	}

	.search-input input {
		width: 100%;
		padding-left: 40px;
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
		width: min(100%, 160px);
	}

	.gender-toggle :global(.tabs) {
		margin-bottom: 0;
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
		border-radius: var(--border-radius);
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

	@media (max-width: 560px) {
		.filters {
			padding: 16px 14px;
		}

		.grid {
			grid-template-columns: 1fr;
		}
	}
</style>
