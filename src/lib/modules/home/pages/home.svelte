<script lang="ts">
	import { authModel } from '$lib/modules/auth/model';
	import Landing from './landing.svelte';
	import Dashboard from './dashboard.svelte';

	const user = authModel.user;
</script>

{#if $user}
	<Dashboard />
{:else}
	<Landing />
{/if}
