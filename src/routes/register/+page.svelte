<script lang="ts">
	import { goto } from '$app/navigation';
	import { registerFx } from '$lib/models/auth';

	let name = $state('');
	let email = $state('');
	let password = $state('');
	let error = $state('');
	const loading = registerFx.pending;

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		error = '';
		if (password.length < 8) {
			error = 'Пароль должен быть не короче 8 символов.';
			return;
		}
		try {
			await registerFx({ email, password, name });
			goto('/diary');
		} catch {
			error = 'Не удалось зарегистрироваться. Возможно, email уже занят.';
		}
	}
</script>

<div class="container">
	<div class="auth-card plate rise">
		<p class="eyebrow">// регистрация</p>
		<h1>ПЕРВЫЙ ПОДХОД</h1>

		<form onsubmit={submit}>
			<div class="field">
				<label for="name">Имя</label>
				<input id="name" type="text" bind:value={name} required autocomplete="name" />
			</div>
			<div class="field">
				<label for="email">Email</label>
				<input id="email" type="email" bind:value={email} required autocomplete="email" />
			</div>
			<div class="field">
				<label for="password">Пароль (мин. 8 символов)</label>
				<input
					id="password"
					type="password"
					bind:value={password}
					required
					autocomplete="new-password"
				/>
			</div>

			{#if error}
				<p class="error-text">{error}</p>
			{/if}

			<button class="btn" type="submit" disabled={$loading}>
				{$loading ? 'Создаю…' : 'Создать аккаунт'}
			</button>
		</form>

		<p class="muted alt">
			Уже есть аккаунт? <a href="/login">Войти</a>
		</p>
	</div>
</div>

<style>
	.auth-card {
		max-width: 420px;
		margin: 40px auto 0;
		padding: 36px 32px;
	}

	h1 {
		font-size: 26px;
		margin-block: 10px 26px;
	}

	form {
		display: flex;
		flex-direction: column;
		gap: 18px;
	}

	.alt {
		margin-top: 22px;
		font-size: 14px;
	}

	.alt a {
		color: var(--volt);
	}
</style>
