<script lang="ts">
	import { page } from '$app/state';
	import { exercisesModel } from '../model';
	import { authModel } from '$lib/modules/auth/model';
	import { MuscleMap } from '../components/muscle-map';
	import { Icon } from '$lib/shared/components/icon';
	import { Loader } from '$lib/shared/components/loader';
	import { RichText } from '$lib/shared/components/rich-text';
	import {
		muscleGroupLabels,
		muscleColor,
		equipmentLabels,
		difficultyLabels
	} from '$lib/shared/helpers/labels';

	const currentExercise = exercisesModel.currentExercise;
	const exerciseError = exercisesModel.exerciseError;
	const similar = exercisesModel.similarExercises;
	const gender = authModel.gender;

	$effect(() => {
		exercisesModel.exercisePageOpened(page.params.id!);
	});

	const backRef = $derived(page.url.searchParams.get('ref'));

	function youtubeEmbed(url: string): string | null {
		const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{6,})/);
		return match ? `https://www.youtube.com/embed/${match[1]}` : null;
	}
</script>

<div class="container narrow">
	{#if $exerciseError}
		<p class="error-text">Упражнение не найдено.</p>
	{:else if !$currentExercise}
		<Loader text="Загружаю…" />
	{:else}
		{@const item = $currentExercise}
		{#if backRef}
			<a href={backRef} class="back mono hit-target"
				><Icon name="chevron-left" size={0.9} /> Назад</a
			>
		{:else}
			<a href="/exercises" class="back mono hit-target"
				><Icon name="chevron-left" size={0.9} /> Все упражнения</a
			>
		{/if}

		<header class="rise">
			<div class="head-text">
				<p class="groups">
					{#each item.primary_muscles as m (m)}
						<span class="tag pill" style="--tag-color: {muscleColor(m)}"
							>{muscleGroupLabels[m]}</span
						>
					{/each}
				</p>
				<h1>{item.name}</h1>
				<div class="chips">
					<span class="chip static">{equipmentLabels[item.equipment]}</span>
					<span class="chip static">{difficultyLabels[item.difficulty]}</span>
				</div>
			</div>
			<div class="head-map">
				<MuscleMap
					variant={$gender}
					highlighted={item.primary_muscles}
					secondary={item.secondary_muscles}
				/>
			</div>
		</header>

		{#if item.instructions}
			<section class="plate block volt rise" style="animation-delay: 0.08s">
				<h2 class="mono">Техника выполнения</h2>
				<RichText html={item.instructions} />
			</section>
		{/if}

		{#if item.videos?.length}
			<section class="plate block rise" style="animation-delay: 0.2s">
				<h2 class="mono">Видео</h2>
				<div class="videos">
					{#each item.videos as video (video)}
						{@const embed = youtubeEmbed(video)}
						{#if embed}
							<iframe
								src={embed}
								title="Видео: {item.name}"
								loading="lazy"
								frameborder="0"
								allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
								allowfullscreen
							></iframe>
						{:else}
							<!-- svelte-ignore a11y_media_has_caption -->
							<video src={video} controls preload="metadata"></video>
						{/if}
					{/each}
				</div>
			</section>
		{/if}

		{#if $similar.length}
			<section class="similar-section rise" style="animation-delay: 0.28s">
				<h2 class="mono">Похожие упражнения</h2>
				<div class="similar">
					{#each $similar as ex (ex.id)}
						<a href="/exercises/{ex.id}?ref={page.url.pathname}" class="sim-card plate">
							<span class="sim-group">
								{#each ex.primary_muscles as m (m)}
									<span class="tag pill sm" style="--tag-color: {muscleColor(m)}"
										>{muscleGroupLabels[m]}</span
									>
								{/each}
							</span>
							<span class="sim-name">{ex.name}</span>
							<span class="sim-meta mono"
								>{equipmentLabels[ex.equipment]} · {difficultyLabels[ex.difficulty]}</span
							>
						</a>
					{/each}
				</div>
			</section>
		{/if}
	{/if}
</div>

<style>
	.narrow {
		max-width: 720px;
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
		margin-block: 20px 28px;
		display: grid;
		grid-template-columns: 1fr 220px;
		gap: 24px;
		align-items: center;
	}

	h1 {
		font-size: clamp(28px, 4.5vw, 44px);
		margin-block: 12px 18px;
	}

	.groups {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin: 0;
	}

	@media (max-width: 640px) {
		header {
			grid-template-columns: 1fr;
		}

		.head-map {
			max-width: 280px;
		}
	}

	.chips {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
	}

	.chip.static {
		cursor: default;
		color: var(--color-text);
	}

	.block {
		padding: 24px;
		margin-bottom: 14px;
	}

	.block h2 {
		font-family: var(--font-mono);
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.2em;
		color: var(--color-muted);
		margin-bottom: 12px;
	}

	/* акцентная рамка и заливка — общий .plate.volt из app.css */

	.block.volt h2 {
		color: var(--color-accent);
	}

	.videos {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 12px;
	}

	.videos iframe,
	.videos video {
		width: 100%;
		aspect-ratio: 16 / 9;
		border: 1px solid var(--color-border);
		border-radius: var(--border-radius);
		background: var(--color-sunken);
	}

	@media (max-width: 560px) {
		.block {
			padding: 16px 14px;
		}

		.videos {
			grid-template-columns: 1fr;
		}
	}

	.similar-section {
		margin-bottom: 14px;
	}

	.similar-section h2 {
		font-family: var(--font-mono);
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.2em;
		color: var(--color-muted);
		margin-bottom: 12px;
	}

	.similar {
		display: flex;
		gap: 12px;
		overflow-x: auto;
		scroll-snap-type: x proximity;
		-webkit-overflow-scrolling: touch;
		/* запас сверху под подъём карточки при hover (translateY) — иначе обрезается;
		   снизу без padding, чтобы скроллбар был вровень с низом контейнера */
		padding-top: 6px;
	}

	.sim-card {
		flex: 0 0 220px;
		scroll-snap-align: start;
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding: 14px;
		text-decoration: none;
	}

	.sim-group {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	.sim-name {
		font-size: 15px;
		font-weight: 600;
		color: var(--color-text);
	}

	.sim-meta {
		font-size: 11px;
		color: var(--color-muted);
		margin-top: auto;
	}

	@media (max-width: 640px) {
		/* скролл во всю ширину экрана (за padding контейнера);
		   snap прилипает с отступом 16px слева — первая карточка не липнет к краю */
		.similar {
			margin: 0 -15px;
			padding-bottom: 16px;
			scroll-padding-left: 16px;
		}
	}
</style>
