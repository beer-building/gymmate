<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { authModel } from '$lib/modules/auth/model';
	import { Button } from '$lib/shared/components/button';
	import { Icon } from '$lib/shared/components/icon';
	import { Avatar } from '$lib/shared/components/avatar';

	let { children } = $props();

	const user = authModel.user;
	let inputFocused = $state(false);

	function onFocusIn(event: FocusEvent) {
		const target = event.target as HTMLElement;
		if (target.matches('input, textarea, select, [contenteditable]')) {
			inputFocused = true;
		}
	}
	function onFocusOut(event: FocusEvent) {
		const target = event.target as HTMLElement;
		if (target.matches('input, textarea, select, [contenteditable]')) {
			inputFocused = false;
			requestAnimationFrame(() => window.scrollTo(0, window.scrollY));
		}
	}

	// порядок — по частоте использования: дневник чаще каталога;
	// дашборд живёт в профиле (последний таб), '/' — лендинг для гостей
	const navItems = [
		{ href: '/diary', label: 'Дневник', icon: 'calendar' },
		{ href: '/programs', label: 'Программы', icon: 'book' },
		{ href: '/exercises', label: 'Упражнения', icon: 'dumbbell' }
	];

	function logout() {
		authModel.loggedOut();
		goto('/');
	}
</script>

<svelte:head>
	<title>GymMate — тренировки в зале</title>
</svelte:head>

<svelte:window onfocusin={onFocusIn} onfocusout={onFocusOut} />

{#snippet navLinks()}
	{#each navItems as item (item.href)}
		<a href={item.href} class:current={page.url.pathname.startsWith(item.href)}>
			<Icon name={item.icon} size={1.1} />
			{item.label}
		</a>
	{/each}
{/snippet}

<header>
	<div class="container bar">
		<a href="/" class="logo">
			<span class="pulse" aria-hidden="true"></span>
			GYM<span class="accent">MATE</span>
		</a>

		<nav class="top-nav">
			{@render navLinks()}
		</nav>

		<div class="auth-zone">
			{#if $user}
				<a href="/profile" class="user-link" aria-label="Профиль">
					<Avatar user={$user} size="md" ring />
					<span class="user-name mono">{$user.name || $user.email}</span>
				</a>
				<Button kind="ghost" size="sm" onclick={logout}>Выйти</Button>
			{:else}
				<Button size="sm" href="/login">Войти</Button>
			{/if}
		</div>
	</div>
	<div class="header-glow" aria-hidden="true"></div>
</header>

<!-- мобильный нижний таб-бар: вне header, т.к. backdrop-filter на нём
     делает header containing block'ом для position: fixed -->
<nav class="tab-bar {inputFocused ? 'hidden' : ''}" aria-label="Основные разделы">
	{@render navLinks()}
	<a href="/profile" class:current={page.url.pathname.startsWith('/profile')}>
		{#if $user}
			<Avatar user={$user} size="sm" />
		{:else}
			<Icon name="person" size={1.1} />
		{/if}
		Профиль
	</a>
</nav>

<main>
	{@render children()}
</main>

<footer>
	<div class="container">
		<span class="mono">GYMMATE // {new Date().getFullYear()}</span>
		<span class="muted">Тренируйся с умом. Записывай каждый подход.</span>
	</div>
</footer>

<style>
	header {
		position: sticky;
		top: 0;
		z-index: 10;
		background: oklch(from var(--bg) l c h / 0.78);
		backdrop-filter: blur(14px) saturate(140%);
		border-bottom: 1px solid var(--line);
		padding-top: var(--safe-area-top);
	}

	.header-glow {
		position: absolute;
		left: 0;
		right: 0;
		bottom: -1px;
		height: 1px;
		background: linear-gradient(
			90deg,
			transparent 0%,
			oklch(from var(--volt) l c h / 0.45) 35%,
			oklch(from var(--volt) l c h / 0.45) 65%,
			transparent 100%
		);
		pointer-events: none;
	}

	.bar {
		display: flex;
		align-items: center;
		gap: 32px;
		height: 64px;
	}

	.logo {
		display: inline-flex;
		align-items: center;
		gap: 9px;
		font-family: var(--font-display);
		font-weight: 900;
		font-size: 18px;
		letter-spacing: 0.02em;
		position: relative;
	}

	.logo .accent {
		color: var(--volt);
	}

	.pulse {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--volt);
		box-shadow: 0 0 0 0 oklch(from var(--volt) l c h / 0.6);
		animation: pulse 2.2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
	}

	@keyframes pulse {
		0% {
			box-shadow: 0 0 0 0 oklch(from var(--volt) l c h / 0.55);
		}
		70% {
			box-shadow: 0 0 0 10px oklch(from var(--volt) l c h / 0);
		}
		100% {
			box-shadow: 0 0 0 0 oklch(from var(--volt) l c h / 0);
		}
	}

	.top-nav {
		display: flex;
		gap: 4px;
		flex: 1;
	}

	nav a {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		font-family: var(--font-mono);
		font-size: 12px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: var(--muted);
		padding: 8px 14px;
		border-radius: var(--border-radius);
		transition: color 0.15s ease;
		white-space: nowrap;
	}

	nav a:hover {
		color: var(--ink);
	}

	nav a.current {
		color: var(--volt);
	}

	.tab-bar {
		display: none;
	}

	.auth-zone {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.user-link {
		display: inline-flex;
		align-items: center;
		gap: 0.625rem;
		padding: 0.25rem;
		border-radius: var(--radius-pill);
		transition: background 0.18s ease;
	}

	.user-link:hover {
		background: oklch(from var(--ink) l c h / 0.04);
	}

	.user-name {
		font-size: 12px;
		font-weight: 600;
		color: var(--muted);
		max-width: 140px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		transition: color 0.15s ease;
		padding-right: 6px;
	}

	.user-link:hover .user-name {
		color: var(--ink);
	}

	main {
		min-height: calc(100vh - 64px - 80px);
		padding-block: 48px 80px;
	}

	footer {
		border-top: 1px solid var(--line);
		padding-block: 24px;
		padding-bottom: calc(24px + var(--safe-area-bottom));
	}

	footer .container {
		display: flex;
		justify-content: space-between;
		gap: 16px;
		font-size: 13px;
	}

	footer .mono {
		color: var(--volt);
		font-size: 11px;
		letter-spacing: 0.15em;
	}

	@media (max-width: 720px) {
		.bar {
			gap: 12px;
			height: 56px;
		}

		.top-nav {
			display: none;
		}

		/* меню — фиксированный нижний таб-бар, как в iOS */
		.tab-bar {
			position: fixed;
			left: 0;
			right: 0;
			bottom: 0;
			z-index: 20;
			display: flex;
			background: oklch(from var(--bg) l c h / 0.82);
			backdrop-filter: blur(16px) saturate(140%);
			-webkit-backdrop-filter: blur(16px) saturate(140%);
			border-top: 1px solid var(--line);
			padding: 0.375rem 0.5rem 0;
			padding-bottom: max(var(--safe-area-bottom), 0.375rem);
			transition: opacity 0.15s ease;
		}

		.tab-bar.hidden {
			opacity: 0;
			pointer-events: none;
		}

		.tab-bar a {
			flex: 1;
			flex-direction: column;
			justify-content: center;
			gap: 0.3125rem;
			padding: 0.4375rem 0.25rem;
			font-size: 0.625rem;
			letter-spacing: 0.06em;
			border-radius: var(--radius-md);
			transition:
				color 0.15s ease,
				transform var(--spring-transition);
		}

		.tab-bar a:active {
			transform: scale(0.92);
		}

		/* в таб-баре иконки крупнее подписи — перебиваем размер из пропса */
		.tab-bar :global(.icon svg) {
			width: 1.5rem;
			height: 1.5rem;
		}

		.auth-zone {
			margin-left: auto;
		}

		/* профиль на мобильном живёт в таб-баре — аватарка в шапке дублировала бы его */
		.user-link {
			display: none;
		}

		main {
			padding-block: 28px 56px;
		}

		/* последний блок страницы — даём место, чтобы таб-бар его не перекрывал */
		footer {
			padding-bottom: calc(24px + 4.25rem + var(--safe-area-bottom));
		}

		footer .container {
			flex-direction: column;
			gap: 6px;
		}
	}
</style>
