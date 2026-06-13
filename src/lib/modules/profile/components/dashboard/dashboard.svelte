<script lang="ts">
	import { goto } from '$app/navigation';
	import { diaryModel } from '$lib/modules/diary/model';
	import { profileModel } from '../../model';
	import { ActivityHeatmap } from '../activity-heatmap';
	import { ExerciseChart } from '../exercise-chart';
	import { Button } from '$lib/shared/components/button';
	import { Loader } from '$lib/shared/components/loader';
	import { formatDate, formatSetsReps } from '$lib/shared/helpers/labels';

	const dashboard = profileModel.dashboard;

	let starting = $state(false);

	async function startNext() {
		const next = $dashboard?.next;
		if (!next) return;
		starting = true;
		try {
			const log = await diaryModel.startUserWorkoutFx(next.workout);
			goto(`/diary/${log.id}`);
		} finally {
			starting = false;
		}
	}
</script>

{#if !$dashboard}
	<Loader text="Загружаю…" />
{:else}
	{@const data = $dashboard}

	{#if data.activeLog}
		<section class="plate block volt rise">
			<p class="eyebrow">// тренировка идёт</p>
			<h2>{data.activeLog.name_snapshot || 'Тренировка'}</h2>
			<p class="muted">Начата {formatDate(data.activeLog.started_at)} и ещё не завершена.</p>
			<div class="actions">
				<Button href="/diary/{data.activeLog.id}">Продолжить</Button>
			</div>
		</section>
	{:else if data.next}
		<section class="plate block volt rise">
			<p class="eyebrow">// следующая тренировка · {data.next.program.name}</p>
			<h2>{data.next.workout.name}</h2>
			{#if data.next.exercises.length > 0}
				<ul class="preview">
					{#each data.next.exercises.slice(0, 4) as item (item.id)}
						<li>
							<span class="preview-name">{item.expand?.exercise?.name}</span>
							<span class="mono muted">{formatSetsReps(item)}</span>
						</li>
					{/each}
					{#if data.next.exercises.length > 4}
						<li class="mono muted more">ещё {data.next.exercises.length - 4}…</li>
					{/if}
				</ul>
			{/if}
			<div class="actions">
				<Button onclick={startNext} disabled={starting}>
					{starting ? 'Создаю…' : 'Начать тренировку'}
				</Button>
				<Button kind="ghost" href="/diary/workouts/{data.next.workout.id}">Весь план</Button>
			</div>
		</section>
	{:else}
		<section class="plate block empty rise">
			<p class="mono">Плана пока нет</p>
			<p class="muted">
				Добавь <a href="/programs">готовую программу</a> или
				<a href="/diary">собери свою</a> — и здесь появится план на сегодня.
			</p>
		</section>
	{/if}

	<section class="stats rise" style="animation-delay: 0.06s">
		<div class="plate stat">
			<span class="value mono">{data.streakWeeks}</span>
			<span class="label">{data.streakWeeks === 1 ? 'неделя' : 'нед.'} подряд</span>
		</div>
		<div class="plate stat">
			<span class="value mono">{data.workoutsLast30}</span>
			<span class="label">трен. за 30 дней</span>
		</div>
		<div class="plate stat">
			<span class="value mono"
				>{(data.volumeLast7 / 1000).toLocaleString('ru-RU', {
					maximumFractionDigits: 1
				})}<small>т</small></span
			>
			<span class="label">тоннаж за неделю</span>
		</div>
	</section>

	<section class="plate block rise" style="animation-delay: 0.12s">
		<h3 class="mono label">Активность</h3>
		<ActivityHeatmap weeks={data.heatmap} />
	</section>

	{#if data.exerciseSeries.length > 0}
		<section class="plate block rise" style="animation-delay: 0.15s">
			<h3 class="mono label">Прогресс весов</h3>
			<ExerciseChart series={data.exerciseSeries} />
		</section>
	{/if}

	{#if data.records.length > 0}
		<section class="plate block rise" style="animation-delay: 0.18s">
			<h3 class="mono label">Личные рекорды</h3>
			<ul class="records">
				{#each data.records as record (record.name + record.date)}
					<li>
						{#if record.exercise}
							<a href="/exercises/{record.exercise}?ref=/profile" class="record-name"
								>{record.name}</a
							>
						{:else}
							<span class="record-name">{record.name}</span>
						{/if}
						<span class="mono weight"><b>{record.weight}</b> кг × {record.reps}</span>
						<span class="mono muted date">{formatDate(record.date)}</span>
					</li>
				{/each}
			</ul>
		</section>
	{/if}
{/if}

<style>
	.block {
		padding: 22px;
		margin-bottom: 14px;
	}

	/* акцент блока «следующая тренировка» — общий .plate.volt из app.css */

	.block h2 {
		font-size: clamp(20px, 3vw, 28px);
		margin-block: 10px 6px;
		overflow-wrap: anywhere;
	}

	.label {
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.2em;
		color: var(--volt);
		margin-bottom: 16px;
	}

	.preview {
		list-style: none;
		margin: 14px 0 0;
		padding: 0;
	}

	.preview li {
		display: flex;
		justify-content: space-between;
		gap: 14px;
		padding-block: 8px;
		border-bottom: 1px solid var(--line);
		font-size: 14px;
	}

	.preview li:last-child {
		border-bottom: none;
	}

	.preview-name {
		min-width: 0;
		overflow-wrap: anywhere;
	}

	.preview .mono {
		font-size: 12px;
		white-space: nowrap;
	}

	.preview .more {
		font-size: 12px;
	}

	.actions {
		display: flex;
		gap: 10px;
		flex-wrap: wrap;
		margin-top: 18px;
	}

	.empty {
		padding: 32px 24px;
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

	.stats {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 14px;
		margin-bottom: 14px;
	}

	.stat {
		padding: 18px 20px;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.stat .value {
		font-size: 28px;
		font-weight: 700;
		color: var(--volt);
		line-height: 1.1;
	}

	.stat .value small {
		font-size: 15px;
		margin-left: 2px;
	}

	.stat .label {
		font-family: var(--font-mono);
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: var(--muted);
		margin: 0;
	}

	.records {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.records li {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto auto;
		align-items: baseline;
		gap: 6px 16px;
		padding-block: 9px;
		border-bottom: 1px solid var(--line);
		font-size: 14px;
	}

	.records li:last-child {
		border-bottom: none;
	}

	.record-name {
		min-width: 0;
		overflow-wrap: anywhere;
	}

	a.record-name:hover {
		color: var(--volt);
	}

	.records .weight {
		font-size: 13px;
		white-space: nowrap;
	}

	.records .weight b {
		color: var(--volt);
		font-weight: 600;
	}

	.records .date {
		font-size: 11px;
		white-space: nowrap;
	}

	@media (max-width: 600px) {
		.block {
			padding: 16px 14px;
		}

		.stats {
			gap: 8px;
		}

		.stat {
			padding: 12px 12px;
		}

		.stat .value {
			font-size: 22px;
		}

		/* рекорды: название во всю ширину, вес и дата — вторым рядом */
		.records li {
			grid-template-columns: minmax(0, 1fr) auto;
		}

		.record-name {
			grid-column: 1 / -1;
		}

		.records .date {
			justify-self: end;
		}
	}
</style>
