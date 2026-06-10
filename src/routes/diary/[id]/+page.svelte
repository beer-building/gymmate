<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { user } from '$lib/models/auth';
	import {
		allExercises,
		currentWorkout,
		setAdded,
		setDeleted,
		workoutError,
		workoutPageOpened,
		workoutPlan,
		workoutSets,
		workoutUpdated
	} from '$lib/models/diary';
	import { formatDate, muscleGroupLabels } from '$lib/labels';
	import type { WorkoutSet } from '$lib/types';

	let selectedExercise = $state('');
	let reps = $state(10);
	let weight = $state(20);
	let notesDraft = $state('');
	let notesInitialized = false;

	$effect(() => {
		if (!$user) {
			goto('/login');
			return;
		}
		notesInitialized = false;
		workoutPageOpened(page.params.id!);
	});

	$effect(() => {
		if ($currentWorkout && !notesInitialized) {
			notesDraft = $currentWorkout.notes;
			notesInitialized = true;
		}
	});

	// подходы, сгруппированные по упражнению, в порядке добавления
	const grouped = $derived.by(() => {
		const groups: { id: string; name: string; sets: WorkoutSet[] }[] = [];
		for (const set of $workoutSets) {
			let entry = groups.find((group) => group.id === set.exercise);
			if (!entry) {
				entry = { id: set.exercise, name: set.expand?.exercise?.name ?? '—', sets: [] };
				groups.push(entry);
			}
			entry.sets.push(set);
		}
		return groups;
	});

	function addSet(event: SubmitEvent) {
		event.preventDefault();
		if (!selectedExercise) return;
		setAdded({ exercise: selectedExercise, reps, weight });
	}

	function quickAdd(exerciseId: string) {
		selectedExercise = exerciseId;
		document.getElementById('set-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
	}

	function saveNotes() {
		if ($currentWorkout && notesDraft !== $currentWorkout.notes) {
			workoutUpdated({ notes: notesDraft });
		}
	}

	const totalVolume = $derived(
		$workoutSets.reduce((sum, set) => sum + set.reps * (set.weight || 0), 0)
	);
</script>

<div class="container narrow">
	{#if $workoutError}
		<p class="error-text">Тренировка не найдена.</p>
	{:else if !$currentWorkout}
		<p class="muted">Загружаю…</p>
	{:else}
		{@const workout = $currentWorkout}
		<a href="/diary" class="back mono">← Дневник</a>

		<header class="rise">
			<p class="eyebrow">// {formatDate(workout.date)}</p>
			<h1>{workout.name || 'ТРЕНИРОВКА'}</h1>
			<div class="stats mono">
				<span><b>{$workoutSets.length}</b> подходов</span>
				<span class="dot">·</span>
				<span><b>{totalVolume.toLocaleString('ru-RU')}</b> кг общий тоннаж</span>
			</div>
		</header>

		{#if $workoutPlan.length > 0}
			<section class="plate block rise" style="animation-delay: 0.06s">
				<h2 class="mono label">План на сегодня</h2>
				<ul class="plan">
					{#each $workoutPlan as item (item.id)}
						<li>
							<span>{item.expand?.exercise?.name}</span>
							<span class="mono muted">{item.sets}×{item.reps}</span>
							<button class="btn ghost sm" onclick={() => quickAdd(item.exercise)}>
								Записать подход
							</button>
						</li>
					{/each}
				</ul>
			</section>
		{/if}

		<section class="plate block volt rise" id="set-form" style="animation-delay: 0.1s">
			<h2 class="mono label">Записать подход</h2>
			<form onsubmit={addSet}>
				<div class="field grow">
					<label for="exercise">Упражнение</label>
					<select id="exercise" bind:value={selectedExercise} required>
						<option value="" disabled>Выбери упражнение</option>
						{#each $allExercises as exercise (exercise.id)}
							<option value={exercise.id}>
								{exercise.name} — {muscleGroupLabels[exercise.muscle_group]}
							</option>
						{/each}
					</select>
				</div>
				<div class="field">
					<label for="reps">Повторы</label>
					<input id="reps" type="number" min="1" bind:value={reps} required />
				</div>
				<div class="field">
					<label for="weight">Вес, кг</label>
					<input id="weight" type="number" min="0" step="0.5" bind:value={weight} />
				</div>
				<button class="btn" type="submit">+</button>
			</form>
		</section>

		{#each grouped as group (group.id)}
			<section class="plate block">
				<div class="group-head">
					<h2><a href="/exercises/{group.id}">{group.name}</a></h2>
					<span class="mono muted">{group.sets.length} подх.</span>
				</div>
				<div class="sets">
					{#each group.sets as set, i (set.id)}
						<div class="set mono">
							<span class="n">#{i + 1}</span>
							<span><b>{set.reps}</b> повт.</span>
							<span><b>{set.weight || '—'}</b> кг</span>
							<button class="x" onclick={() => setDeleted(set.id)} title="Удалить подход">✕</button>
						</div>
					{/each}
				</div>
			</section>
		{/each}

		<section class="plate block">
			<h2 class="mono label">Заметки</h2>
			<div class="field">
				<textarea
					rows="3"
					bind:value={notesDraft}
					onblur={saveNotes}
					placeholder="Самочувствие, что давалось тяжело, что увеличить в следующий раз…"
				></textarea>
			</div>
		</section>
	{/if}
</div>

<style>
	.narrow {
		max-width: 760px;
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
		margin-block: 20px 24px;
	}

	h1 {
		font-size: clamp(26px, 4vw, 40px);
		margin-block: 12px 14px;
	}

	.stats {
		font-size: 12px;
		color: var(--muted);
		display: flex;
		gap: 10px;
	}

	.stats b {
		color: var(--volt);
		font-weight: 600;
	}

	.dot {
		color: var(--line-strong);
	}

	.block {
		padding: 22px;
		margin-bottom: 14px;
	}

	.block.volt {
		border-left: 3px solid var(--volt);
	}

	.label {
		font-family: var(--font-mono);
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.2em;
		color: var(--volt);
		margin-bottom: 16px;
	}

	.plan {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
	}

	.plan li {
		display: flex;
		align-items: center;
		gap: 14px;
		padding-block: 10px;
		border-bottom: 1px solid var(--line);
		font-size: 14px;
	}

	.plan li:last-child {
		border-bottom: none;
	}

	.plan li span:first-child {
		flex: 1;
	}

	form {
		display: flex;
		gap: 12px;
		align-items: flex-end;
		flex-wrap: wrap;
	}

	form .field.grow {
		flex: 1;
		min-width: 220px;
	}

	form .field:not(.grow) {
		width: 110px;
	}

	.group-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 12px;
		margin-bottom: 14px;
	}

	.group-head h2 {
		font-size: 16px;
	}

	.group-head a:hover {
		color: var(--volt);
	}

	.group-head .mono {
		font-size: 11px;
	}

	.sets {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.set {
		display: grid;
		grid-template-columns: 44px 1fr 1fr auto;
		gap: 12px;
		align-items: center;
		font-size: 13px;
		background: var(--bg-sunken);
		border: 1px solid var(--line);
		border-radius: 3px;
		padding: 9px 14px;
	}

	.set .n {
		color: var(--muted);
	}

	.set b {
		color: var(--volt);
		font-weight: 600;
	}

	.x {
		background: none;
		border: none;
		color: var(--muted);
		cursor: pointer;
		font-size: 13px;
		padding: 2px 6px;
	}

	.x:hover {
		color: var(--danger);
	}

	textarea {
		resize: vertical;
	}
</style>
