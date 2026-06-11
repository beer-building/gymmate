<script lang="ts">
	let content = $state('');

	interface Props {
		name: string;
		size?: number;
	}
	const { size = 1.5, name }: Props = $props();

	const normalize = (svg: string): string => {
		const open = svg.match(/<svg([^>]*)>/);
		if (!open) return svg;
		const attrs = open[1];
		if (/viewBox=/.test(attrs)) return svg;
		const w = attrs.match(/width=['"]([0-9.]+)/)?.[1];
		const h = attrs.match(/height=['"]([0-9.]+)/)?.[1];
		if (!w || !h) return svg;
		return svg.replace(/<svg([^>]*)>/, `<svg$1 viewBox="0 0 ${w} ${h}">`);
	};

	const loadContent = async (n: string) => {
		const module = await import(`./icons/${n}.svg?raw`);
		content = normalize(module.default);
	};

	$effect(() => {
		loadContent(name);
	});
</script>

<span class="icon" style:--size="{size}rem" aria-hidden="true">
	<!-- SVG только из собственных ассетов ./icons — пользовательский ввод сюда не попадает -->
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html content}
</span>

<style>
	.icon {
		display: inline-flex;
		line-height: 0;
	}
	.icon :global(svg) {
		width: var(--size);
		height: var(--size);
	}
	.icon :global(svg path) {
		fill: currentColor;
		stroke: currentColor;
	}
</style>
