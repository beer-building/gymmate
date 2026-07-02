<script lang="ts">
	import type { HeatmapDay } from '../../helpers/stats';

	interface Props {
		weeks: HeatmapDay[][];
	}
	const { weeks }: Props = $props();

	function title(day: HeatmapDay): string {
		const date = new Date(day.date).toLocaleDateString('ru-RU', {
			day: 'numeric',
			month: 'long'
		});
		if (day.count === 0) return date;
		return `${date} · ${day.count} подх.`;
	}
</script>

<div class="heatmap">
	<div class="grid" style="--weeks: {weeks.length}">
		{#each weeks as column, i (i)}
			{#each column as day (day.date)}
				<span
					class="cell level-{day.level}"
					class:future={day.future}
					title={title(day)}
					aria-label={title(day)}
				></span>
			{/each}
		{/each}
	</div>
	<div class="legend mono">
		<span>меньше</span>
		<span class="cell level-0"></span>
		<span class="cell level-1"></span>
		<span class="cell level-2"></span>
		<span class="cell level-3"></span>
		<span>больше</span>
	</div>
</div>

<style>
	.heatmap {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.grid {
		display: grid;
		/* колонка — неделя: заполняем сверху вниз (пн..вс), потом вправо */
		grid-template-rows: repeat(7, 1fr);
		grid-auto-flow: column;
		grid-auto-columns: 1fr;
		gap: 3px;
	}

	.cell {
		aspect-ratio: 1;
		border-radius: 2px;
		background: var(--color-sunken);
		border: 1px solid var(--color-border);
	}

	.cell.future {
		opacity: 0.35;
		border-style: dashed;
	}

	.cell.level-1 {
		background: oklch(from var(--color-accent) l c h / 0.35);
		border-color: transparent;
	}

	.cell.level-2 {
		background: oklch(from var(--color-accent) l c h / 0.65);
		border-color: transparent;
	}

	.cell.level-3 {
		background: var(--color-accent);
		border-color: transparent;
		box-shadow: 0 0 8px oklch(from var(--color-accent) l c h / 0.5);
	}

	.legend {
		display: flex;
		align-items: center;
		gap: 5px;
		justify-content: flex-end;
		font-size: 10px;
		color: var(--color-muted);
		text-transform: uppercase;
		letter-spacing: 0.1em;
	}

	.legend .cell {
		width: 10px;
		height: 10px;
		aspect-ratio: auto;
	}

	.legend span:first-child {
		margin-right: 3px;
	}

	.legend span:last-child {
		margin-left: 3px;
	}
</style>
