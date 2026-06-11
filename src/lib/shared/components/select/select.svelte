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
		color: var(--ink);
		outline: none;
		cursor: pointer;
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1.5 6 6.5 11 1.5' fill='none' stroke='%238e9095' stroke-width='1.5'/%3E%3C/svg%3E");
		background-repeat: no-repeat;
		transition: border-color 0.15s ease;
	}

	.boxed {
		background-color: var(--bg-sunken);
		border: 1px solid var(--line-strong);
		border-radius: var(--border-radius);
	}

	.boxed:focus {
		border-color: var(--volt);
	}

	.boxed.sm {
		padding: 7px 30px 7px 9px;
		font-size: 13px;
		background-position: right 10px center;
	}

	.boxed.md {
		padding: 11px 36px 11px 14px;
		font-size: 15px;
		background-position: right 12px center;
	}

	.boxed.lg {
		padding: 14px 38px 14px 16px;
		font-size: 16px;
		background-position: right 14px center;
	}

	.ghost {
		background-color: transparent;
		border: none;
		border-bottom: 1px dashed var(--line-strong);
		border-radius: 0;
		padding-inline: 0 26px;
		background-position: right 6px center;
	}

	.ghost:hover:not(:focus) {
		border-bottom-color: var(--muted);
	}

	.ghost:focus {
		border-bottom-color: var(--volt);
		border-bottom-style: solid;
	}

	.ghost.sm {
		font-size: 13px;
		padding-block: 2px;
	}

	.ghost.md {
		font-size: 16px;
		font-weight: 600;
		padding-block: 4px;
	}

	.ghost.lg {
		font-family: var(--font-display);
		font-size: clamp(24px, 4vw, 36px);
		font-weight: 800;
		letter-spacing: -0.01em;
		padding-block: 6px;
	}
</style>
