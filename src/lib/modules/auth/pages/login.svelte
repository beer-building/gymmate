<script lang="ts">
	import { goto } from '$app/navigation';
	import { authModel } from '../model';
	import { GoogleButton } from '../components/google-button';
	import { Button } from '$lib/shared/components/button';

	let email = $state('');
	let password = $state('');
	let error = $state('');
	const loading = authModel.loginFx.pending;

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		error = '';
		try {
			await authModel.loginFx({ email, password });
			goto('/diary');
		} catch {
			error = 'Неверный email или пароль.';
		}
	}
</script>

<div class="container">
	<div class="auth-card plate rise">
		<p class="eyebrow">// вход</p>
		<h1>С ВОЗВРАЩЕНИЕМ</h1>

		<GoogleButton />

		<form onsubmit={submit}>
			<div class="field">
				<label for="email">Email</label>
				<input id="email" type="email" bind:value={email} required autocomplete="email" />
			</div>
			<div class="field">
				<label for="password">Пароль</label>
				<input
					id="password"
					type="password"
					bind:value={password}
					required
					autocomplete="current-password"
				/>
			</div>

			{#if error}
				<p class="error-text">{error}</p>
			{/if}

			<Button type="submit" disabled={$loading}>
				{$loading ? 'Вхожу…' : 'Войти'}
			</Button>
		</form>

		<p class="muted alt">
			Нет аккаунта? <a href="/register">Зарегистрироваться</a>
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

	@media (max-width: 480px) {
		.auth-card {
			margin-top: 16px;
			padding: 26px 18px;
		}
	}
</style>
