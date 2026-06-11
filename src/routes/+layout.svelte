<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { authModel } from '$lib/modules/auth/model';
	import { Button } from '$lib/shared/components/button';
	import { Icon } from '$lib/shared/components/icon';

	let { children } = $props();

	const user = authModel.user;

	const navItems = [
		{ href: '/exercises', label: 'Упражнения', icon: 'dumbbell' },
		{ href: '/programs', label: 'Программы', icon: 'book' },
		{ href: '/diary', label: 'Дневник', icon: 'calendar' }
	];

	function logout() {
		authModel.loggedOut();
		goto('/');
	}
</script>

<svelte:head>
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
					<Icon name={item.icon} size={0.9} />
					{item.label}
				</a>
			{/each}
		</nav>

		<div class="auth-zone">
			{#if $user}
				<a href="/profile" class="user-link mono">{$user.name || $user.email}</a>
				<Button kind="ghost" size="sm" onclick={logout}>Выйти</Button>
			{:else}
				<Button size="sm" href="/login">Войти</Button>
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
		background: oklch(from var(--bg) l c h / 0.85);
		backdrop-filter: blur(12px);
		border-bottom: 1px solid var(--line);
		padding-top: var(--safe-area-top);
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

	.auth-zone {
		display: flex;
		align-items: center;
		gap: 14px;
	}

	.user-link {
		font-size: 12px;
		color: var(--muted);
		max-width: 160px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		transition: color 0.15s ease;
	}

	.user-link:hover {
		color: var(--volt);
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
			flex-wrap: wrap;
			height: auto;
			padding-block: 12px;
		}

		nav {
			/* flex: 1 задаёт flex-basis: 0 и не даёт переноситься — сбрасываем */
			flex: none;
			order: 3;
			width: 100%;
			overflow-x: auto;
		}

		nav a {
			padding: 6px 10px;
		}

		.auth-zone {
			margin-left: auto;
		}

		.user-link {
			max-width: 110px;
		}

		main {
			padding-block: 28px 56px;
		}

		footer .container {
			flex-direction: column;
			gap: 6px;
		}
	}
</style>
