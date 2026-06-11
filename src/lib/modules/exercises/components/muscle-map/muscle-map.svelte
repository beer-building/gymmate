<script lang="ts">
	import type { MuscleGroup } from '$lib/shared/types';
	import { muscleGroupLabels } from '$lib/shared/helpers/labels';
	import { BODY_MAPS, type BodyVariant } from './muscle-map-data';

	interface Props {
		variant?: BodyVariant;
		selected?: MuscleGroup | null;
		highlighted?: MuscleGroup[];
		interactive?: boolean;
		onselect?: (group: MuscleGroup | null) => void;
	}

	let {
		variant = 'male',
		selected = null,
		highlighted = [],
		interactive = false,
		onselect
	}: Props = $props();

	const views = $derived([
		{ label: 'Спереди', ...BODY_MAPS[variant].front },
		{ label: 'Сзади', ...BODY_MAPS[variant].back }
	]);

	function isActive(group: MuscleGroup | null): boolean {
		return group !== null && (selected === group || highlighted.includes(group));
	}

	function pick(group: MuscleGroup | null) {
		if (!interactive || group === null) return;
		onselect?.(selected === group ? null : group);
	}
</script>

<div class="map" class:interactive>
	{#each views as view (view.label)}
		<figure>
			<svg viewBox={view.viewBox} xmlns="http://www.w3.org/2000/svg">
				{#each view.paths as path, i (i)}
					<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions (клавиатурная альтернатива — чипы групп рядом с картой) -->
					<path
						class="muscle"
						class:bodypart={path.group === null}
						class:active={isActive(path.group)}
						d={path.d}
						onclick={() => pick(path.group)}
					>
						{#if path.group}
							<title>{muscleGroupLabels[path.group]}</title>
						{/if}
					</path>
				{/each}
			</svg>
			<figcaption class="mono">{view.label}</figcaption>
		</figure>
	{/each}
</div>

<style>
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

	.muscle.bodypart {
		fill: var(--bg-sunken);
		stroke: var(--line);
		stroke-width: 1;
	}

	.interactive .muscle:not(.bodypart) {
		cursor: pointer;
	}

	.interactive .muscle:not(.bodypart):hover {
		fill: oklch(from var(--danger) l c h / 0.55);
	}

	.muscle.active {
		fill: var(--danger);
		filter: drop-shadow(0 0 3px oklch(from var(--danger) l c h / 0.70));
	}
</style>
