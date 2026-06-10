<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { user } from '$lib/models/auth';
	import { programDetails, programError, programPageOpened } from '$lib/models/programs';
	import { createWorkoutFx } from '$lib/models/diary';
	import { goalLabels, difficultyLabels } from '$lib/labels';
	import type { ProgramDay } from '$lib/types';

	let starting = $state<string | null>(null);

	$effect(() => {
		programPageOpened(page.params.id!);
	});

	async function startWorkout(day: ProgramDay) {
		if (!$user) {
			goto('/login');
			return;
		}
		starting = day.id;
		try {
			const workout = await createWorkoutFx({ name: day.name, programDay: day.id });
			goto(`/diary/${workout.id}`);
		} finally {
			starting = null;
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
		<p class="muted">Загружаю…</p>
	{:else}
		{@const { program, days, exercisesByDay } = $programDetails}
		<a href="/programs" class="back mono">← Все программы</a>

		<header class="rise">
			<p class="eyebrow">// {goalLabels[program.goal]} · {difficultyLabels[program.level]}</p>
			<h1>{program.name}</h1>
			<p class="muted">{program.description}</p>
		</header>

		{#each days as day, i (day.id)}
			<section class="plate day rise" style="animation-delay: {0.08 + i * 0.06}s">
				<div class="day-head">
					<h2>
						<span class="mono day-num">{String(day.day_order).padStart(2, '0')}</span>
						{day.name}
					</h2>
					<button class="btn sm" onclick={() => startWorkout(day)} disabled={starting === day.id}>
						{starting === day.id ? 'Создаю…' : 'Начать тренировку'}
					</button>
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
						{#each exercisesByDay[day.id] ?? [] as item (item.id)}
							<tr>
								<td>
									<a href="/exercises/{item.exercise}" class="exercise-link">
										{item.expand?.exercise?.name ?? '—'}
									</a>
								</td>
								<td class="mono">{item.sets}</td>
								<td class="mono">{item.reps}</td>
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
		th:nth-child(4),
		td:nth-child(4) {
			display: none;
		}
	}
</style>
