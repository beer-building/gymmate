<script lang="ts">
	import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';
	import type { Snippet } from 'svelte';

	type Kind = 'primary' | 'ghost' | 'danger' | 'icon' | 'icon-filled';
	type Size = 'sm' | 'md' | 'lg';

	type CommonProps = {
		kind?: Kind;
		size?: Size;
		class?: string;
		children?: Snippet;
	};

	type AnchorProps = CommonProps & Omit<HTMLAnchorAttributes, 'size'> & { href: string };
	type ButtonProps = CommonProps & Omit<HTMLButtonAttributes, 'size'> & { href?: undefined };
	type Props = AnchorProps | ButtonProps;

	let {
		kind = 'primary',
		size = 'md',
		href,
		class: extra = '',
		children,
		...rest
	}: Props = $props();
</script>

{#if href}
	<a class="btn {kind} {size} {extra}" {href} {...rest as HTMLAnchorAttributes}>
		{@render children?.()}
	</a>
{:else}
	<button class="btn {kind} {size} {extra}" {...rest as HTMLButtonAttributes}>
		{@render children?.()}
	</button>
{/if}

<style>
	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		font-family: var(--font-mono);
		font-size: 0.75rem; /* 12px */
		/* line-height согласован с inputs/selects — md = 2.625rem (42px) */
		line-height: 1rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		/* текст кнопки никогда не переносится на вторую строку */
		white-space: nowrap;
		padding: 0.75rem 1.375rem;
		border-radius: var(--radius-sm);
		border: 1px solid var(--volt);
		background: var(--volt);
		color: var(--bg);
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
		transition:
			background 0.15s ease,
			border-color 0.15s ease,
			color 0.15s ease,
			transform var(--spring-transition);
	}

	.btn:active {
		transform: scale(0.96);
	}

	.btn:hover {
		background: transparent;
		color: var(--volt);
	}

	.btn:disabled {
		opacity: 0.4;
		pointer-events: none;
	}

	.btn.ghost {
		background: transparent;
		border-color: var(--line-strong);
		color: var(--ink);
	}

	.btn.ghost:hover {
		border-color: var(--volt);
		color: var(--volt);
	}

	.btn.danger {
		background: transparent;
		border-color: var(--line-strong);
		color: var(--danger);
	}

	.btn.danger:hover {
		border-color: var(--danger);
	}

	.btn.sm {
		padding: 0.4375rem 0.875rem;
		font-size: 0.6875rem; /* 11px */
	}

	.btn.lg {
		padding: 1rem 1.75rem;
		font-size: 0.8125rem;
	}

	/* цвет переопределяется снаружи через --icon-color (по умолчанию — удаление) */
	.btn.icon {
		width: 2rem;
		height: 2rem;
		padding: 0;
		background: transparent;
		border: none;
		border-radius: var(--radius-sm);
		color: var(--icon-color, var(--danger));
		letter-spacing: 0;
		text-transform: none;
		flex-shrink: 0;
	}

	.btn.icon:hover {
		background: oklch(from var(--icon-color, var(--danger)) l c h / 0.14);
		color: var(--icon-color, var(--danger));
	}

	/* квадратная иконка с постоянной заливкой; цвет — через --icon-color, по умолчанию нейтральный */
	.btn.icon-filled {
		width: 2rem;
		height: 2rem;
		padding: 0;
		background: oklch(from var(--icon-color, var(--ink)) l c h / 0.1);
		border: none;
		border-radius: var(--radius-sm);
		color: var(--icon-color, var(--ink));
		letter-spacing: 0;
		text-transform: none;
		flex-shrink: 0;
	}

	.btn.icon-filled:hover {
		background: oklch(from var(--icon-color, var(--ink)) l c h / 0.2);
		color: var(--icon-color, var(--ink));
	}
</style>
