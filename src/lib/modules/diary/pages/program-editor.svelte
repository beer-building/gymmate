<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { userProgramModel } from '../model';
	import { authModel } from '$lib/modules/auth/model';
	import { ExerciseSelect } from '$lib/modules/exercises/components/exercise-select';
	import { Input } from '$lib/shared/components/input';
	import { Icon } from '$lib/shared/components/icon';
	import { Button } from '$lib/shared/components/button';
	import type { UserProgramWorkoutExercise } from '$lib/shared/types';

	const user = authModel.user;
	const catalog = userProgramModel.catalog;
	const editorError = userProgramModel.editorError;
	const editorExercises = userProgramModel.editorExercises;
	const editorProgram = userProgramModel.editorProgram;
	const editorWorkouts = userProgramModel.editorWorkouts;

	let pendingExercise = $state<Record<string, string>>({});

	$effect(() => {
		if (!$user) {
			goto('/login');
			return;
		}
		userProgramModel.editorOpened(page.params.id!);
	});

	const exercisesByWorkout = $derived.by(() => {
		const groups: Record<string, UserProgramWorkoutExercise[]> = {};
		for (const item of $editorExercises) {
			(groups[item.user_program_workout] ??= []).push(item);
		}
		return groups;
	});

	// подписи и атрибуты числовых полей упражнения
	const numberFields: {
		field: keyof UserProgramWorkoutExercise;
		label: string;
		min: number;
		step?: number;
	}[] = [
		{ field: 'target_sets', label: 'Подходы', min: 1 },
		{ field: 'target_reps_min', label: 'Повт. от', min: 0 },
		{ field: 'target_reps_max', label: 'Повт. до', min: 0 },
		{ field: 'target_weight', label: 'Вес, кг', min: 0, step: 0.5 },
		{ field: 'rest_seconds', label: 'Отдых, с', min: 0, step: 15 }
	];

	function renameProgram(event: FocusEvent) {
		const name = (event.currentTarget as HTMLInputElement).value.trim();
		if (name && name !== $editorProgram?.name) userProgramModel.programChanged({ name });
	}

	function renameWorkout(id: string, event: FocusEvent) {
		const name = (event.currentTarget as HTMLInputElement).value.trim();
		if (name) userProgramModel.workoutChanged({ id, data: { name } });
	}

	function removeWorkout(id: string) {
		if (confirm('Удалить тренировку из программы вместе с упражнениями?')) {
			userProgramModel.workoutRemoved(id);
		}
	}

	function changeNumber(id: string, field: keyof UserProgramWorkoutExercise, event: Event) {
		const raw = (event.currentTarget as HTMLInputElement).value;
		const value = raw === '' ? 0 : Math.max(0, Number(raw));
		userProgramModel.exerciseChanged({ id, data: { [field]: value } });
	}

	function addExercise(workoutId: string) {
		const exerciseId = pendingExercise[workoutId];
		if (!exerciseId) return;
		userProgramModel.exerciseAdded({ workoutId, exerciseId });
		pendingExercise[workoutId] = '';
	}
</script>

<div class="container narrow">
	{#if $editorError}
		<p class="error-text">Программа не найдена.</p>
	{:else if !$editorProgram}
		<p class="muted">Загружаю…</p>
	{:else}
		<a href="/diary" class="back mono"><Icon name="chevron-left" size={0.75} /> Дневник</a>

		<header class="rise">
			<p class="eyebrow">// моя программа</p>
			<Input kind="ghost" size="lg" value={$editorProgram.name} onblur={renameProgram} />
		</header>

		{#each $editorWorkouts as workout, i (workout.id)}
			<section class="plate block rise" style="animation-delay: {0.06 + i * 0.05}s">
				<div class="workout-head">
					<span class="mono num">{String(workout.order_index).padStart(2, '0')}</span>
					<Input
						kind="ghost"
						value={workout.name}
						onblur={(event) => renameWorkout(workout.id, event)}
					/>
					<Button
						kind="icon"
						class="x"
						onclick={() => removeWorkout(workout.id)}
						title="Удалить тренировку"
						aria-label="Удалить тренировку"
					>
						<Icon name="trash" />
					</Button>
				</div>

				{#if (exercisesByWorkout[workout.id] ?? []).length > 0}
					<ul class="exercises">
						{#each exercisesByWorkout[workout.id] ?? [] as item (item.id)}
							<li class="exercise">
								<div class="exercise-name">
									<a href="/exercises/{item.exercise}" class="exercise-link">
										{item.expand?.exercise?.name ?? '—'}
									</a>
								</div>
								<div class="exercise-fields">
									{#each numberFields as { field, label, min, step } (field)}
										<label class="mini-field">
											<span class="mono">{label}</span>
											<Input
												size="sm"
												type="number"
												{min}
												{step}
												value={item[field] || ''}
												placeholder="—"
												onchange={(event) => changeNumber(item.id, field, event)}
											/>
										</label>
									{/each}
								</div>
								<Button
									kind="icon"
									class="remove"
									onclick={() => userProgramModel.exerciseRemoved(item.id)}
									title="Убрать упражнение"
									aria-label="Убрать упражнение"
								>
									<Icon name="trash" />
								</Button>
							</li>
						{/each}
					</ul>
				{/if}

				<div class="add-exercise">
					<ExerciseSelect
						size="sm"
						exercises={$catalog}
						placeholder="Добавить упражнение…"
						bind:value={
							() => pendingExercise[workout.id] ?? '', (id) => (pendingExercise[workout.id] = id)
						}
					/>
					<Button
						kind="ghost"
						size="sm"
						onclick={() => addExercise(workout.id)}
						disabled={!pendingExercise[workout.id]}
					>
						Добавить
					</Button>
				</div>
			</section>
		{/each}

		<Button class="rise" onclick={() => userProgramModel.workoutAdded()}>
			+ Добавить тренировку
		</Button>
	{/if}
</div>

<style>
	.narrow {
		max-width: 900px;
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

	.block {
		padding: 22px;
		margin-bottom: 14px;
	}

	.workout-head {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-bottom: 14px;
	}

	.workout-head .num,
	.workout-head :global(.x) {
		flex-shrink: 0;
	}

	.workout-head .num {
		color: var(--volt);
		font-size: 13px;
	}

	.exercises {
		list-style: none;
		margin: 0 0 14px;
		padding: 0;
	}

	/* десктоп: название | пять подписанных полей | удалить — в одну строку */
	.exercise {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto auto;
		grid-template-areas: 'name fields remove';
		align-items: center;
		gap: 8px 14px;
		padding-block: 10px;
		border-bottom: 1px solid var(--line);
	}

	.exercise:last-child {
		border-bottom: none;
	}

	.exercise-name {
		grid-area: name;
		min-width: 0;
		font-size: 14px;
		overflow-wrap: anywhere;
	}

	.exercise-link:hover {
		color: var(--volt);
	}

	.exercise-fields {
		grid-area: fields;
		display: flex;
		gap: 8px;
	}

	.exercise :global(.remove) {
		grid-area: remove;
	}

	/* у каждого инпута — своя подпись, что именно редактируется */
	.mini-field {
		display: flex;
		flex-direction: column;
		gap: 4px;
		width: 72px;
	}

	.mini-field span {
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--muted);
		white-space: nowrap;
	}

	.add-exercise {
		display: flex;
		gap: 10px;
		align-items: center;
	}

	.add-exercise :global(.btn) {
		flex-shrink: 0;
	}

	@media (max-width: 720px) {
		.block {
			padding: 16px 14px;
		}

		/* мобильный: название + удалить, ниже — поля с подписями */
		.exercise {
			grid-template-columns: minmax(0, 1fr) auto;
			grid-template-areas:
				'name remove'
				'fields fields';
		}

		.exercise-fields {
			display: grid;
			grid-template-columns: repeat(auto-fit, minmax(84px, 1fr));
		}

		.mini-field {
			width: auto;
		}
	}
</style>
