<script lang="ts">
	import { programsModel } from '../model';
	import { goalLabels } from '$lib/shared/helpers/labels';

	const programs = programsModel.programs;
	const programsError = programsModel.programsError;
	const programsLoading = programsModel.programsLoading;
	const programWorkoutCounts = programsModel.programWorkoutCounts;

	$effect(() => {
		programsModel.programsPageOpened();
	});
</script>

<div class="container">
	<header class="rise">
		<p class="eyebrow">// комплексы</p>
		<h1>ПРОГРАММЫ</h1>
		<p class="muted lead">
			Готовые планы под цель: выбирай, открывай нужный день и иди тренироваться.
		</p>
	</header>

	{#if $programsError}
		<p class="error-text">Не удалось загрузить программы. Проверь, что бэкенд запущен.</p>
	{:else if $programsLoading && $programs.length === 0}
		<p class="muted">Загружаю…</p>
	{:else}
		<div class="list">
			{#each $programs as program, i (program.id)}
				<a
					href="/programs/{program.id}"
					class="plate row rise"
					style="animation-delay: {i * 0.08}s"
				>
					<div class="goal">
						<span class="mono">
							{program.creator ? 'Моя' : program.goal ? goalLabels[program.goal] : 'Программа'}
						</span>
					</div>
					<div class="body">
						<h2>{program.name}</h2>
						<p class="muted">{program.description}</p>
					</div>
					<div class="facts mono">
						<span class="num">{$programWorkoutCounts[program.id] ?? 0}</span>
						<span class="cap">тренир.</span>
					</div>
				</a>
			{/each}
		</div>
	{/if}
</div>

<style>
	header {
		margin-bottom: 32px;
	}

	h1 {
		font-size: clamp(34px, 5vw, 56px);
		margin-block: 12px;
	}

	.lead {
		max-width: 520px;
	}

	.list {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.row {
		display: grid;
		grid-template-columns: 120px 1fr 110px;
		gap: 24px;
		padding: 26px;
		align-items: center;
	}

	.goal .mono {
		display: inline-block;
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: var(--bg);
		background: var(--volt);
		padding: 6px 10px;
		border-radius: var(--border-radius);
	}

	.body h2 {
		font-size: 19px;
		margin-bottom: 8px;
	}

	.body p {
		margin: 0;
		font-size: 14px;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.facts {
		text-align: right;
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 2px;
	}

	.num {
		font-size: 34px;
		font-weight: 600;
		color: var(--volt);
		line-height: 1;
	}

	.cap {
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 0.2em;
		color: var(--muted);
	}

	@media (max-width: 720px) {
		.row {
			grid-template-columns: 1fr;
			gap: 14px;
			padding: 18px 16px;
		}

		.facts {
			flex-direction: row;
			align-items: baseline;
			gap: 10px;
		}
	}
</style>
