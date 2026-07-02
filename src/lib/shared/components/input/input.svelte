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
		color: var(--color-text);
		outline: none;
		transition: border-color 0.15s ease;
	}

	.input::placeholder {
		color: var(--color-muted);
		opacity: 1;
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

	/* date: сбрасываем UA-оформление, иначе у поля свой шрифт, своя высота
	   и интринсик-ширина, из-за которой оно вылезает за форму */
	.input[type='date'] {
		appearance: none;
		display: block;
		font-family: var(--font-mono);
	}

	.input[type='date']::-webkit-datetime-edit {
		font: inherit;
		padding: 0;
	}

	.input[type='date']::-webkit-date-and-time-value {
		font: inherit;
		text-align: left;
		margin: 0;
	}

	.input[type='date']::-webkit-calendar-picker-indicator {
		cursor: pointer;
		opacity: 0.6;
	}

	.boxed {
		background: var(--color-sunken);
		border: 1px solid var(--color-border-strong);
		border-radius: var(--border-radius);
	}

	.boxed:focus {
		border-color: var(--color-accent);
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

	/* touch: sm-поля ниже 44px — добиваем высоту (поле, в отличие от кнопок, растёт визуально) */
	@media (pointer: coarse) {
		.boxed.sm {
			min-height: 2.75rem;
		}
	}

	/* date игнорирует line-height для внутренних частей — высота задаётся явно,
	   чтобы совпадать с текстовыми: line-height + 2×padding + 2×border */
	.boxed.sm[type='date'] {
		height: calc(1rem + 2 * 0.4375rem + 2px);
	}

	.boxed.md[type='date'] {
		height: calc(1.125rem + 2 * 0.6875rem + 2px);
	}

	.boxed.lg[type='date'] {
		height: calc(1.25rem + 2 * 0.875rem + 2px);
	}

	.ghost {
		background: transparent;
		border: none;
		border-bottom: 1px dashed var(--color-border-strong);
		border-radius: 0;
		padding-inline: 0;
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
</style>
