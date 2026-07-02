<script lang="ts">
	import { goto } from '$app/navigation';
	import { diaryModel } from '../model';
	import { authModel } from '$lib/modules/auth/model';
	import { formatDate } from '$lib/shared/helpers/labels';
	import { LLM_PROMPT } from '../helpers/llm-prompt';
	import { Tabs } from '$lib/shared/components/tabs';
	import { Icon } from '$lib/shared/components/icon';
	import { Button } from '$lib/shared/components/button';
	import { DifficultyBar } from '$lib/shared/components/difficulty-bar';
	import { Loader } from '$lib/shared/components/loader';
	import type { UserProgramWorkout } from '$lib/shared/types';

	const user = authModel.user;
	const myPrograms = diaryModel.myPrograms;
	const myProgramsLoading = diaryModel.myProgramsLoading;
	const workoutLogs = diaryModel.workoutLogs;
	const workoutLogsLoading = diaryModel.workoutLogsLoading;
	const workoutLogsError = diaryModel.workoutLogsError;
	const myProgramsError = diaryModel.myProgramsError;
	const activeWorkoutLog = diaryModel.activeWorkoutLog;

	let creating = $state(false);
	let importing = $state(false);
	let starting = $state<string | null>(null);
	let tab = $state<'programs' | 'history'>('programs');
	let importInput: HTMLInputElement | null = null;
	let actionError = $state('');

	$effect(() => {
		if (!$user) {
			goto('/login');
			return;
		}
		diaryModel.diaryPageOpened();
	});

	async function createProgram() {
		creating = true;
		actionError = '';
		try {
			const program = await diaryModel.createOwnProgramFx();
			goto(`/diary/programs/${program.id}`);
		} catch {
			// молчаливый фейл хуже ошибки: раньше кнопка просто «отщёлкивала»
			actionError = 'Не удалось создать программу — проверь соединение и попробуй ещё раз.';
		} finally {
			creating = false;
		}
	}

	async function importProgram(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (!file) return;
		importing = true;
		try {
			const { program, skipped } = await diaryModel.importProgramFx(file);
			if (skipped.length > 0) {
				alert(`Этих упражнений нет в каталоге, они пропущены:\n${skipped.join('\n')}`);
			}
			goto(`/diary/programs/${program.id}`);
		} catch (error) {
			alert(error instanceof Error ? error.message : 'Не удалось импортировать файл.');
		} finally {
			importing = false;
		}
	}

	function remove(id: string) {
		if (confirm('Удалить тренировку вместе со всеми подходами?')) {
			diaryModel.workoutLogDeleteRequested(id);
		}
	}

	async function startWorkout(workout: UserProgramWorkout) {
		starting = workout.id;
		actionError = '';
		try {
			const log = await diaryModel.startUserWorkoutFx(workout);
			goto(`/diary/${log.id}`);
		} catch {
			actionError = 'Не удалось начать тренировку — проверь соединение и попробуй ещё раз.';
		} finally {
			starting = null;
		}
	}

	function archive(id: string) {
		if (confirm('Убрать программу из дневника? История тренировок останется.')) {
			diaryModel.programArchiveRequested(id);
		}
	}

	let copied = $state(false);

	async function copyPrompt() {
		try {
			await navigator.clipboard.writeText(LLM_PROMPT);
			copied = true;
			setTimeout(() => (copied = false), 2000);
		} catch {
			alert('Не удалось скопировать в буфер обмена.');
		}
	}

	// подсказка про LLM-промпт — разовая: скрываем по крестику и запоминаем выбор.
	// typeof-гард — чтобы не лезть в localStorage при пререндере (в Node его нет)
	const PROMPT_HINT_KEY = 'gymmate:diary-prompt-hint-dismissed';
	let promptHintDismissed = $state(
		typeof localStorage !== 'undefined' && localStorage.getItem(PROMPT_HINT_KEY) === '1'
	);

	function dismissPromptHint() {
		promptHintDismissed = true;
		localStorage.setItem(PROMPT_HINT_KEY, '1');
	}
</script>

<div class="container narrow">
	<header class="rise">
		<div>
			<p class="eyebrow">// журнал</p>
			<h1>ДНЕВНИК</h1>
		</div>
		<div class="header-actions">
			<Button kind="ghost" onclick={() => importInput?.click()} disabled={importing}>
				{importing ? 'Импортирую…' : 'Импорт'}
			</Button>
			<Button onclick={createProgram} disabled={creating}>
				{#if creating}
					Создаю…
				{:else}
					<Icon name="plus" size={1} />
					Новая программа
				{/if}
			</Button>
		</div>
		<input
			bind:this={importInput}
			type="file"
			accept=".json,application/json"
			hidden
			onchange={importProgram}
		/>
	</header>

	{#if actionError}
		<p class="error-text action-error rise" role="alert">{actionError}</p>
	{/if}

	{#if !promptHintDismissed}
		<div class="llm-notice rise">
			<p>
				Составить программу можно через ChatGPT, Claude и другие LLM — используй
				<button class="link-btn hit-target" onclick={copyPrompt}
					>{copied ? 'Скопировано' : 'промпт'}</button
				>.
			</p>
			<button
				class="llm-dismiss hit-target"
				onclick={dismissPromptHint}
				title="Скрыть подсказку"
				aria-label="Скрыть подсказку"
			>
				<Icon name="close" size={0.85} />
			</button>
		</div>
	{/if}

	<!-- незавершённая тренировка всегда на виду: вернувшийся после прерывания
	     продолжает её, а не создаёт дубликат через «Начать» -->
	{#if $activeWorkoutLog}
		<a href="/diary/{$activeWorkoutLog.id}" class="plate volt active-banner rise">
			<span class="active-dot" aria-hidden="true"></span>
			<span class="active-info">
				<span class="mono active-label">// тренировка идёт</span>
				<span class="active-name">{$activeWorkoutLog.name_snapshot || 'Тренировка'}</span>
			</span>
			<span class="mono active-cta">Продолжить</span>
		</a>
	{/if}

	<Tabs
		tabs={[
			{ id: 'programs', label: 'Мои программы' },
			{ id: 'history', label: 'История' }
		]}
		bind:active={tab}
	/>

	{#if tab === 'programs'}
		{#if $myProgramsLoading}
			<div class="loader-wrap rise">
				<Loader animationDirection="vertical" />
			</div>
		{:else if $myProgramsError}
			<!-- фейл загрузки нельзя маскировать под «Пока пусто» -->
			<div class="plate empty rise">
				<p class="error-text">Не удалось загрузить программы — проверь соединение.</p>
				<p class="muted">
					<button class="link-btn hit-target" onclick={() => diaryModel.diaryPageOpened()}>
						Попробовать ещё раз
					</button>
				</p>
			</div>
		{:else if $myPrograms.length === 0}
			<div class="plate empty rise">
				<p class="mono">Пока пусто</p>
				<p class="muted">
					Добавь <a href="/programs">готовую программу</a> или
					<button class="link-btn hit-target" onclick={createProgram}>создай свою</button> — и начинай
					тренировки по плану.
				</p>
			</div>
		{:else}
			{#each $myPrograms as { program, workouts }, i (program.id)}
				<div class="plate program rise" style="animation-delay: {i * 0.06}s">
					<div class="program-head">
						<div class="program-title">
							<h2 class="program-name">{program.name}</h2>
							{#if program.difficulty}
								<DifficultyBar level={program.difficulty} />
							{/if}
						</div>
						<div class="program-actions">
							<a class="archive mono hit-target" href="/diary/programs/{program.id}">изменить</a>
							<button
								class="archive mono hit-target"
								onclick={() => archive(program.id)}
								title="Убрать из дневника"
							>
								в архив
							</button>
						</div>
					</div>
					<ul class="program-workouts">
						{#each workouts as workout (workout.id)}
							<li>
								<span class="mono num">{String(workout.order_index).padStart(2, '0')}</span>
								<a href="/diary/workouts/{workout.id}" class="name">{workout.name}</a>
								<Button
									size="sm"
									onclick={() => startWorkout(workout)}
									disabled={starting === workout.id}
								>
									{starting === workout.id ? 'Создаю…' : 'Начать'}
								</Button>
							</li>
						{/each}
					</ul>
				</div>
			{/each}
		{/if}
	{:else if $workoutLogsLoading && $workoutLogs.length === 0}
		<Loader text="Загружаю…" />
	{:else if $workoutLogsError}
		<div class="plate empty rise">
			<p class="error-text">Не удалось загрузить историю — проверь соединение.</p>
			<p class="muted">
				<button class="link-btn hit-target" onclick={() => diaryModel.diaryPageOpened()}>
					Попробовать ещё раз
				</button>
			</p>
		</div>
	{:else if $workoutLogs.length === 0}
		<div class="plate empty rise">
			<p class="mono">Пока пусто</p>
			<p class="muted">
				Начни тренировку из <a href="/programs">программы</a> или создай с нуля — и записывай каждый подход.
			</p>
		</div>
	{:else}
		<div class="list">
			{#each $workoutLogs as log, i (log.id)}
				<!-- кнопка удаления не может жить внутри <a>: карточка — div,
				     ссылка растянута оверлеем через .row-link::after -->
				<div class="plate glow row rise" style="animation-delay: {Math.min(i * 0.05, 0.4)}s">
					<div class="date mono">{formatDate(log.started_at)}</div>
					<div class="body">
						<h2>
							<a href="/diary/{log.id}" class="row-link">{log.name_snapshot || 'Тренировка'}</a>
							{#if !log.completed_at}
								<span class="live mono">идёт</span>
							{/if}
						</h2>
						{#if log.notes}
							<p class="muted">{log.notes}</p>
						{/if}
					</div>
					<Button
						kind="icon"
						class="row-delete"
						onclick={() => remove(log.id)}
						title="Удалить"
						aria-label="Удалить"
					>
						<Icon name="trash" />
					</Button>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.narrow {
		max-width: 820px;
	}

	header {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 16px;
		margin-bottom: 32px;
		flex-wrap: wrap;
	}

	h1 {
		font-size: clamp(34px, 5vw, 56px);
		margin-top: 12px;
	}

	.header-actions {
		display: flex;
		gap: 10px;
		flex-wrap: wrap;
	}

	.llm-notice {
		display: flex;
		align-items: flex-start;
		gap: 10px;
		margin-bottom: 24px;
		font-size: 13px;
		color: var(--color-muted);
	}

	.llm-notice p {
		flex: 1;
		min-width: 0;
	}

	.llm-dismiss {
		flex-shrink: 0;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.5rem;
		height: 1.5rem;
		padding: 0;
		margin-top: -2px;
		background: transparent;
		border: none;
		border-radius: var(--border-radius);
		color: var(--color-muted);
		cursor: pointer;
		transition:
			color 0.15s ease,
			background 0.15s ease;
	}

	.llm-dismiss:hover {
		color: var(--color-text);
		background: oklch(from var(--color-text) l c h / 0.06);
	}

	.action-error {
		margin: 0 0 16px;
	}

	/* --- плашка незавершённой тренировки --- */

	.active-banner {
		display: flex;
		align-items: center;
		gap: 14px;
		padding: 14px 18px;
		margin-bottom: 14px;
	}

	.active-dot {
		flex-shrink: 0;
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--color-accent);
		box-shadow: 0 0 8px oklch(from var(--color-accent) l c h / 0.6);
	}

	.active-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
		flex: 1;
	}

	.active-label {
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.18em;
		color: var(--color-accent);
	}

	.active-name {
		font-weight: 700;
		font-size: 15px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.active-cta {
		flex-shrink: 0;
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: var(--color-accent);
	}

	.llm-notice p {
		margin: 0;
	}

	.program {
		padding: 22px;
		margin-bottom: 14px;
	}

	.program-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 8px 12px;
		margin-bottom: 14px;
		flex-wrap: wrap;
	}

	.program-title {
		display: flex;
		align-items: center;
		gap: 12px;
		min-width: 0;
	}

	.program-title :global(.bar) {
		width: 64px;
		flex-shrink: 0;
	}

	.program-head .program-name {
		font-size: 17px;
		min-width: 0;
		overflow-wrap: anywhere;
	}

	.program-actions {
		display: flex;
		gap: 14px;
		align-items: baseline;
		flex-shrink: 0;
	}

	.link-btn {
		background: none;
		border: none;
		padding: 0;
		font: inherit;
		color: var(--color-accent);
		cursor: pointer;
		text-decoration: underline;
	}

	.archive {
		background: none;
		border: none;
		color: var(--color-muted);
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		cursor: pointer;
		padding: 0;
		white-space: nowrap;
	}

	.archive:hover {
		color: var(--color-error);
	}

	.program-workouts {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.program-workouts li {
		display: flex;
		align-items: center;
		gap: 14px;
		padding-block: 10px;
		border-bottom: 1px solid var(--color-border);
		font-size: 14px;
	}

	.program-workouts li:last-child {
		border-bottom: none;
	}

	.program-workouts .num {
		color: var(--color-accent);
		font-size: 12px;
	}

	.program-workouts .name {
		flex: 1;
		min-width: 0;
		overflow-wrap: anywhere;
		text-decoration: none;
		color: inherit;
	}

	.program-workouts .name:hover {
		color: var(--color-accent);
	}

	.empty {
		padding: 40px 32px;
		text-align: center;
	}

	.empty .mono {
		color: var(--color-accent);
		text-transform: uppercase;
		letter-spacing: 0.2em;
		font-size: 12px;
	}

	.empty a {
		color: var(--color-accent);
	}

	.list {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.row {
		display: grid;
		grid-template-columns: 150px 1fr auto;
		gap: 20px;
		padding: 20px 22px;
		align-items: center;
	}

	/* ссылка покрывает всю карточку; кликабельная зона — весь .row */
	.row-link {
		color: inherit;
	}

	.row-link::after {
		content: '';
		position: absolute;
		inset: 0;
	}

	/* кнопка удаления — поверх оверлея ссылки */
	.row :global(.row-delete) {
		position: relative;
		z-index: 1;
	}

	.date {
		font-size: 12px;
		color: var(--color-accent);
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}

	.body h2 {
		font-size: 16px;
	}

	.live {
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.15em;
		color: var(--color-background);
		background: var(--color-accent);
		border-radius: var(--border-radius);
		padding: 2px 7px;
		margin-left: 8px;
		vertical-align: middle;
	}

	.body p {
		margin: 6px 0 0;
		font-size: 13px;
		display: -webkit-box;
		-webkit-line-clamp: 1;
		line-clamp: 1;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	@media (max-width: 600px) {
		header {
			margin-bottom: 22px;
		}

		.program {
			padding: 16px 14px;
		}

		.empty {
			padding: 28px 18px;
		}

		.row {
			grid-template-columns: 1fr auto;
			gap: 8px 12px;
			padding: 14px 14px;
		}

		.date {
			grid-column: 1 / -1;
		}
	}
</style>
