<script lang="ts">
	import { goto } from '$app/navigation';
	import { authModel } from '$lib/modules/auth/model';
	import Landing from './landing.svelte';

	const user = authModel.user;

	// дашборд живёт в профиле — залогиненному на лендинге делать нечего
	$effect(() => {
		if ($user) goto('/profile', { replaceState: true });
	});
</script>

{#if !$user}
	<Landing />
{/if}
