<script lang="ts">
	import { goto } from '$app/navigation';
	import { authModel } from '$lib/modules/auth/model';
	import { profileModel } from '../model';
	import { Dashboard } from '../components/dashboard';
	import { Avatar } from '$lib/shared/components/avatar';
	import { Button } from '$lib/shared/components/button';
	import { Input } from '$lib/shared/components/input';
	import { Select } from '$lib/shared/components/select';
	import { Icon } from '$lib/shared/components/icon';
	import type { Gender } from '$lib/shared/types';

	const user = authModel.user;

	let editing = $state(false);
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

	function fillFromUser(u: NonNullable<typeof $user>) {
		name = u.name || '';
		email = u.email || '';
		gender = (u.gender as Gender) || '';
		weight = u.weight ? String(u.weight) : '';
		height = u.height ? String(u.height) : '';
		birthdate = u.birthdate || '';
	}

	user.watch((u) => {
		if (!u) {
			goto('/login');
			return;
		}
		fillFromUser(u);
	});

	$effect(() => {
		if ($user) profileModel.profilePageOpened();
	});

	// краткая строка параметров под именем: только заполненные
	const summary = $derived.by(() => {
		const u = $user;
		if (!u) return '';
		const parts: string[] = [];
		if (u.weight) parts.push(`${u.weight} кг`);
		if (u.height) parts.push(`${u.height} см`);
		if (u.birthdate) {
			const age = Math.floor(
				(Date.now() - new Date(u.birthdate).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
			);
			if (age > 0) parts.push(`${age} лет`);
		}
		return parts.join(' · ');
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
			editing = false;
		} catch (e: unknown) {
			error = e instanceof Error ? e.message : 'Не удалось сохранить профиль';
		} finally {
			saving = false;
		}
	}

	function cancel() {
		if ($user) fillFromUser($user);
		error = '';
		editing = false;
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
	<div class="container narrow">
		<header class="rise">
			<p class="eyebrow">// твой профиль</p>
			<h1>ПРОФИЛЬ</h1>
		</header>

		{#if editing}
			<div class="plate identity-card rise">
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
							<button
								class="avatar-remove hit-target"
								type="button"
								onclick={removeAvatar}
								disabled={avatarBusy}
							>
								удалить фото
							</button>
						{/if}
					</div>
				</div>
			</div>

			<div class="plate form-card rise" style="animation-delay: 0.06s">
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
						<Input
							id="profile-birthdate"
							kind="boxed"
							size="md"
							type="date"
							bind:value={birthdate}
						/>
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
		{:else}
			<section class="plate person rise">
				<Avatar user={$user} size="lg" ring />
				<div class="person-info">
					<h2>{$user.name || 'Без имени'}</h2>
					<p class="muted mono email">{$user.email}</p>
					{#if summary}
						<p class="mono params">{summary}</p>
					{/if}
				</div>
				<Button kind="ghost" size="sm" onclick={() => (editing = true)}>
					<Icon name="pencil" size={0.9} />
					Изменить
				</Button>
			</section>

			<Dashboard />
		{/if}
	</div>
{/if}

<style>
	.narrow {
		max-width: 820px;
	}

	header {
		margin-bottom: 24px;
	}

	h1 {
		font-size: clamp(34px, 5vw, 56px);
		margin-top: 12px;
	}

	/* --- компактная карточка профиля --- */

	.person {
		display: flex;
		align-items: center;
		gap: 18px;
		padding: 20px 24px;
		margin-bottom: 14px;
	}

	.person-info {
		display: flex;
		flex-direction: column;
		gap: 3px;
		min-width: 0;
		flex: 1;
	}

	.person-info h2 {
		font-size: clamp(18px, 2.5vw, 22px);
		overflow-wrap: anywhere;
	}

	.person-info .email {
		font-size: 12px;
		margin: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.person-info .params {
		font-size: 11px;
		margin: 2px 0 0;
		color: var(--volt);
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}

	/* --- редактирование --- */

	.identity-card {
		padding: 24px 28px;
		margin-bottom: 14px;
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
		/* кнопка «изменить» не сжимает имя — уходит вторым рядом */
		.person {
			display: grid;
			grid-template-columns: auto minmax(0, 1fr);
			padding: 16px;
			gap: 12px 14px;
		}

		.person :global(.btn) {
			grid-column: 1 / -1;
			justify-self: start;
		}

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
