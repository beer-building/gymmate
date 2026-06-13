<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { programsModel } from '../model';
	import { diaryModel } from '$lib/modules/diary/model';
	import { authModel } from '$lib/modules/auth/model';
	import { formatTargetReps } from '$lib/shared/helpers/labels';
	import { Icon } from '$lib/shared/components/icon';
	import { Button } from '$lib/shared/components/button';
	import { Loader } from '$lib/shared/components/loader';
	import { DifficultyBar } from '$lib/shared/components/difficulty-bar';

	const programDetails = programsModel.programDetails;
	const programError = programsModel.programError;
	const user = authModel.user;

	let adding = $state(false);

	$effect(() => {
		programsModel.programPageOpened(page.params.id!);
	});

	async function addProgram() {
		if (!$user) {
			goto('/login');
			return;
		}
		if (!$programDetails) return;
		adding = true;
		try {
			await diaryModel.forkProgramFx($programDetails);
			goto('/diary');
		} finally {
			adding = false;
		}
	}

	function formatRest(seconds: number): string {
		if (!seconds) return '—';
		return seconds >= 60 ? `${Math.round(seconds / 60)} мин` : `${seconds} сек`;
	}
</script>

<div class="container narrow">
	{#if $programError}
		<p class="error-text">Программа не найдена.</p>
	{:else if !$programDetails}
		<Loader text="Загружаю…" />
	{:else}
		{@const { program, workouts, exercisesByWorkout } = $programDetails}
		<a href="/programs" class="back mono hit-target"
			><Icon name="chevron-left" size={0.9} /> Все программы</a
		>

		<header class="rise">
			<p class="eyebrow">// программа · {workouts.length} тренир.</p>
			<h1>{program.name}</h1>
			<p class="muted">{program.description}</p>
			{#if program.difficulty}
				<div class="difficulty">
					<span class="mono cap">Сложность</span>
					<DifficultyBar level={program.difficulty} />
				</div>
			{/if}
			<Button onclick={addProgram} disabled={adding}>
				{adding ? 'Добавляю…' : 'Добавить в дневник'}
			</Button>
		</header>

		{#each workouts as workout, i (workout.id)}
			<section class="plate day rise" style="animation-delay: {0.08 + i * 0.06}s">
				<div class="day-head">
					<h2>
						<span class="mono day-num">{String(workout.order_index).padStart(2, '0')}</span>
						{workout.name}
					</h2>
				</div>

				<table>
					<thead>
						<tr class="mono">
							<th>Упражнение</th>
							<th>Подходы</th>
							<th>Повторы</th>
							<th>Отдых</th>
						</tr>
					</thead>
					<tbody>
						{#each exercisesByWorkout[workout.id] ?? [] as item (item.id)}
							<tr>
								<td>
									<a
										href="/exercises/{item.exercise}?ref={page.url.pathname}"
										class="exercise-link"
									>
										{item.expand?.exercise?.name ?? '—'}
									</a>
								</td>
								<td class="mono">{item.target_sets}</td>
								<td class="mono">{formatTargetReps(item)}</td>
								<td class="mono muted">{formatRest(item.rest_seconds)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</section>
		{/each}
	{/if}
</div>

<style>
	.narrow {
		max-width: 820px;
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
		margin-block: 20px 32px;
	}

	h1 {
		font-size: clamp(28px, 4.5vw, 44px);
		margin-block: 12px 14px;
	}

	header p.muted {
		max-width: 620px;
	}

	header :global(.btn) {
		margin-top: 18px;
	}

	.difficulty {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-top: 16px;
	}

	.difficulty .cap {
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: var(--muted);
	}

	.difficulty :global(.bar) {
		width: 90px;
	}

	.day {
		padding: 24px;
		margin-bottom: 16px;
	}

	.day-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		margin-bottom: 18px;
		flex-wrap: wrap;
	}

	.day-head h2 {
		font-size: 17px;
	}

	.day-num {
		color: var(--volt);
		font-size: 14px;
		margin-right: 6px;
	}

	table {
		width: 100%;
		border-collapse: collapse;
	}

	th {
		font-family: var(--font-mono);
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.18em;
		color: var(--muted);
		text-align: left;
		padding: 8px 12px;
		border-bottom: 1px solid var(--line);
		white-space: nowrap;
	}

	td {
		padding: 12px;
		border-bottom: 1px solid var(--line);
		font-size: 14px;
	}

	tr:last-child td {
		border-bottom: none;
	}

	td.mono {
		font-size: 13px;
	}

	.exercise-link:hover {
		color: var(--volt);
	}

	@media (max-width: 600px) {
		.day {
			padding: 16px 14px;
		}

		th,
		td {
			padding-inline: 6px;
		}

		th:nth-child(4),
		td:nth-child(4) {
			display: none;
		}
	}
</style>
