<script lang="ts">
	let { level, max = 5 }: { level: number; max?: number } = $props();
</script>

<div class="bar" role="img" aria-label="Сложность: {level} из {max}">
	{#each Array(max) as _, i (i)}
		<span
			class="seg"
			class:filled={i < level}
			style:background-size="{max * 100}% 100%"
			style:background-position-x="{max > 1 ? (i * 100) / (max - 1) : 0}%"
		></span>
	{/each}
</div>

<style>
	.bar {
		display: flex;
		gap: 0.1875rem;
		width: 100%;
	}

	.seg {
		flex: 1;
		height: 0.375rem;
		border-radius: 999px;
		background-color: var(--color-border);
	}

	/* каждое деление показывает свой срез общего градиента:
	   фон шириной во всю полоску, сдвинутый под номер деления */
	.seg.filled {
		background-color: transparent;
		background-image: linear-gradient(90deg, #7ed957, #e8c33b, #e03c31);
	}
</style>
