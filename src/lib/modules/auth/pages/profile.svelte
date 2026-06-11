<script lang="ts">
	import { goto } from '$app/navigation';
	import { authModel } from '$lib/modules/auth/model';
	import { Button } from '$lib/shared/components/button';
	import { Input } from '$lib/shared/components/input';
	import { Select } from '$lib/shared/components/select';
	import type { Gender } from '$lib/shared/types';

	const user = authModel.user;

	let name = $state('');
	let email = $state('');
	let gender = $state('' as Gender | '');
	let weight = $state('');
	let height = $state('');
	let birthdate = $state('');
	let error = $state('');
	let saving = $state(false);

	user.watch((u) => {
		if (!u) {
			goto('/login');
			return;
		}
		name = u.name || '';
		email = u.email || '';
		gender = (u.gender as Gender) || '';
		weight = u.weight ? String(u.weight) : '';
		height = u.height ? String(u.height) : '';
		birthdate = u.birthdate || '';
	});

	async function save() {
		error = '';
		saving = true;
		try {
			await authModel.profileUpdateFx({
				name: name || undefined,
				gender: gender || undefined,
				weight: weight ? Number(weight) : undefined,
				height: height ? Number(height) : undefined,
				birthdate: birthdate || undefined
			});
			goto('/diary');
		} catch (e: unknown) {
			error = e instanceof Error ? e.message : 'Failed to save profile';
		} finally {
			saving = false;
		}
	}

	function cancel() {
		goto('/diary');
	}
</script>

{#if $user}
	<div class="container profile-page">
		<div class="header">
			<h1>Профиль</h1>
			<p class="muted">Управление данными аккаунта</p>
		</div>

		<div class="plate form-card">
			<div class="fields">
				<div class="field">
					<label for="profile-name">Имя</label>
					<Input
						id="profile-name"
						kind="boxed"
						size="md"
						bind:value={name}
						placeholder="Ваше имя"
					/>
				</div>

				<div class="field">
					<label for="profile-email">Email</label>
					<Input
						id="profile-email"
						kind="boxed"
						size="md"
						type="email"
						bind:value={email}
						disabled
					/>
				</div>

				<div class="field">
					<label for="profile-gender">Пол</label>
					<Select id="profile-gender" kind="boxed" size="md" bind:value={gender}>
						<option value="">Не указан</option>
						<option value="male">Мужской</option>
						<option value="female">Женский</option>
					</Select>
				</div>

				<div class="field-row">
					<div class="field">
						<label for="profile-weight">Вес (кг)</label>
						<Input
							id="profile-weight"
							kind="boxed"
							size="md"
							type="number"
							bind:value={weight}
							placeholder="70"
							min="20"
							max="300"
						/>
					</div>

					<div class="field">
						<label for="profile-height">Рост (см)</label>
						<Input
							id="profile-height"
							kind="boxed"
							size="md"
							type="number"
							bind:value={height}
							placeholder="175"
							min="100"
							max="250"
						/>
					</div>
				</div>

				<div class="field">
					<label for="profile-birthdate">Дата рождения</label>
					<Input id="profile-birthdate" kind="boxed" size="md" type="date" bind:value={birthdate} />
				</div>

				{#if error}
					<p class="error-text">{error}</p>
				{/if}

				<div class="actions">
					<Button kind="ghost" onclick={cancel}>Отмена</Button>
					<Button onclick={save} disabled={saving}>
						{saving ? 'Сохранение...' : 'Сохранить'}
					</Button>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	.profile-page {
		padding-block: 32px;
		animation: rise 0.5s cubic-bezier(0.2, 0.7, 0.2, 1) both;
	}

	.header {
		margin-bottom: 32px;
	}

	.header h1 {
		font-size: clamp(28px, 4vw, 36px);
		margin-bottom: 8px;
	}

	.form-card {
		padding: 32px;
		max-width: 560px;
	}

	.fields {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.field-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 16px;
	}

	.actions {
		display: flex;
		gap: 12px;
		justify-content: flex-end;
		margin-top: 8px;
	}

	@media (max-width: 480px) {
		.form-card {
			padding: 20px;
		}

		.field-row {
			grid-template-columns: 1fr;
		}

		.actions {
			flex-direction: column;
		}
	}
</style>
