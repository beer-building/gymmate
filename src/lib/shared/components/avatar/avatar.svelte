<script lang="ts">
	import type { AuthRecord } from 'pocketbase';
	import { pb } from '$lib/shared/api';

	type Size = 'sm' | 'md' | 'lg' | 'xl';

	let {
		user = null,
		src = '',
		name = '',
		size = 'md',
		ring = false
	}: {
		user?: AuthRecord | null;
		src?: string;
		name?: string;
		size?: Size;
		ring?: boolean;
	} = $props();

	const resolvedSrc = $derived.by(() => {
		if (src) return src;
		if (!user) return '';
		const avatar = (user as { avatar?: string }).avatar;
		if (!avatar) return '';
		if (/^https?:\/\//.test(avatar)) return avatar;
		return pb.files.getURL(user, avatar, { thumb: '96x96' });
	});

	const displayName = $derived(name || user?.name || user?.email || '');

	const initials = $derived.by(() => {
		const source = displayName.trim();
		if (!source) return '?';
		const parts = source.split(/[\s._-]+/).filter(Boolean);
		if (parts.length >= 2) {
			return (parts[0][0] + parts[1][0]).toUpperCase();
		}
		return source.slice(0, 2).toUpperCase();
	});

	const hue = $derived.by(() => {
		let h = 0;
		for (let i = 0; i < displayName.length; i++) {
			h = (h * 31 + displayName.charCodeAt(i)) >>> 0;
		}
		return h % 360;
	});
</script>

<span
	class="avatar avatar-{size}"
	class:ring
	style="--avatar-hue: {hue}"
	aria-label={displayName || 'avatar'}
	title={displayName || undefined}
>
	{#if resolvedSrc}
		<img src={resolvedSrc} alt={displayName} loading="lazy" />
	{:else}
		<span class="initials">{initials}</span>
	{/if}
</span>

<style>
	.avatar {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		border-radius: 50%;
		background: oklch(0.32 0.07 var(--avatar-hue));
		color: oklch(0.96 0.04 var(--avatar-hue));
		font-family: var(--font-mono);
		font-weight: 700;
		letter-spacing: 0.02em;
		overflow: hidden;
		position: relative;
		isolation: isolate;
		user-select: none;
		transition:
			box-shadow 0.2s ease,
			transform var(--spring-transition);
	}

	.avatar::after {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: inherit;
		box-shadow: inset 0 0 0 1px oklch(from var(--ink) l c h / 0.08);
		pointer-events: none;
	}

	.avatar img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.avatar.ring {
		box-shadow:
			0 0 0 2px var(--bg),
			0 0 0 3px oklch(from var(--volt) l c h / 0.4);
	}

	.avatar.ring:hover {
		box-shadow:
			0 0 0 2px var(--bg),
			0 0 0 3px var(--volt);
		transform: scale(1.04);
	}

	.avatar-sm {
		width: 1.5rem;
		height: 1.5rem;
		font-size: 0.625rem;
	}

	.avatar-md {
		width: 2.125rem;
		height: 2.125rem;
		font-size: 0.6875rem;
	}

	.avatar-lg {
		width: 3rem;
		height: 3rem;
		font-size: 0.9375rem;
	}

	.avatar-xl {
		width: 6rem;
		height: 6rem;
		font-size: 1.75rem;
	}
</style>
