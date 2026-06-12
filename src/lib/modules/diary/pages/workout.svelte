<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { diaryModel } from '../model';
	import { authModel } from '$lib/modules/auth/model';
	import { ExerciseSelect } from '$lib/modules/exercises/components/exercise-select';
	import { formatDate, formatTargetReps } from '$lib/shared/helpers/labels';
	import { Icon } from '$lib/shared/components/icon';
	import { Button } from '$lib/shared/components/button';
	import { Loader } from '$lib/shared/components/loader';

	const user = authModel.user;
	const allExercises = diaryModel.allExercises;
	const currentWorkoutLog = diaryModel.currentWorkoutLog;
	const logExercises = diaryModel.logExercises;
	const logSets = diaryModel.logSets;
	const workoutError = diaryModel.workoutError;
	const workoutPlan = diaryModel.workoutPlan;

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
		diaryModel.workoutPageOpened(page.params.id!);
	});

	$effect(() => {
		if ($currentWorkoutLog && !notesInitialized) {
			notesDraft = $currentWorkoutLog.notes;
			notesInitialized = true;
		}
	});

	// упражнения лога с их подходами, в порядке добавления
	const grouped = $derived(
		$logExercises.map((exercise) => ({
			id: exercise.id,
			exercise: exercise.exercise,
			name: exercise.exercise_name_snapshot,
			sets: $logSets.filter((set) => set.workout_log_exercise === exercise.id)
		}))
	);

	function addSet(event: SubmitEvent) {
		event.preventDefault();
		if (!selectedExercise) return;
		diaryModel.setAdded({ exercise: selectedExercise, reps, weight });
	}

	function quickAdd(exerciseId: string) {
		selectedExercise = exerciseId;
		document.getElementById('set-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
	}

	function saveNotes() {
		if ($currentWorkoutLog && notesDraft !== $currentWorkoutLog.notes) {
			diaryModel.workoutUpdated({ notes: notesDraft });
		}
	}

	const totalVolume = $derived(
		$logSets.reduce((sum, set) => sum + set.reps * (set.weight || 0), 0)
	);

	function formatDuration(seconds: number): string {
		const minutes = Math.round(seconds / 60);
		return minutes < 60 ? `${minutes} мин` : `${Math.floor(minutes / 60)} ч ${minutes % 60} мин`;
	}
</script>

<div class="container narrow">
	{#if $workoutError}
		<p class="error-text">Тренировка не найдена.</p>
	{:else if !$currentWorkoutLog}
		<Loader text="Загружаю…" />
	{:else}
		{@const log = $currentWorkoutLog}
		<a href="/diary" class="back mono"><Icon name="chevron-left" size={0.9} /> Дневник</a>

		<header class="rise">
			<p class="eyebrow">// {formatDate(log.started_at)}</p>
			<h1>{log.name_snapshot || 'ТРЕНИРОВКА'}</h1>
			<div class="stats mono">
				<span><b>{$logSets.length}</b> подходов</span>
				<span class="dot">·</span>
				<span><b>{totalVolume.toLocaleString('ru-RU')}</b> кг общий тоннаж</span>
				<span class="dot">·</span>
				{#if log.completed_at}
					<span>
						✓ завершена{log.duration_seconds ? ` за ${formatDuration(log.duration_seconds)}` : ''}
					</span>
				{:else}
					<Button size="sm" onclick={() => diaryModel.workoutFinishRequested()}>
						Завершить тренировку
					</Button>
				{/if}
			</div>
		</header>

		{#if $workoutPlan.length > 0}
			<section class="plate block rise" style="animation-delay: 0.06s">
				<h2 class="mono label">План на сегодня</h2>
				<ul class="plan">
					{#each $workoutPlan as item (item.id)}
						<li>
							<span class="plan-name">{item.expand?.exercise?.name}</span>
							<span class="mono muted">{item.target_sets}×{formatTargetReps(item)}</span>
							<Button kind="ghost" size="sm" onclick={() => quickAdd(item.exercise)}>
								Записать подход
							</Button>
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
					<ExerciseSelect
						id="exercise"
						exercises={$allExercises}
						bind:value={selectedExercise}
						required
					/>
				</div>
				<div class="field">
					<label for="reps">Повторы</label>
					<input id="reps" type="number" min="1" bind:value={reps} required />
				</div>
				<div class="field">
					<label for="weight">Вес, кг</label>
					<input id="weight" type="number" min="0" step="0.5" bind:value={weight} />
				</div>
				<Button
					kind="icon-filled"
					class="submit-set"
					type="submit"
					title="Записать подход"
					aria-label="Записать подход"
				>
					<Icon name="plus" />
				</Button>
			</form>
		</section>

		{#each grouped as group (group.id)}
			<section class="plate block">
				<div class="group-head">
					<h2>
						{#if group.exercise}
							<a href="/exercises/{group.exercise}?ref={page.url.pathname}">{group.name}</a>
						{:else}
							{group.name}
						{/if}
					</h2>
					<span class="mono muted">{group.sets.length} подх.</span>
				</div>
				<div class="sets">
					{#each group.sets as set, i (set.id)}
						<div class="set mono">
							<span class="n">#{i + 1}</span>
							<span><b>{set.reps}</b> повт.</span>
							<span><b>{set.weight || '—'}</b> кг</span>
							<Button
								kind="icon"
								onclick={() => diaryModel.setDeleted(set.id)}
								title="Удалить подход"
								aria-label="Удалить подход"
							>
								<Icon name="trash" />
							</Button>
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
		display: inline-flex;
		align-items: center;
		gap: 6px;
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
		overflow-wrap: anywhere;
	}

	.stats {
		font-size: 12px;
		color: var(--muted);
		display: flex;
		align-items: center;
		flex-wrap: wrap;
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
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto auto;
		align-items: center;
		gap: 6px 14px;
		padding-block: 10px;
		border-bottom: 1px solid var(--line);
		font-size: 14px;
	}

	.plan li:last-child {
		border-bottom: none;
	}

	.plan-name {
		min-width: 0;
		overflow-wrap: anywhere;
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

	/* 45px — высота md-инпутов формы; .btn.icon-filled в селекторе — чтобы
	   перебить размеры из самого компонента кнопки */
	form :global(.btn.icon-filled.submit-set) {
		--icon-color: var(--volt);
		width: 45px;
		height: 45px;
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
		min-width: 0;
		overflow-wrap: anywhere;
	}

	.group-head a:hover {
		color: var(--volt);
	}

	.group-head .mono {
		font-size: 11px;
		white-space: nowrap;
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
		border-radius: var(--border-radius);
		padding: 9px 14px;
	}

	.set .n {
		color: var(--muted);
	}

	.set b {
		color: var(--volt);
		font-weight: 600;
	}

	textarea {
		resize: vertical;
	}

	@media (max-width: 560px) {
		.block {
			padding: 16px 14px;
		}

		/* план: название во всю ширину, цель и кнопка — вторым рядом */
		.plan li {
			grid-template-columns: minmax(0, 1fr) auto;
		}

		.plan-name {
			grid-column: 1 / -1;
		}

		/* форма подхода: упражнение во всю ширину, повторы + вес + кнопка в ряд */
		form {
			display: grid;
			grid-template-columns: 1fr 1fr auto;
			align-items: end;
		}

		/* min-width: 0 — иначе дефолтная ширина инпутов распирает fr-колонки */
		form .field {
			min-width: 0;
			width: auto;
		}

		form .field.grow {
			grid-column: 1 / -1;
		}

		form .field :global(input),
		form .field :global(select) {
			width: 100%;
		}

		.set {
			grid-template-columns: 34px 1fr 1fr auto;
			gap: 8px;
			padding: 8px 10px;
		}
	}
</style>
