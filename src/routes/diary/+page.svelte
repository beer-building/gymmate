<script lang="ts">
	import { goto } from '$app/navigation';
	import { user } from '$lib/models/auth';
	import {
		createWorkoutFx,
		diaryPageOpened,
		workoutDeleteRequested,
		workouts,
		workoutsLoading
	} from '$lib/models/diary';
	import { formatDate } from '$lib/labels';

	let creating = $state(false);

	$effect(() => {
		if (!$user) {
			goto('/login');
			return;
		}
		diaryPageOpened();
	});

	async function newWorkout() {
		creating = true;
		try {
			const workout = await createWorkoutFx({});
			goto(`/diary/${workout.id}`);
		} finally {
			creating = false;
		}
	}

	function remove(id: string, event: Event) {
		event.preventDefault();
		event.stopPropagation();
		if (confirm('Удалить тренировку вместе со всеми подходами?')) {
			workoutDeleteRequested(id);
		}
	}
</script>

<div class="container narrow">
	<header class="rise">
		<div>
			<p class="eyebrow">// журнал</p>
			<h1>ДНЕВНИК</h1>
		</div>
		<button class="btn" onclick={newWorkout} disabled={creating}>
			{creating ? 'Создаю…' : '+ Новая тренировка'}
		</button>
	</header>

	{#if $workoutsLoading && $workouts.length === 0}
		<p class="muted">Загружаю…</p>
	{:else if $workouts.length === 0}
		<div class="plate empty rise">
			<p class="mono">Пока пусто</p>
			<p class="muted">
				Начни с <a href="/programs">готовой программы</a> или создай тренировку с нуля — и
				записывай каждый подход.
			</p>
		</div>
	{:else}
		<div class="list">
			{#each $workouts as workout, i (workout.id)}
				<a href="/diary/{workout.id}" class="plate row rise" style="animation-delay: {Math.min(i * 0.05, 0.4)}s">
					<div class="date mono">{formatDate(workout.date)}</div>
					<div class="body">
						<h2>{workout.name || 'Тренировка'}</h2>
						{#if workout.notes}
							<p class="muted">{workout.notes}</p>
						{/if}
					</div>
					<button
						class="btn danger sm"
						onclick={(event) => remove(workout.id, event)}
						title="Удалить"
					>
						✕
					</button>
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
		.row {
			grid-template-columns: 1fr auto;
		}

		.date {
			grid-column: 1 / -1;
		}
	}
</style>
