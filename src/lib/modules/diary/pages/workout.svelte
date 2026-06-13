<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { diaryModel } from '../model';
	import { authModel } from '$lib/modules/auth/model';
	import { ExerciseSelect } from '$lib/modules/exercises/components/exercise-select';
	import { formatDate, formatSetsReps, plural } from '$lib/shared/helpers/labels';
	import { Icon } from '$lib/shared/components/icon';
	import { Button } from '$lib/shared/components/button';
	import { Loader } from '$lib/shared/components/loader';

	const user = authModel.user;
	const allExercises = diaryModel.allExercises;
	const currentWorkoutLog = diaryModel.currentWorkoutLog;
	const logExercises = diaryModel.logExercises;
	const logSets = diaryModel.logSets;
	const workoutError = diaryModel.workoutError;
	const workoutActionError = diaryModel.workoutActionError;
	const workoutPlan = diaryModel.workoutPlan;
	const lastSet = diaryModel.lastSet;
	const workoutSummary = diaryModel.workoutSummary;

	let selectedExercise = $state('');
	let reps = $state(10);
	let weight = $state(0);
	let notesDraft = $state('');
	let notesInitialized = false;
	// «прошлый раз» по упражнениям запрашиваем один раз на завершённый лог
	let summaryRequestedFor = '';

	$effect(() => {
		if (!$user) {
			goto('/login');
			return;
		}
		notesInitialized = false;
		summaryRequestedFor = '';
		diaryModel.workoutPageOpened(page.params.id!);
	});

	$effect(() => {
		if ($currentWorkoutLog && !notesInitialized) {
			notesDraft = $currentWorkoutLog.notes;
			notesInitialized = true;
		}
	});

	// история по выбранному упражнению — для подсказки и автоподстановки
	$effect(() => {
		if (selectedExercise) diaryModel.lastSetRequested(selectedExercise);
	});

	// Префилл при смене упражнения — каскад без протечки: последний подход
	// в текущем логе → цели из плана → дефолт. Поля никогда не остаются со
	// значениями чужого упражнения. История из прошлых тренировок приходит
	// асинхронно и применяется поверх плана/дефолта, но только пока поля
	// не трогали руками и они не из текущего лога.
	let prefill = { exercise: '', source: '', reps: 0, weight: 0 };

	function applyPrefill(source: string, nextReps: number | undefined, nextWeight: number) {
		if (nextReps) reps = nextReps;
		weight = nextWeight;
		prefill = { exercise: selectedExercise, source, reps, weight };
	}

	$effect(() => {
		if (!selectedExercise || prefill.exercise === selectedExercise) return;
		const logExercise = $logExercises.find((item) => item.exercise === selectedExercise);
		const last = logExercise
			? $logSets.findLast((set) => set.workout_log_exercise === logExercise.id)
			: undefined;
		if (last) {
			applyPrefill('log', last.reps, last.weight || 0);
			return;
		}
		const planned = $workoutPlan.find((item) => item.exercise === selectedExercise);
		if (planned && (planned.target_weight || planned.target_reps_min || planned.target_reps_max)) {
			applyPrefill(
				'plan',
				planned.target_reps_min || planned.target_reps_max,
				planned.target_weight || 0
			);
			return;
		}
		applyPrefill('default', 10, 0);
	});

	$effect(() => {
		const history = $lastSet;
		if (!history?.set || history.exerciseId !== selectedExercise) return;
		if (prefill.exercise !== selectedExercise) return;
		if (prefill.source === 'log' || prefill.source === 'history') return;
		// пользователь уже правил поля после префилла — не перетираем
		if (reps !== prefill.reps || weight !== prefill.weight) return;
		applyPrefill('history', history.set.reps, history.set.weight || 0);
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
		const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		document.getElementById('set-form')?.scrollIntoView({
			behavior: reduceMotion ? 'auto' : 'smooth',
			block: 'center'
		});
	}

	function saveNotes() {
		if ($currentWorkoutLog && notesDraft !== $currentWorkoutLog.notes) {
			diaryModel.workoutUpdated({ notes: notesDraft });
		}
	}

	// Завершение — в два касания: первое «взводит» кнопку, второе завершает.
	// Случайный тап при скролле больше не убивает тренировку.
	let finishArmed = $state(false);
	let finishDisarmTimer: ReturnType<typeof setTimeout> | undefined;

	function requestFinish() {
		clearTimeout(finishDisarmTimer);
		if (!finishArmed) {
			finishArmed = true;
			finishDisarmTimer = setTimeout(() => (finishArmed = false), 4000);
			return;
		}
		finishArmed = false;
		diaryModel.workoutFinishRequested();
	}

	const totalVolume = $derived(
		$logSets.reduce((sum, set) => sum + set.reps * (set.weight || 0), 0)
	);

	function formatDuration(seconds: number): string {
		const minutes = Math.round(seconds / 60);
		return minutes < 60 ? `${minutes} мин` : `${Math.floor(minutes / 60)} ч ${minutes % 60} мин`;
	}

	// --- итог завершённой тренировки ---

	// лучший подход упражнения (макс. вес, при равенстве — больше повторов)
	// + дельта к прошлому разу из workoutSummary
	const summaryRows = $derived(
		grouped.map((group) => {
			const best = group.sets.reduce(
				(acc, set) => {
					const w = set.weight || 0;
					return w > acc.weight || (w === acc.weight && set.reps > acc.reps)
						? { weight: w, reps: set.reps }
						: acc;
				},
				{ weight: 0, reps: 0 }
			);
			const prev = $workoutSummary.find((item) => item.exerciseId === group.exercise)?.prevWeight;
			return {
				id: group.id,
				exercise: group.exercise,
				name: group.name,
				weight: best.weight,
				reps: best.reps,
				// null — упражнение раньше не делали; число — было столько кг
				prev: prev ?? null
			};
		})
	);

	// «прошлый раз» по упражнениям запрашиваем один раз, когда тренировка завершена
	$effect(() => {
		const log = $currentWorkoutLog;
		if (!log?.completed_at || summaryRequestedFor === log.id) return;
		const exerciseIds = grouped.map((group) => group.exercise).filter(Boolean);
		if (exerciseIds.length === 0) return;
		summaryRequestedFor = log.id;
		diaryModel.workoutSummaryRequested({ logId: log.id, exerciseIds });
	});
</script>

<div class="container narrow">
	{#if $workoutError}
		<p class="error-text">Тренировка не найдена.</p>
	{:else if !$currentWorkoutLog}
		<Loader text="Загружаю…" />
	{:else}
		{@const log = $currentWorkoutLog}
		<a href="/diary" class="back mono hit-target"><Icon name="chevron-left" size={0.9} /> Дневник</a
		>

		<header class="rise">
			<p class="eyebrow">// {formatDate(log.started_at)}</p>
			<h1>{log.name_snapshot || 'ТРЕНИРОВКА'}</h1>
			<div class="stats mono">
				{#if log.completed_at}
					<!-- завершена: числа живут в итоговой плите, в шапке — статус и выход из неё -->
					<span class="done-mark">
						✓ завершена{log.duration_seconds ? ` за ${formatDuration(log.duration_seconds)}` : ''}
					</span>
					<Button kind="ghost" size="sm" onclick={() => diaryModel.workoutResumeRequested()}>
						Возобновить
					</Button>
				{:else}
					<span
						><b>{$logSets.length}</b>
						{plural($logSets.length, ['подход', 'подхода', 'подходов'])}</span
					>
					<span class="dot">·</span>
					<span><b>{totalVolume.toLocaleString('ru-RU')}</b> кг общий тоннаж</span>
					<span class="dot">·</span>
					<!-- ghost в покое: кнопку жмут раз за тренировку, она не должна
					     перекрикивать форму записи; взведённая — primary -->
					<Button kind={finishArmed ? 'primary' : 'ghost'} size="sm" onclick={requestFinish}>
						{finishArmed ? 'Точно завершить?' : 'Завершить тренировку'}
					</Button>
				{/if}
			</div>
		</header>

		{#if log.completed_at}
			<!-- итог вместо плана и формы: момент награды (peak-end). Числа — герой,
			     дельта весов отвечает на «вырос ли я с прошлого раза» -->
			<section class="plate volt block summary rise">
				<p class="mono label">// тренировка завершена</p>
				<div class="totals mono">
					<span class="total"
						><b>{$logSets.length}</b>
						{plural($logSets.length, ['подход', 'подхода', 'подходов'])}</span
					>
					<span class="dot">·</span>
					<span class="total"><b>{totalVolume.toLocaleString('ru-RU')}</b> кг тоннаж</span>
					{#if log.duration_seconds}
						<span class="dot">·</span>
						<span class="total"><b>{formatDuration(log.duration_seconds)}</b></span>
					{/if}
				</div>

				{#if summaryRows.length > 0}
					<ul class="breakdown">
						{#each summaryRows as row (row.id)}
							{@const delta = row.prev === null ? null : row.weight - row.prev}
							<li>
								{#if row.exercise}
									<a
										href="/exercises/{row.exercise}?ref={page.url.pathname}"
										class="bd-name exercise-link"
									>
										{row.name}
									</a>
								{:else}
									<span class="bd-name">{row.name}</span>
								{/if}
								<span class="bd-top mono"><b>{row.weight || '—'}</b> кг × {row.reps}</span>
								<span class="bd-delta mono" class:up={delta !== null && delta > 0}>
									{#if delta === null}
										новое
									{:else if delta > 0}
										↑ {delta.toLocaleString('ru-RU')}
									{:else if delta < 0}
										↓ {Math.abs(delta).toLocaleString('ru-RU')}
									{:else}
										=
									{/if}
								</span>
							</li>
						{/each}
					</ul>
				{:else}
					<p class="muted summary-empty">Ни одного подхода не записано.</p>
				{/if}
			</section>
		{:else}
			{#if $workoutPlan.length > 0}
				<section class="plate block rise" style="animation-delay: 0.06s">
					<h2 class="mono label">План на сегодня</h2>
					<ul class="plan">
						{#each $workoutPlan as item (item.id)}
							<li>
								<!-- название ведёт на карточку упражнения (техника, видео); ?ref —
								     чтобы «Назад» вернуло в тренировку. «Выбрать» рядом — для записи -->
								{#if item.exercise}
									<a
										href="/exercises/{item.exercise}?ref={page.url.pathname}"
										class="plan-name exercise-link"
									>
										{item.expand?.exercise?.name ?? '—'}
									</a>
								{:else}
									<span class="plan-name">{item.expand?.exercise?.name ?? '—'}</span>
								{/if}
								<!-- целевой вес виден прямо в плане: его не нужно вспоминать со сбитым дыханием -->
								<span class="mono muted">
									{formatSetsReps(item)}{item.target_weight ? ` · ${item.target_weight} кг` : ''}
								</span>
								<!-- «Выбрать», не «Записать подход»: кнопка подставляет упражнение
								     и цели в форму, а не записывает подход -->
								<Button kind="ghost" size="sm" onclick={() => quickAdd(item.exercise)}>
									Выбрать
								</Button>
								{#if item.notes}
									<!-- заметка к упражнению из программы: техника, на что смотреть -->
									<p class="plan-note muted">{item.notes}</p>
								{/if}
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
				{#if $lastSet?.set && $lastSet.exerciseId === selectedExercise}
					<p class="last-hint mono">
						в прошлый раз: <b>{$lastSet.set.weight || 0} кг × {$lastSet.set.reps}</b>
						· {formatDate($lastSet.set.created)}
					</p>
				{/if}
				{#if $workoutActionError}
					<!-- role=alert: скринридер услышит фейл записи, а не только глаза -->
					<p class="error-text action-error" role="alert">{$workoutActionError}</p>
				{/if}
			</section>
		{/if}

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
					aria-label="Заметки к тренировке"
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

	.done-mark {
		color: var(--volt);
	}

	.block {
		padding: 22px;
		margin-bottom: 14px;
	}

	/* --- итоговая плита завершённой тренировки --- */

	.summary .totals {
		display: flex;
		align-items: baseline;
		flex-wrap: wrap;
		gap: 8px 12px;
		font-size: 13px;
		color: var(--muted);
	}

	/* цифры — герой: крупные, моноширинные, volt */
	.summary .total b {
		font-size: 22px;
		font-weight: 700;
		color: var(--volt);
		font-variant-numeric: tabular-nums;
	}

	.breakdown {
		list-style: none;
		margin: 18px 0 0;
		padding: 16px 0 0;
		border-top: 1px solid var(--line);
		display: flex;
		flex-direction: column;
	}

	.breakdown li {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto auto;
		align-items: baseline;
		gap: 6px 16px;
		padding-block: 8px;
		font-size: 14px;
	}

	.bd-name {
		min-width: 0;
		overflow-wrap: anywhere;
	}

	.bd-top {
		font-size: 13px;
		white-space: nowrap;
		color: var(--muted);
	}

	.bd-top b {
		color: var(--ink);
		font-weight: 600;
	}

	/* дельта к прошлому разу: рост — volt (прогресс = смысл дневника),
	   равно/спад — приглушённо, без красного (спад ≠ ошибка) */
	.bd-delta {
		font-size: 12px;
		font-weight: 600;
		letter-spacing: 0.04em;
		white-space: nowrap;
		color: var(--muted);
		min-width: 3.5rem;
		text-align: right;
	}

	.bd-delta.up {
		color: var(--volt);
	}

	.summary-empty {
		margin: 14px 0 0;
		font-size: 13px;
	}

	/* акцент формы — общий .plate.volt из app.css («заряженная» плита) */

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

	/* заметка к упражнению — отдельной строкой под названием, во всю ширину */
	.plan-note {
		grid-column: 1 / -1;
		margin: 2px 0 0;
		font-size: 13px;
		line-height: 1.45;
		overflow-wrap: anywhere;
	}

	/* название-ссылка на упражнение: подсветка по наведению, как у записанных групп */
	a.exercise-link {
		color: inherit;
		transition: color 0.15s ease;
	}

	a.exercise-link:hover {
		color: var(--volt);
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

	.last-hint {
		margin: 12px 0 0;
		font-size: 11px;
		color: var(--muted);
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}

	.last-hint b {
		color: var(--volt);
		font-weight: 600;
	}

	.action-error {
		margin: 12px 0 0;
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

		/* итог: название во всю ширину, вес и дельта — вторым рядом */
		.breakdown li {
			grid-template-columns: minmax(0, 1fr) auto;
		}

		.bd-name {
			grid-column: 1 / -1;
		}

		.summary .total b {
			font-size: 20px;
		}
	}
</style>
