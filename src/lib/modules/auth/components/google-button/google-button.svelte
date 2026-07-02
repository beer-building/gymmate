<script lang="ts">
	import { goto } from '$app/navigation';
	import { authModel } from '../../model';

	type Props = { label?: string; redirectTo?: string };
	const { label = 'Войти через Google', redirectTo = '/diary' }: Props = $props();

	const loading = authModel.loginWithGoogleFx.pending;
	let error = $state('');

	async function click() {
		error = '';
		try {
			await authModel.loginWithGoogleFx();
			goto(redirectTo);
		} catch (e) {
			// Закрытое popup-окно SDK тоже бросает — отдельной ошибкой это не показываем.
			const msg = (e as Error | undefined)?.message ?? '';
			if (/cancel|popup|abort/i.test(msg)) return;
			error = 'Не удалось войти через Google.';
		}
	}
</script>

<button class="google-btn" type="button" onclick={click} disabled={$loading}>
	<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
		<path
			fill="#4285F4"
			d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
		/>
		<path
			fill="#34A853"
			d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.71H.957v2.332A8.997 8.997 0 0 0 9 18z"
		/>
		<path
			fill="#FBBC05"
			d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
		/>
		<path
			fill="#EA4335"
			d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
		/>
	</svg>
	<span>{$loading ? 'Открываю Google…' : label}</span>
</button>

{#if error}
	<p class="error-text">{error}</p>
{/if}

<div class="divider"><span>или</span></div>

<style>
	.google-btn {
		width: 100%;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 10px;
		padding: 12px 16px;
		background: var(--color-surface);
		color: var(--color-text);
		border: 1px solid var(--color-border);
		border-radius: var(--border-radius);
		font: 600 14px var(--font-body);
		cursor: pointer;
		transition: border-color 0.15s ease;
	}

	.google-btn:hover:not(:disabled) {
		border-color: var(--color-border-strong);
	}

	.google-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.divider {
		display: flex;
		align-items: center;
		gap: 12px;
		color: var(--color-muted);
		font-size: 12px;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		margin: 4px 0;
	}

	.divider::before,
	.divider::after {
		content: '';
		flex: 1;
		height: 1px;
		background: var(--color-border);
	}
</style>
