<script lang="ts">
	import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';
	import type { Snippet } from 'svelte';

	type Kind = 'primary' | 'ghost' | 'danger' | 'icon' | 'icon-filled';
	type Size = 'sm' | 'md';

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
		gap: 8px;
		font-family: var(--font-mono);
		font-size: 12px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		/* текст кнопки никогда не переносится на вторую строку */
		white-space: nowrap;
		padding: 12px 22px;
		border-radius: var(--border-radius);
		border: 1px solid var(--volt);
		background: var(--volt);
		color: var(--bg);
		cursor: pointer;
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
		padding: 7px 14px;
		font-size: 11px;
	}

	/* цвет переопределяется снаружи через --icon-color (по умолчанию — удаление) */
	.btn.icon {
		width: 32px;
		height: 32px;
		padding: 0;
		background: transparent;
		border: none;
		border-radius: var(--border-radius);
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
		width: 32px;
		height: 32px;
		padding: 0;
		background: oklch(from var(--icon-color, var(--ink)) l c h / 0.1);
		border: none;
		border-radius: var(--border-radius);
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
