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
		border-radius: var(--border-radius);
	}

	.boxed:focus {
		border-color: var(--volt);
	}

	.boxed.sm {
		padding: 7px 9px;
		font-size: 13px;
	}

	.boxed.md {
		padding: 11px 14px;
		font-size: 15px;
	}

	.boxed.lg {
		padding: 14px 16px;
		font-size: 16px;
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
