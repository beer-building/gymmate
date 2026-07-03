<script lang="ts">
	let content = $state('');

	interface Props {
		name: string;
		size?: number;
	}
	const { size = 1.5, name }: Props = $props();

	// глифы SF-набора обрезаны по своим границам (width/height у каждого свои),
	// поэтому растягивание в квадрат --size раздувало узкие символы (chevron)
	// и сжимало широкие (calendar). Единый кегль REF центрирует глиф в общем
	// квадрате без растяжения — относительные размеры символов как в SF-шрифте.
	const REF = 60; // чуть больше самого крупного глифа (dumbbell 59)
	const normalize = (svg: string): string => {
		const open = svg.match(/<svg([^>]*)>/);
		if (!open) return svg;
		const attrs = open[1];
		if (/viewBox=/.test(attrs)) return svg;
		const w = Number(attrs.match(/width=['"]([0-9.]+)/)?.[1]);
		const h = Number(attrs.match(/height=['"]([0-9.]+)/)?.[1]);
		if (!w || !h) return svg;
		const x = (w - REF) / 2;
		const y = (h - REF) / 2;
		return svg.replace(/<svg([^>]*)>/, `<svg$1 viewBox="${x} ${y} ${REF} ${REF}">`);
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
		flex-shrink: 0;
	}
	/* --size в rem — иконки растут вместе с font-size у :root */
	.icon :global(svg) {
		width: var(--size);
		height: var(--size);
	}
	/* CSS только перекрашивает; толщина обводки задаётся в самом ассете:
	   тонкие штриховые глифы несут stroke-width='1.0' (добирают вес),
	   сплошные залитые — stroke-width='0' (обводка их заплывает) */
	.icon :global(svg path) {
		fill: currentColor;
		stroke: currentColor;
	}
</style>
