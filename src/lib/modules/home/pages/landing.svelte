<script lang="ts">
	import { Button } from '$lib/shared/components/button';

	const sections = [
		{
			href: '/exercises',
			tag: '01',
			title: 'Каталог упражнений',
			text: 'Техника выполнения по группам мышц: от жима лёжа до планки. Что качает, чем выполнять, на что смотреть.'
		},
		{
			href: '/programs',
			tag: '02',
			title: 'Готовые программы',
			text: 'Масса, похудение, сила. Расписанные по дням комплексы с подходами, повторениями и отдыхом.'
		},
		{
			href: '/diary',
			tag: '03',
			title: 'Дневник тренировок',
			text: 'Записывай каждый подход: вес, повторы, заметки. Прогресс виден, когда он записан.'
		}
	];
</script>

<div class="container">
	<section class="hero rise">
		<p class="eyebrow">// твой план на железо</p>
		<h1>
			КАЧАЙСЯ<br />
			<span class="outline">ПО СИСТЕМЕ</span>
		</h1>
		<p class="lead muted">
			Каталог упражнений, готовые программы и дневник тренировок — всё, чтобы прийти в зал и знать,
			что делать. Без воды, как на стенде у тренера.
		</p>
		<div class="cta">
			<Button href="/programs">Выбрать программу</Button>
			<Button kind="ghost" href="/register">Завести дневник</Button>
		</div>
	</section>

	<section class="grid">
		{#each sections as section, i (section.href)}
			<a
				href={section.href}
				class="plate card rise"
				data-tag={section.tag}
				style="animation-delay: {0.1 + i * 0.08}s"
			>
				<span class="tag mono">{section.tag}</span>
				<h2>{section.title}</h2>
				<p class="muted">{section.text}</p>
				<span class="go mono">→</span>
			</a>
		{/each}
	</section>
</div>

<style>
	.hero {
		padding-block: 48px 72px;
		max-width: 760px;
	}

	h1 {
		font-size: clamp(40px, 8vw, 92px);
		font-weight: 900;
		margin-block: 18px 22px;
		text-transform: uppercase;
	}

	.outline {
		color: transparent;
		-webkit-text-stroke: 2px var(--color-accent);
		filter: drop-shadow(0 0 18px oklch(from var(--color-accent) l c h / 0.35));
	}

	.lead {
		font-size: 17px;
		max-width: 540px;
	}

	.cta {
		display: flex;
		gap: 14px;
		margin-top: 32px;
		flex-wrap: wrap;
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 16px;
	}

	.card {
		padding: 28px 24px 56px;
		display: flex;
		flex-direction: column;
		gap: 12px;
		overflow: hidden;
	}

	.card h2 {
		font-size: 19px;
		position: relative;
		z-index: 1;
	}

	.card p {
		font-size: 14px;
		margin: 0;
		position: relative;
		z-index: 1;
	}

	.tag {
		color: var(--color-accent);
		font-size: 12px;
		position: relative;
		z-index: 1;
	}

	.card::after {
		content: attr(data-tag);
		position: absolute;
		right: -10px;
		top: -28px;
		font-family: var(--font-display);
		font-weight: 900;
		font-size: 140px;
		line-height: 1;
		color: transparent;
		-webkit-text-stroke: 1px oklch(from var(--color-accent) l c h / 0.12);
		pointer-events: none;
		transition:
			-webkit-text-stroke-color 0.3s ease,
			transform 0.3s ease;
	}

	.card:hover::after {
		-webkit-text-stroke-color: oklch(from var(--color-accent) l c h / 0.3);
		transform: translate(-4px, 4px);
	}

	.go {
		position: absolute;
		right: 20px;
		bottom: 16px;
		font-size: 20px;
		color: var(--color-accent);
		transition: transform 0.18s ease;
	}

	.card:hover .go {
		transform: translateX(6px);
	}

	@media (max-width: 560px) {
		.hero {
			padding-block: 24px 48px;
		}

		.grid {
			grid-template-columns: 1fr;
		}
	}
</style>
