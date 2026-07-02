<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLSelectAttributes } from 'svelte/elements';

	type Props = Omit<HTMLSelectAttributes, 'size'> & {
		size?: 'sm' | 'md' | 'lg';
		kind?: 'boxed' | 'ghost';
		children?: Snippet;
	};

	let { size = 'md', kind = 'boxed', value = $bindable(), children, ...rest }: Props = $props();
</script>

<select class="select {kind} {size}" bind:value {...rest}>
	{@render children?.()}
</select>

<style>
	.select {
		width: 100%;
		min-width: 0;
		appearance: none;
		font-family: var(--font-body);
		color: var(--color-text);
		outline: none;
		cursor: pointer;
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1.5 6 6.5 11 1.5' fill='none' stroke='%238e9095' stroke-width='1.5'/%3E%3C/svg%3E");
		background-repeat: no-repeat;
		transition: border-color 0.15s ease;
	}

	.boxed {
		background-color: var(--color-sunken);
		border: 1px solid var(--color-border-strong);
		border-radius: var(--border-radius);
	}

	.boxed:focus {
		border-color: var(--color-accent);
	}

	/* фиксированный line-height в rem — высоты совпадают с кнопками и инпутами */
	.boxed.sm {
		padding: 0.4375rem 1.875rem 0.4375rem 0.5625rem;
		font-size: 0.8125rem;
		line-height: 1rem;
		background-position: right 0.625rem center;
	}

	/* touch: sm-селекты ниже 44px — добиваем высоту, как у инпутов */
	@media (pointer: coarse) {
		.boxed.sm {
			min-height: 2.75rem;
			/* iOS зумит страницу при фокусе на контроле со шрифтом <16px (порог
			   задан в px) и не отзумливает после блюра — остаётся горизонтальный
			   скролл. На таче держим шрифт контролов не ниже порога. */
			font-size: max(16px, 0.8125rem);
		}
	}

	.boxed.md {
		padding: 0.6875rem 2.25rem 0.6875rem 0.875rem;
		font-size: 0.9375rem;
		line-height: 1.125rem;
		background-position: right 0.75rem center;
	}

	.boxed.lg {
		padding: 0.875rem 2.375rem 0.875rem 1rem;
		font-size: 1rem;
		line-height: 1.25rem;
		background-position: right 0.875rem center;
	}

	.ghost {
		background-color: transparent;
		border: none;
		border-bottom: 1px dashed var(--color-border-strong);
		border-radius: 0;
		padding-inline: 0 1.625rem;
		background-position: right 0.375rem center;
	}

	.ghost:hover:not(:focus) {
		border-bottom-color: var(--color-muted);
	}

	.ghost:focus {
		border-bottom-color: var(--color-accent);
		border-bottom-style: solid;
	}

	.ghost.sm {
		font-size: 0.8125rem;
		padding-block: 0.125rem;
	}

	.ghost.md {
		font-size: 1rem;
		font-weight: 600;
		padding-block: 0.25rem;
	}

	.ghost.lg {
		font-family: var(--font-display);
		font-size: clamp(1.5rem, 4vw, 2.25rem);
		font-weight: 800;
		letter-spacing: -0.01em;
		padding-block: 0.375rem;
	}

	/* стрелка зашита в data-URI и не умеет var(): в светлой теме — свой цвет (muted) */
	@media (prefers-color-scheme: light) {
		.select {
			background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1.5 6 6.5 11 1.5' fill='none' stroke='%236b6456' stroke-width='1.5'/%3E%3C/svg%3E");
		}
	}
</style>
