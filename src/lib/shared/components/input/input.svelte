<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';

	type Props = Omit<HTMLInputAttributes, 'size'> & {
		size?: 'sm' | 'md' | 'lg';
		kind?: 'boxed' | 'ghost';
	};

	let { size = 'md', kind = 'boxed', value = $bindable(), ...rest }: Props = $props();
</script>

<input class="input {kind} {size}" bind:value {...rest} />

<style>
	.input {
		width: 100%;
		min-width: 0;
		font-family: var(--font-body);
		color: var(--ink);
		outline: none;
		transition: border-color 0.15s ease;
	}

	.input::placeholder {
		color: var(--muted);
		opacity: 0.7;
	}

	.input[type='number'] {
		font-family: var(--font-mono);
		appearance: textfield;
	}

	.input[type='number']::-webkit-outer-spin-button,
	.input[type='number']::-webkit-inner-spin-button {
		appearance: none;
		margin: 0;
	}

	.boxed {
		background: var(--bg-sunken);
		border: 1px solid var(--line-strong);
		border-radius: var(--radius-sm);
	}

	.boxed:focus {
		border-color: var(--volt);
	}

	/* фиксированный line-height в rem — высоты совпадают с кнопками и селектами */
	.boxed.sm {
		padding: 0.4375rem 0.5625rem;
		font-size: 0.8125rem;
		line-height: 1rem;
	}

	.boxed.md {
		padding: 0.6875rem 0.875rem;
		font-size: 0.9375rem;
		line-height: 1.125rem;
	}

	.boxed.lg {
		padding: 0.875rem 1rem;
		font-size: 1rem;
		line-height: 1.25rem;
	}

	.ghost {
		background: transparent;
		border: none;
		border-bottom: 1px dashed var(--line-strong);
		border-radius: 0;
		padding-inline: 0;
	}

	.ghost:hover:not(:focus) {
		border-bottom-color: var(--muted);
	}

	.ghost:focus {
		border-bottom-color: var(--volt);
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
</style>
