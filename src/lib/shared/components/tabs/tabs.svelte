<script lang="ts" generics="T extends string">
	let {
		tabs,
		active = $bindable(),
		label,
		size = 'md'
	}: {
		tabs: { id: T; label: string }[];
		active: T;
		label?: string;
		size?: 'sm' | 'md';
	} = $props();

	let listEl = $state<HTMLElement>();
	let thumb = $state({ left: 0, width: 0, ready: false });

	function measure() {
		if (!listEl) return;
		const el = listEl.querySelector<HTMLElement>('.tab.active');
		if (!el) return;
		const trackRect = listEl.getBoundingClientRect();
		const rect = el.getBoundingClientRect();
		thumb = {
			/* через getBoundingClientRect, а не offsetLeft/offsetWidth: те округляются
			   до целых пикселей, и при дробном паддинге трека зазоры получаются неровными */
			left: rect.left - trackRect.left - listEl.clientLeft + listEl.scrollLeft,
			width: rect.width,
			ready: true
		};
	}

	$effect(() => {
		void active;
		void tabs;
		measure();
	});

	$effect(() => {
		if (!listEl) return;
		const observer = new ResizeObserver(measure);
		observer.observe(listEl);
		for (const el of listEl.querySelectorAll('.tab')) observer.observe(el);
		return () => observer.disconnect();
	});
</script>

<div class="tabs rise" class:sm={size === 'sm'} role="tablist" aria-label={label} bind:this={listEl}>
	<span
		class="thumb"
		class:ready={thumb.ready}
		style:left="{thumb.left}px"
		style:width="{thumb.width}px"
		aria-hidden="true"
	></span>
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
		/* зазор между бегунком и краями трека */
		--track-pad: 0.1875rem;
		position: relative;
		display: flex;
		gap: 0.25rem;
		margin-bottom: 0.875rem;
		animation-delay: 0.04s;
		padding: var(--track-pad);
		background: var(--bg-sunken);
		border: 1px solid var(--line);
		border-radius: var(--radius-md);
		/* на узких экранах вкладки скроллятся, а не ломают сетку */
		overflow-x: auto;
	}

	.thumb {
		position: absolute;
		top: var(--track-pad);
		bottom: var(--track-pad);
		background: var(--bg-raised);
		border: 1px solid var(--line-strong);
		border-radius: var(--radius-sm);
		box-shadow: 0 2px 8px -2px rgb(0 0 0 / 0.35);
		opacity: 0;
	}

	.thumb.ready {
		opacity: 1;
		transition:
			left var(--spring-transition),
			width var(--spring-transition);
	}

	.tab {
		position: relative;
		flex: 1;
		white-space: nowrap;
		font-family: var(--font-mono);
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: var(--muted);
		background: transparent;
		border: 0;
		border-radius: var(--radius-sm);
		padding: 0.5rem 1rem;
		cursor: pointer;
		transition: color 0.15s ease;
	}

	.tab:hover {
		color: var(--ink);
	}

	.tab.active {
		color: var(--volt);
	}

	/* sm — компактный pill-вариант */
	.tabs.sm {
		--track-pad: 0.125rem;
		border-radius: var(--radius-pill);
	}

	.tabs.sm .thumb {
		border-radius: var(--radius-pill);
	}

	.tabs.sm .tab {
		font-size: 0.6875rem;
		padding: 0.3125rem 0.75rem;
		border-radius: var(--radius-pill);
	}
</style>
