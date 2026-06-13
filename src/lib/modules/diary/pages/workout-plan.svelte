<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { diaryModel } from '../model';
	import { authModel } from '$lib/modules/auth/model';
	import { formatTargetReps, plural } from '$lib/shared/helpers/labels';
	import { Loader } from '$lib/shared/components/loader';
	import { Icon } from '$lib/shared/components/icon';
	import { Button } from '$lib/shared/components/button';

	const user = authModel.user;

	$effect(() => {
		if (!$user) {
			goto('/login');
			return;
		}
		diaryModel.workoutPlanPageOpened(page.params.id!);
	});

	const workout = diaryModel.currentWorkoutPlan;
	const exercises = diaryModel.workoutPlanExercises;
	const loading = diaryModel.workoutPlanLoading;
	const error = diaryModel.workoutPlanError;

	let starting = $state(false);
	let startError = $state('');

	// страница плана не должна быть тупиком: отсюда тренировку можно начать
	async function start() {
		if (!$workout) return;
		starting = true;
		startError = '';
		try {
			const log = await diaryModel.startUserWorkoutFx($workout);
			goto(`/diary/${log.id}`);
		} catch {
			startError = 'Не удалось начать тренировку — проверь соединение и попробуй ещё раз.';
		} finally {
			starting = false;
		}
	}
</script>

<div class="container narrow">
	{#if $error}
		<p class="error-text">Тренировка не найдена.</p>
	{:else if !$workout && $loading}
		<Loader text="Загружаю…" />
	{:else if $workout}
		<a href="/diary" class="back mono hit-target"><Icon name="chevron-left" size={0.9} /> Дневник</a
		>

		<header class="rise">
			<h1>{$workout.name}</h1>
			<p class="mono muted count">
				{$exercises.length > 0
					? `${$exercises.length} ${plural($exercises.length, ['упражнение', 'упражнения', 'упражнений'])}`
					: 'Упражнений пока нет'}
			</p>
			<div class="plan-actions">
				<Button onclick={start} disabled={starting}>
					{starting ? 'Создаю…' : 'Начать тренировку'}
				</Button>
				<Button kind="ghost" href="/diary/programs/{$workout.user_program}">Изменить план</Button>
			</div>
			{#if startError}
				<p class="error-text plan-error" role="alert">{startError}</p>
			{/if}
		</header>

		{#if $exercises.length > 0}
			<section class="plate block rise" style="animation-delay: 0.06s">
				<ul class="exercises">
					{#each $exercises as item (item.id)}
						{@const reps = formatTargetReps(item)}
						<li class="exercise">
							<div class="exercise-head">
								<span class="mono num">{String(item.order_index + 1).padStart(2, '0')}</span>
								<a href="/exercises/{item.exercise}?ref={page.url.pathname}" class="exercise-link">
									{item.expand?.exercise?.name ?? '—'}
								</a>
							</div>
							<div class="exercise-meta mono">
								<span class="tag"
									>{item.target_sets}
									{plural(item.target_sets, ['подход', 'подхода', 'подходов'])}</span
								>
								{#if reps !== '—'}
									<span class="tag muted">{reps} повт.</span>
								{/if}
								{#if item.target_weight}
									<span class="tag muted">{item.target_weight} кг</span>
								{/if}
								{#if item.rest_seconds}
									<span class="tag muted">отдых {item.rest_seconds} с</span>
								{/if}
							</div>
							{#if item.notes}
								<p class="notes muted">{item.notes}</p>
							{/if}
						</li>
					{/each}
				</ul>
			</section>
		{/if}
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
		margin-block: 12px 12px;
		overflow-wrap: anywhere;
	}

	.count {
		font-size: 12px;
	}

	.plan-actions {
		display: flex;
		gap: 10px;
		flex-wrap: wrap;
		margin-top: 18px;
	}

	.plan-error {
		margin: 12px 0 0;
	}

	.block {
		padding: 22px;
		margin-bottom: 14px;
	}

	.exercises {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.exercise {
		padding-block: 14px;
		border-bottom: 1px solid var(--line);
	}

	.exercise:last-child {
		border-bottom: none;
	}

	.exercise-head {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-bottom: 8px;
	}

	.num {
		color: var(--volt);
		font-size: 12px;
		flex-shrink: 0;
	}

	.exercise-link {
		font-size: 16px;
		font-weight: 500;
		min-width: 0;
		overflow-wrap: anywhere;
	}

	.exercise-link:hover {
		color: var(--volt);
	}

	.exercise-meta {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		font-size: 12px;
	}

	.tag {
		background: var(--bg-sunken);
		border: 1px solid var(--line);
		border-radius: var(--border-radius);
		padding: 2px 8px;
	}

	.notes {
		font-size: 13px;
		margin: 8px 0 0;
	}

	@media (max-width: 560px) {
		.block {
			padding: 16px 14px;
		}

		.exercise {
			padding-block: 12px;
		}
	}
</style>
