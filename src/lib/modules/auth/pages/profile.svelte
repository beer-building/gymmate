<script lang="ts">
	import { goto } from '$app/navigation';
	import { authModel } from '$lib/modules/auth/model';
	import { Avatar } from '$lib/shared/components/avatar';
	import { Button } from '$lib/shared/components/button';
	import { Input } from '$lib/shared/components/input';
	import { Select } from '$lib/shared/components/select';
	import { Icon } from '$lib/shared/components/icon';
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
	let avatarBusy = $state(false);
	let avatarInput = $state<HTMLInputElement | null>(null);

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

	async function onAvatarChange(event: Event) {
		const target = event.currentTarget as HTMLInputElement;
		const file = target.files?.[0];
		if (!file) return;
		error = '';
		avatarBusy = true;
		try {
			await authModel.avatarUploadFx(file);
		} catch (e: unknown) {
			error = e instanceof Error ? e.message : 'Не удалось загрузить аватар';
		} finally {
			avatarBusy = false;
			target.value = '';
		}
	}

	async function removeAvatar() {
		error = '';
		avatarBusy = true;
		try {
			await authModel.avatarRemoveFx();
		} catch (e: unknown) {
			error = e instanceof Error ? e.message : 'Не удалось удалить аватар';
		} finally {
			avatarBusy = false;
		}
	}
</script>

{#if $user}
	<div class="container profile-page">
		<div class="header">
			<p class="eyebrow">// твой профиль</p>
			<h1>ПРОФИЛЬ</h1>
		</div>

		<div class="plate identity-card">
			<div class="identity">
				<button
					type="button"
					class="avatar-wrap"
					onclick={() => avatarInput?.click()}
					disabled={avatarBusy}
					aria-label="Загрузить аватар"
				>
					<Avatar user={$user} size="xl" ring />
					<span class="avatar-overlay">
						<Icon name="pencil" size={1} />
					</span>
				</button>
				<input
					bind:this={avatarInput}
					type="file"
					accept="image/*"
					onchange={onAvatarChange}
					hidden
				/>
				<div class="identity-info">
					<h2>{$user.name || 'Без имени'}</h2>
					<p class="muted mono">{$user.email}</p>
					{#if $user.avatar}
						<button class="avatar-remove" type="button" onclick={removeAvatar} disabled={avatarBusy}>
							удалить фото
						</button>
					{/if}
				</div>
			</div>
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
					<Button kind="ghost" onclick={cancel}>
						<Icon name="close" size={1} />
						Отмена
					</Button>
					<Button onclick={save} disabled={saving}>
						<Icon name="check" size={1} />
						{saving ? 'Сохранение...' : 'Сохранить'}
					</Button>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	.profile-page {
		padding-block: 16px;
		animation: rise 0.5s cubic-bezier(0.2, 0.7, 0.2, 1) both;
	}

	.header {
		margin-bottom: 24px;
	}

	.header h1 {
		font-size: clamp(34px, 5vw, 56px);
		margin-top: 12px;
	}

	.identity-card {
		padding: 24px 28px;
		max-width: 560px;
		margin-bottom: 18px;
		overflow: hidden;
	}

	.identity {
		display: flex;
		align-items: center;
		gap: 22px;
	}

	.avatar-wrap {
		position: relative;
		display: inline-flex;
		padding: 0;
		border: none;
		background: transparent;
		cursor: pointer;
		border-radius: 50%;
	}

	.avatar-wrap:disabled {
		cursor: progress;
		opacity: 0.6;
	}

	.avatar-overlay {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		background: oklch(0 0 0 / 0.55);
		color: var(--volt);
		opacity: 0;
		transition: opacity 0.18s ease;
	}

	.avatar-wrap:hover .avatar-overlay,
	.avatar-wrap:focus-visible .avatar-overlay {
		opacity: 1;
	}

	.identity-info {
		display: flex;
		flex-direction: column;
		gap: 4px;
		min-width: 0;
	}

	.identity-info h2 {
		font-size: clamp(20px, 2.5vw, 24px);
	}

	.identity-info p {
		font-size: 12px;
		margin: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.avatar-remove {
		margin-top: 6px;
		align-self: flex-start;
		background: none;
		border: none;
		color: var(--danger);
		font-family: var(--font-mono);
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		cursor: pointer;
		padding: 0;
	}

	.avatar-remove:disabled {
		opacity: 0.5;
		cursor: progress;
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
		.identity-card {
			padding: 20px;
		}

		.identity {
			gap: 16px;
		}

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
