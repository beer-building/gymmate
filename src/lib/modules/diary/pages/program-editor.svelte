<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { userProgramModel } from '../model';
	import { downloadProgramFile, serializeProgram } from '../helpers/program-transfer';
	import { authModel } from '$lib/modules/auth/model';
	import { ExerciseSelect } from '$lib/modules/exercises/components/exercise-select';
	import { findSimilarExercises } from '$lib/modules/exercises/helpers/find-similar';
	import { Input } from '$lib/shared/components/input';
	import { Icon } from '$lib/shared/components/icon';
	import { Button } from '$lib/shared/components/button';
	import { Loader } from '$lib/shared/components/loader';
	import type { UserProgramWorkoutExercise } from '$lib/shared/types';
	import { SortableList, sortItems } from '@rodrigodagostino/svelte-sortable-list';
	import '@rodrigodagostino/svelte-sortable-list/styles.css';

	const user = authModel.user;
	const catalog = userProgramModel.catalog;
	const editorError = userProgramModel.editorError;
	const editorExercises = userProgramModel.editorExercises;
	const editorProgram = userProgramModel.editorProgram;
	const editorWorkouts = userProgramModel.editorWorkouts;

	// drag&drop-перетаскивание уважает системную настройку: при reduce — без анимаций (SPA, ssr=false)
	const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
		for (const id in groups) groups[id].sort((a, b) => a.order_index - b.order_index);
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

	function changeNotes(id: string, event: Event) {
		const value = (event.currentTarget as HTMLTextAreaElement).value.trim();
		userProgramModel.exerciseChanged({ id, data: { notes: value } });
	}

	function exportProgram() {
		if (!$editorProgram) return;
		downloadProgramFile(serializeProgram($editorProgram, $editorWorkouts, $editorExercises));
	}

	function addExercise(workoutId: string) {
		const exerciseId = pendingExercise[workoutId];
		if (!exerciseId) return;
		userProgramModel.exerciseAdded({ workoutId, exerciseId });
		pendingExercise[workoutId] = '';
	}

	// похожие упражнения для замены — по группам мышц текущего, из загруженного каталога
	function similarFor(item: UserProgramWorkoutExercise) {
		const current = item.expand?.exercise;
		if (!current) return [];
		// в пределах своего kind: растяжку не предлагаем заменить на силовое
		return findSimilarExercises(
			current,
			$catalog.filter((exercise) => exercise.kind === current.kind)
		);
	}

	function replaceExercise(item: UserProgramWorkoutExercise, exerciseId: string) {
		if (!exerciseId || exerciseId === item.exercise) return;
		// меняем только упражнение — целевые подходы/повторы/вес сохраняются
		userProgramModel.exerciseChanged({ id: item.id, data: { exercise: exerciseId } });
	}

	function reorderExercises(workoutId: string, event: SortableList.RootEvents['ondragend']) {
		const { draggedItemIndex, targetItemIndex, isCanceled } = event;
		if (isCanceled || targetItemIndex === null || draggedItemIndex === targetItemIndex) return;
		const ordered = sortItems(
			exercisesByWorkout[workoutId] ?? [],
			draggedItemIndex,
			targetItemIndex
		);
		userProgramModel.exercisesReordered({ workoutId, orderedIds: ordered.map((item) => item.id) });
	}

	// iOS Safari отменяет скролл страницы, если на pointerdown вызвать preventDefault() —
	// а библиотека делает это на теле карточки (гасит фокус). В итоге список нельзя
	// проскроллить пальцем по карточке (Chrome такой preventDefault для скролла игнорирует,
	// потому там и так работает; контролы скроллятся всегда — на них библиотека preventDefault
	// не зовёт). Вешаем на секцию capture-листенер (срабатывает раньше обработчика библиотеки
	// на .ssl-root) и делаем preventDefault no-op для тела карточек — кроме ручки, где он
	// нужен, чтобы стартовал drag.
	function iosScrollFix(node: HTMLElement) {
		const onPointerDown = (event: PointerEvent) => {
			const target = event.target as HTMLElement;
			if (!target.closest('.ssl-item') || target.closest('.ssl-item-handle')) return;
			event.preventDefault = () => {};
		};
		node.addEventListener('pointerdown', onPointerDown, { capture: true });
		return {
			destroy: () => node.removeEventListener('pointerdown', onPointerDown, { capture: true })
		};
	}
</script>

<div class="container narrow">
	{#if $editorError}
		<p class="error-text">Программа не найдена.</p>
	{:else if !$editorProgram}
		<Loader text="Загружаю…" />
	{:else}
		<a href="/diary" class="back mono hit-target"><Icon name="chevron-left" size={0.9} /> Дневник</a
		>

		<header class="rise">
			<div class="header-row">
				<p class="eyebrow">// моя программа</p>
				<Button
					kind="ghost"
					size="sm"
					onclick={exportProgram}
					title="Скачать JSON, чтобы поделиться"
				>
					Экспорт
				</Button>
			</div>
			<Input
				kind="ghost"
				size="lg"
				value={$editorProgram.name}
				aria-label="Название программы"
				onblur={renameProgram}
			/>
		</header>

		{#each $editorWorkouts as workout, i (workout.id)}
			<section
				class="plate block rise"
				style="animation-delay: {0.06 + i * 0.05}s"
				use:iosScrollFix
			>
				<div class="workout-head">
					<span class="mono num">{String(workout.order_index).padStart(2, '0')}</span>
					<Input
						kind="ghost"
						value={workout.name}
						aria-label="Название тренировки"
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
					<SortableList.Root
						gap={0}
						transition={{ duration: reducedMotion ? 0 : 200 }}
						ondragend={(event) => reorderExercises(workout.id, event)}
					>
						{#each exercisesByWorkout[workout.id] ?? [] as item, index (item.id)}
							{@const similar = similarFor(item)}
							<SortableList.Item id={item.id} {index}>
								<div class="exercise">
									<div class="exercise-name">
										<a
											href="/exercises/{item.exercise}?ref={page.url.pathname}"
											class="exercise-link"
										>
											{item.expand?.exercise?.name ?? '—'}
										</a>
									</div>
									<div class="exercise-fields">
										{#if (item.expand?.exercise?.kind ?? 'strength') === 'strength'}
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
										{:else}
											<label class="mini-field">
												<span class="mono">Время, с</span>
												<Input
													size="sm"
													type="number"
													min={0}
													step={15}
													value={item.target_duration_seconds || ''}
													placeholder="—"
													onchange={(event) =>
														changeNumber(item.id, 'target_duration_seconds', event)}
												/>
											</label>
										{/if}
									</div>
									<textarea
										class="notes-input"
										rows="2"
										placeholder="Заметки к упражнению…"
										aria-label="Заметки к упражнению"
										onblur={(event) => changeNotes(item.id, event)}>{item.notes}</textarea
									>
									<div class="exercise-actions">
										{#if similar.length > 0}
											<!-- прозрачный нативный select поверх иконки: тап сразу открывает пикер -->
											<div class="replace-control" title="Заменить на похожее упражнение">
												<Icon name="replace" />
												<ExerciseSelect
													size="sm"
													exercises={similar}
													placeholder="Заменить на похожее…"
													aria-label="Заменить упражнение"
													bind:value={() => '', (id) => replaceExercise(item, id)}
												/>
											</div>
										{/if}
										<Button
											kind="icon"
											class="remove"
											onclick={() => userProgramModel.exerciseRemoved(item.id)}
											title="Убрать упражнение"
											aria-label="Убрать упражнение"
										>
											<Icon name="trash" />
										</Button>
										<SortableList.ItemHandle />
									</div>
								</div>
							</SortableList.Item>
						{/each}
					</SortableList.Root>
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
			<Icon name="plus" size={1} />
			Добавить тренировку
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
		color: var(--color-muted);
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}

	.back:hover {
		color: var(--color-accent);
	}

	header {
		margin-block: 20px 24px;
	}

	.header-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
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
		color: var(--color-accent);
		font-size: 13px;
	}

	/* .block повышает специфичность, чтобы перебить штатные стили библиотеки на .ssl-root */
	.block :global(.ssl-root) {
		list-style: none;
		margin: 0 0 14px;
		padding: 0;
		/* библиотека глушит touch-action на всём списке — возвращаем вертикальный скролл
		   телу карточек; перетаскивание остаётся за ручкой (у неё свой touch-action: none) */
		touch-action: pan-y;
	}

	/* десктоп: название | пять подписанных полей | действия (с ручкой) — в одну строку */
	.exercise {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto auto;
		grid-template-areas:
			'name fields actions'
			'notes notes notes';
		align-items: center;
		gap: 8px 14px;
		padding-block: 10px;
		border-bottom: 1px solid var(--color-border);
	}

	:global(.ssl-item:last-child) .exercise {
		border-bottom: none;
	}

	/* drag-ручка (грип из 6 точек) в ряду действий рядом с корзиной: тянуть только за неё */
	.exercise-actions :global(.ssl-item-handle) {
		align-self: stretch;
		display: flex;
		align-items: center;
		justify-content: center;
		margin: 0;
		padding-inline: 6px;
		color: var(--color-muted);
		cursor: grab;
	}

	.exercise :global(.ssl-item-handle:hover) {
		color: var(--color-text);
	}

	/* «призрак» при перетаскивании — приподнятая карточка с тенью (как в Customize Columns).
	   ponytail: завязка на data-атрибуты библиотеки (на них же построены её штатные стили) */
	:global(.ssl-item[data-is-ghost='true']) .exercise {
		background: var(--color-surface);
		border-bottom: none;
		border-radius: var(--border-radius);
		box-shadow:
			0 12px 28px -8px rgb(0 0 0 / 0.3),
			0 0 0 1px var(--color-border);
	}

	/* исходное место — приглушённый пустой слот, пока призрак тащат указателем */
	:global(.ssl-item[data-is-ghost='false'][data-drag-state*='ptr-drag']) .exercise {
		opacity: 0.35;
	}

	.exercise-name {
		grid-area: name;
		min-width: 0;
		font-size: 14px;
		overflow-wrap: anywhere;
	}

	.exercise-link:hover {
		color: var(--color-accent);
	}

	.exercise-fields {
		grid-area: fields;
		display: flex;
		gap: 8px;
	}

	.exercise-actions {
		grid-area: actions;
		display: flex;
		align-items: center;
		gap: 6px;
	}

	/* «заменить»: иконка-подложка + невидимый нативный select сверху на всю кнопку */
	.replace-control {
		position: relative;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		border-radius: var(--border-radius);
		color: var(--color-muted);
		flex-shrink: 0;
	}

	.replace-control:hover {
		background: oklch(from var(--color-accent) l c h / 0.14);
		color: var(--color-accent);
	}

	.replace-control :global(.select) {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		margin: 0;
		padding: 0;
		border: none;
		background: none;
		opacity: 0;
		cursor: pointer;
	}

	/* touch: зона тапа ≥44px без роста визуала (как у icon-кнопок) */
	@media (pointer: coarse) {
		.replace-control :global(.select) {
			width: max(100%, 2.75rem);
			height: max(100%, 2.75rem);
			inset: 50% auto auto 50%;
			transform: translate(-50%, -50%);
		}
	}

	.notes-input {
		grid-area: notes;
		font: inherit;
		font-size: 13px;
		background: var(--color-sunken);
		border: 1px solid var(--color-border);
		border-radius: var(--border-radius);
		padding: 8px 10px;
		resize: vertical;
		width: 100%;
		box-sizing: border-box;
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
		color: var(--color-muted);
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

		/* мобильный: название + действия (с ручкой) сверху, ниже — поля с подписями */
		.exercise {
			grid-template-columns: minmax(0, 1fr) auto;
			grid-template-areas:
				'name actions'
				'fields fields'
				'notes notes';
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
