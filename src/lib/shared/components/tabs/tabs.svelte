<script lang="ts" generics="T extends string">
	let {
		tabs,
		active = $bindable()
	}: {
		tabs: { id: T; label: string }[];
		active: T;
	} = $props();
</script>

<div class="tabs rise" role="tablist">
	{#each tabs as item (item.id)}
		<button
			class="tab"
			class:active={active === item.id}
			role="tab"
			aria-selected={active === item.id}
			onclick={() => (active = item.id)}
		>
			{item.label}
		</button>
	{/each}
</div>

<style>
	.tabs {
		display: flex;
		gap: 4px;
		margin-bottom: 14px;
		animation-delay: 0.04s;
		/* на узких экранах вкладки скроллятся, а не ломают сетку */
		overflow-x: auto;
	}

	.tab {
		white-space: nowrap;
		flex-shrink: 0;
		font-family: var(--font-mono);
		font-size: 12px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: var(--muted);
		background: transparent;
		border: 1px solid var(--line);
		border-radius: var(--border-radius);
		padding: 10px 18px;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.tab:hover {
		color: var(--ink);
	}

	.tab.active {
		color: var(--volt);
		border-color: var(--volt);
		background: var(--bg-raised);
	}
</style>
