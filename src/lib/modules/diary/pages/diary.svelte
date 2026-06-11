<script lang="ts">
	import { goto } from '$app/navigation';
	import { diaryModel } from '../model';
	import { authModel } from '$lib/modules/auth/model';
	import { formatDate } from '$lib/shared/helpers/labels';
	import { Tabs } from '$lib/shared/components/tabs';
	import { Icon } from '$lib/shared/components/icon';
	import { Button } from '$lib/shared/components/button';
	import { DifficultyBar } from '$lib/shared/components/difficulty-bar';
	import type { UserProgram, UserProgramWorkout } from '$lib/shared/types';

	const user = authModel.user;
	const myPrograms = diaryModel.myPrograms;
	const workoutLogs = diaryModel.workoutLogs;
	const workoutLogsLoading = diaryModel.workoutLogsLoading;

	let creating = $state(false);
	let importing = $state(false);
	let starting = $state<string | null>(null);
	let tab = $state<'programs' | 'history'>('programs');
	let importInput: HTMLInputElement | null = null;

	$effect(() => {
		if (!$user) {
			goto('/login');
			return;
		}
		diaryModel.diaryPageOpened();
	});

	async function createProgram() {
		creating = true;
		try {
			const program = await diaryModel.createOwnProgramFx();
			goto(`/diary/programs/${program.id}`);
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

	function remove(id: string, event: Event) {
		event.preventDefault();
		event.stopPropagation();
		if (confirm('Удалить тренировку вместе со всеми подходами?')) {
			diaryModel.workoutLogDeleteRequested(id);
		}
	}

	async function startWorkout(program: UserProgram, workout: UserProgramWorkout) {
		starting = workout.id;
		try {
			const log = await diaryModel.startUserWorkoutFx({ program, workout });
			goto(`/diary/${log.id}`);
		} finally {
			starting = null;
		}
	}

	function archive(id: string) {
		if (confirm('Убрать программу из дневника? История тренировок останется.')) {
			diaryModel.programArchiveRequested(id);
		}
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

	<Tabs
		tabs={[
			{ id: 'programs', label: 'Мои программы' },
			{ id: 'history', label: 'История' }
		]}
		bind:active={tab}
	/>

	{#if tab === 'programs'}
		{#if $myPrograms.length === 0}
			<div class="plate empty rise">
				<p class="mono">Пока пусто</p>
				<p class="muted">
					Добавь <a href="/programs">готовую программу</a> или
					<button class="link-btn" onclick={createProgram}>создай свою</button> — и начинай тренировки
					по плану.
				</p>
			</div>
		{:else}
			{#each $myPrograms as { program, workouts }, i (program.id)}
				<div class="plate program rise" style="animation-delay: {i * 0.06}s">
					<div class="program-head">
						<div class="program-title">
							<h3><a href="/diary/programs/{program.id}">{program.name}</a></h3>
							{#if program.difficulty}
								<DifficultyBar level={program.difficulty} />
							{/if}
						</div>
						<div class="program-actions">
							<a class="archive mono" href="/diary/programs/{program.id}">изменить</a>
							<button
								class="archive mono"
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
								<span class="name">{workout.name}</span>
								<Button
									size="sm"
									onclick={() => startWorkout(program, workout)}
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
		<p class="muted">Загружаю…</p>
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
				<a
					href="/diary/{log.id}"
					class="plate row rise"
					style="animation-delay: {Math.min(i * 0.05, 0.4)}s"
				>
					<div class="date mono">{formatDate(log.started_at)}</div>
					<div class="body">
						<h2>
							{log.name_snapshot || 'Тренировка'}
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
						onclick={(event: MouseEvent) => remove(log.id, event)}
						title="Удалить"
						aria-label="Удалить"
					>
						<Icon name="trash" />
					</Button>
				</a>
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

	.program-head h3 {
		font-size: 17px;
		min-width: 0;
		overflow-wrap: anywhere;
	}

	.program-head h3 a:hover {
		color: var(--volt);
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
		color: var(--volt);
		cursor: pointer;
		text-decoration: underline;
	}

	.archive {
		background: none;
		border: none;
		color: var(--muted);
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		cursor: pointer;
		padding: 0;
		white-space: nowrap;
	}

	.archive:hover {
		color: var(--danger);
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
		border-bottom: 1px solid var(--line);
		font-size: 14px;
	}

	.program-workouts li:last-child {
		border-bottom: none;
	}

	.program-workouts .num {
		color: var(--volt);
		font-size: 12px;
	}

	.program-workouts .name {
		flex: 1;
		min-width: 0;
		overflow-wrap: anywhere;
	}

	.empty {
		padding: 40px 32px;
		text-align: center;
	}

	.empty .mono {
		color: var(--volt);
		text-transform: uppercase;
		letter-spacing: 0.2em;
		font-size: 12px;
	}

	.empty a {
		color: var(--volt);
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

	.date {
		font-size: 12px;
		color: var(--volt);
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
		color: var(--bg);
		background: var(--volt);
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
