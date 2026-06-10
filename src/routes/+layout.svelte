<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { user, loggedOut } from '$lib/models/auth';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();

	const navItems = [
		{ href: '/exercises', label: 'Упражнения' },
		{ href: '/programs', label: 'Программы' },
		{ href: '/diary', label: 'Дневник' }
	];

	function logout() {
		loggedOut();
		goto('/');
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>GymMate — тренировки в зале</title>
</svelte:head>

<header>
	<div class="container bar">
		<a href="/" class="logo">
			GYM<span>MATE</span>
		</a>

		<nav>
			{#each navItems as item (item.href)}
				<a href={item.href} class:current={page.url.pathname.startsWith(item.href)}>
					{item.label}
				</a>
			{/each}
		</nav>

		<div class="auth-zone">
			{#if $user}
				<span class="user mono">{$user.name || $user.email}</span>
				<button class="btn ghost sm" onclick={logout}>Выйти</button>
			{:else}
				<a class="btn sm" href="/login">Войти</a>
			{/if}
		</div>
	</div>
</header>

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
		background: color-mix(in srgb, var(--bg) 85%, transparent);
		backdrop-filter: blur(12px);
		border-bottom: 1px solid var(--line);
	}

	.bar {
		display: flex;
		align-items: center;
		gap: 32px;
		height: 64px;
	}

	.logo {
		font-family: var(--font-display);
		font-weight: 900;
		font-size: 18px;
		letter-spacing: 0.02em;
	}

	.logo span {
		color: var(--volt);
	}

	nav {
		display: flex;
		gap: 4px;
		flex: 1;
	}

	nav a {
		font-family: var(--font-mono);
		font-size: 12px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: var(--muted);
		padding: 8px 14px;
		border-radius: 3px;
		transition: color 0.15s ease;
	}

	nav a:hover {
		color: var(--ink);
	}

	nav a.current {
		color: var(--volt);
	}

	.auth-zone {
		display: flex;
		align-items: center;
		gap: 14px;
	}

	.user {
		font-size: 12px;
		color: var(--muted);
		max-width: 160px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	main {
		min-height: calc(100vh - 64px - 80px);
		padding-block: 48px 80px;
	}

	footer {
		border-top: 1px solid var(--line);
		padding-block: 24px;
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
			flex-wrap: wrap;
			height: auto;
			padding-block: 12px;
		}

		nav {
			order: 3;
			width: 100%;
		}

		nav a {
			padding: 6px 10px;
		}

		.auth-zone {
			margin-left: auto;
		}
	}
</style>
