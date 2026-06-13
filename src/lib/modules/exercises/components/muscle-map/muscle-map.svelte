<script lang="ts">
	import type { MuscleGroup } from '$lib/shared/types';
	import { muscleGroupLabels } from '$lib/shared/helpers/labels';
	import { BODY_MAPS, type BodyVariant } from './muscle-map-data';

	export type MuscleIntensity = 0 | 1 | 2 | 3;

	interface Props {
		variant?: BodyVariant;
		// 'select' — навигация по группам (клик, active-подсветка);
		// 'heatmap' — раскраска по интенсивности из `intensities`, клик отключён
		mode?: 'select' | 'heatmap';
		selected?: MuscleGroup | null;
		highlighted?: MuscleGroup[];
		interactive?: boolean;
		onselect?: (group: MuscleGroup | null) => void;
		intensities?: Partial<Record<MuscleGroup, MuscleIntensity>>;
		tooltip?: (group: MuscleGroup) => string;
		showLegend?: boolean;
	}

	let {
		variant = 'male',
		mode = 'select',
		selected = null,
		highlighted = [],
		interactive = false,
		onselect,
		intensities,
		tooltip,
		showLegend = false
	}: Props = $props();

	const heatmap = $derived(mode === 'heatmap');

	const views = $derived([
		{ label: 'Спереди', ...BODY_MAPS[variant].front },
		{ label: 'Сзади', ...BODY_MAPS[variant].back }
	]);

	function isActive(group: MuscleGroup | null): boolean {
		if (heatmap || group === null) return false;
		return selected === group || highlighted.includes(group);
	}

	function levelOf(group: MuscleGroup | null): MuscleIntensity {
		if (!heatmap || group === null) return 0;
		return intensities?.[group] ?? 0;
	}

	function titleFor(group: MuscleGroup): string {
		if (heatmap && tooltip) return tooltip(group);
		return muscleGroupLabels[group];
	}

	function pick(group: MuscleGroup | null) {
		if (heatmap || !interactive || group === null) return;
		onselect?.(selected === group ? null : group);
	}
</script>

<div class="map" class:interactive={interactive && !heatmap} class:heatmap>
	{#each views as view (view.label)}
		<figure>
			<svg viewBox={view.viewBox} xmlns="http://www.w3.org/2000/svg">
				{#each view.paths as path, i (i)}
					<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions (клавиатурная альтернатива — чипы групп рядом с картой) -->
					<path
						class="muscle level-{levelOf(path.group)}"
						class:bodypart={path.group === null}
						class:active={isActive(path.group)}
						d={path.d}
						onclick={() => pick(path.group)}
					>
						{#if path.group}
							<title>{titleFor(path.group)}</title>
						{/if}
					</path>
				{/each}
			</svg>
			<figcaption class="mono">{view.label}</figcaption>
		</figure>
	{/each}
</div>

{#if showLegend && heatmap}
	<div class="legend mono">
		<span>меньше</span>
		<span class="dot level-0"></span>
		<span class="dot level-1"></span>
		<span class="dot level-2"></span>
		<span class="dot level-3"></span>
		<span>больше</span>
	</div>
{/if}

<style>
	/* heatmap-палитра — единый источник для путей и легенды */
	.map.heatmap,
	.legend {
		--level-1: oklch(from var(--volt) l c h / 0.35);
		--level-2: oklch(from var(--volt) l c h / 0.65);
		--level-3: var(--volt);
	}

	.map {
		display: flex;
		gap: 16px;
		justify-content: center;
	}

	figure {
		margin: 0;
		flex: 1;
		max-width: 170px;
		text-align: center;
	}

	svg {
		width: 100%;
		height: auto;
		display: block;
	}

	figcaption {
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 0.2em;
		color: var(--muted);
		margin-top: 8px;
	}

	@media (max-width: 640px) {
		.map {
			gap: 10px;
		}

		figure {
			max-width: none;
		}
	}

	.muscle {
		fill: var(--line);
		transition:
			fill 0.15s ease,
			filter 0.15s ease;
	}

	@media (prefers-reduced-motion: reduce) {
		.muscle {
			transition: none;
		}
	}

	.muscle.bodypart {
		fill: var(--bg-sunken);
		stroke: var(--line);
		stroke-width: 1;
	}

	.interactive .muscle:not(.bodypart) {
		cursor: pointer;
	}

	.interactive .muscle:not(.bodypart):not(.active):hover {
		fill: oklch(from var(--danger) l c h / 0.55);
	}

	.muscle.active {
		fill: var(--danger);
		filter: drop-shadow(0 0 3px oklch(from var(--danger) l c h / 0.7));
	}

	.heatmap .muscle.level-1:not(.bodypart) {
		fill: var(--level-1);
	}

	.heatmap .muscle.level-2:not(.bodypart) {
		fill: var(--level-2);
	}

	.heatmap .muscle.level-3:not(.bodypart) {
		fill: var(--level-3);
		filter: drop-shadow(0 0 3px oklch(from var(--volt) l c h / 0.45));
	}

	.legend {
		display: flex;
		align-items: center;
		gap: 5px;
		justify-content: flex-end;
		font-size: 10px;
		color: var(--muted);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		margin-top: 14px;
	}

	.legend .dot {
		width: 10px;
		height: 10px;
		border-radius: 2px;
		background: var(--bg-sunken);
		border: 1px solid var(--line);
	}

	.legend .dot.level-1 {
		background: var(--level-1);
		border-color: transparent;
	}

	.legend .dot.level-2 {
		background: var(--level-2);
		border-color: transparent;
	}

	.legend .dot.level-3 {
		background: var(--level-3);
		border-color: transparent;
	}

	.legend span:first-child {
		margin-right: 3px;
	}

	.legend span:last-child {
		margin-left: 3px;
	}
</style>
