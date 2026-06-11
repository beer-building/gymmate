<script lang="ts">
	import { page } from '$app/state';
	import { exercisesModel } from '../model';
	import { authModel } from '$lib/modules/auth/model';
	import { MuscleMap } from '../components/muscle-map';
	import { Icon } from '$lib/shared/components/icon';
	import { RichText } from '$lib/shared/components/rich-text';
	import { muscleGroupLabels, equipmentLabels, difficultyLabels } from '$lib/shared/helpers/labels';

	const currentExercise = exercisesModel.currentExercise;
	const exerciseError = exercisesModel.exerciseError;
	const gender = authModel.gender;

	$effect(() => {
		exercisesModel.exercisePageOpened(page.params.id!);
	});

	function youtubeEmbed(url: string): string | null {
		const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{6,})/);
		return match ? `https://www.youtube.com/embed/${match[1]}` : null;
	}
</script>

<div class="container narrow">
	{#if $exerciseError}
		<p class="error-text">Упражнение не найдено.</p>
	{:else if !$currentExercise}
		<p class="muted">Загружаю…</p>
	{:else}
		{@const item = $currentExercise}
		<a href="/exercises" class="back mono"
			><Icon name="chevron-left" size={0.9} /> Все упражнения</a
		>

		<header class="rise">
			<div class="head-text">
				<p class="eyebrow">// {muscleGroupLabels[item.primary_muscle]}</p>
				<h1>{item.name}</h1>
				<div class="chips">
					<span class="chip static">{equipmentLabels[item.equipment]}</span>
					<span class="chip static">{difficultyLabels[item.difficulty]}</span>
				</div>
			</div>
			<div class="head-map">
				<MuscleMap variant={$gender} highlighted={[item.primary_muscle]} />
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
		color: var(--muted);
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}

	.back:hover {
		color: var(--volt);
	}

	header {
		margin-block: 20px 28px;
		display: grid;
		grid-template-columns: 1fr 220px;
		gap: 24px;
		align-items: center;
	}

	.head-map {
		opacity: 0.9;
	}

	h1 {
		font-size: clamp(28px, 4.5vw, 44px);
		margin-block: 12px 18px;
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
		color: var(--ink);
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
		color: var(--muted);
		margin-bottom: 12px;
	}

	.block.volt {
		border-left: 3px solid var(--volt);
	}

	.block.volt h2 {
		color: var(--volt);
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
		border: 1px solid var(--line);
		border-radius: var(--border-radius);
		background: var(--bg-sunken);
	}

	@media (max-width: 560px) {
		.block {
			padding: 16px 14px;
		}

		.videos {
			grid-template-columns: 1fr;
		}
	}
</style>
