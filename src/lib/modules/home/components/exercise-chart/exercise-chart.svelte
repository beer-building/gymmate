<script lang="ts">
	import { Select } from '$lib/shared/components/select';
	import type { ExerciseSeries } from '../../helpers/stats';

	interface Props {
		series: ExerciseSeries[];
	}
	const { series }: Props = $props();

	const uid = $props.id();

	const ranges = [
		{ id: '2m', label: '2 мес', months: 2 },
		{ id: '6m', label: '6 мес', months: 6 },
		{ id: 'all', label: 'всё', months: 0 }
	] as const;

	let selectedKey = $state('');
	let rangeId = $state<(typeof ranges)[number]['id']>('2m');
	// индекс точки под курсором/пальцем; null — показываем последнюю
	let hover = $state<number | null>(null);

	// дефолт — последнее тренированное упражнение, где график осмыслен (≥2 точек)
	$effect(() => {
		if (selectedKey && series.some((item) => item.key === selectedKey)) return;
		selectedKey = (series.find((item) => item.points.length >= 2) ?? series[0])?.key ?? '';
	});

	const current = $derived(series.find((item) => item.key === selectedKey));

	function parseDay(date: string): Date {
		const [year, month, day] = date.split('-').map(Number);
		return new Date(year, month - 1, day);
	}

	function formatDay(time: number): string {
		return new Date(time).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
	}

	function formatReadoutDate(time: number): string {
		const date = new Date(time);
		const sameYear = date.getFullYear() === new Date().getFullYear();
		return date.toLocaleDateString('ru-RU', {
			weekday: 'short',
			day: 'numeric',
			month: 'long',
			...(sameYear ? {} : { year: 'numeric' })
		});
	}

	function formatWeight(weight: number): string {
		return weight.toLocaleString('ru-RU', { maximumFractionDigits: 1 });
	}

	// Плавная кривая без овершутов (монотонные кубические сплайны
	// Fritsch–Carlson): линия не поднимается выше и не опускается ниже
	// реальных значений — для весов это важнее красоты Catmull-Rom.
	function smoothPath(pts: { x: number; y: number }[]): string {
		const n = pts.length;
		const dx: number[] = [];
		const slope: number[] = [];
		for (let i = 0; i < n - 1; i++) {
			dx[i] = pts[i + 1].x - pts[i].x;
			slope[i] = (pts[i + 1].y - pts[i].y) / dx[i];
		}
		const m: number[] = [slope[0]];
		for (let i = 1; i < n - 1; i++) {
			if (slope[i - 1] * slope[i] <= 0) {
				m[i] = 0;
			} else {
				const w1 = 2 * dx[i] + dx[i - 1];
				const w2 = dx[i] + 2 * dx[i - 1];
				m[i] = (w1 + w2) / (w1 / slope[i - 1] + w2 / slope[i]);
			}
		}
		m[n - 1] = slope[n - 2];

		let d = `M ${pts[0].x},${pts[0].y}`;
		for (let i = 0; i < n - 1; i++) {
			const c1x = pts[i].x + dx[i] / 3;
			const c1y = pts[i].y + (m[i] * dx[i]) / 3;
			const c2x = pts[i + 1].x - dx[i] / 3;
			const c2y = pts[i + 1].y - (m[i + 1] * dx[i]) / 3;
			d += ` C ${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${pts[i + 1].x.toFixed(2)},${pts[i + 1].y.toFixed(2)}`;
		}
		return d;
	}

	// viewBox совпадает с реальной шириной контейнера (1:1 к CSS-пикселям):
	// текст и маркер не масштабируются вместе с графиком на узких экранах.
	// Подписи оси Y живут внутри поля графика (справа), как в walletbot
	let W = $state(600);
	const H = 240;
	const PAD = { left: 10, right: 10, top: 24, bottom: 24 };

	const chart = $derived.by(() => {
		if (!current) return null;
		const months = ranges.find((item) => item.id === rangeId)?.months ?? 0;
		const now = new Date();
		const from = months
			? new Date(now.getFullYear(), now.getMonth() - months, now.getDate()).getTime()
			: null;

		const points = current.points
			.map((point) => ({ ...point, time: parseDay(point.date).getTime() }))
			.filter((point) => !from || point.time >= from);
		if (points.length === 0) return null;

		const t0 = from ?? points[0].time;
		const t1 = now.getTime();
		const weights = points.map((point) => point.weight);
		let min = Math.min(...weights);
		let max = Math.max(...weights);
		if (min === max) {
			const pad = Math.max(2, max * 0.05);
			min -= pad;
			max += pad;
		} else {
			const pad = (max - min) * 0.14;
			min = Math.max(0, min - pad);
			max += pad;
		}

		const innerW = W - PAD.left - PAD.right;
		const innerH = H - PAD.top - PAD.bottom;
		const x = (time: number) => PAD.left + ((time - t0) / Math.max(1, t1 - t0)) * innerW;
		const y = (weight: number) => PAD.top + (1 - (weight - min) / (max - min)) * innerH;

		const pts = points.map((point) => ({
			x: x(point.time),
			y: y(point.weight),
			weight: point.weight,
			time: point.time
		}));

		const ticks = Array.from({ length: 4 }, (_, i) => {
			const weight = max - (i / 3) * (max - min);
			return { y: y(weight), label: formatWeight(weight) };
		});

		return {
			pts,
			path: pts.length > 1 ? smoothPath(pts) : '',
			ticks,
			xLabels: [
				{ x: PAD.left, anchor: 'start', text: formatDay(t0) },
				{ x: W - PAD.right, anchor: 'end', text: formatDay(t1) }
			]
		};
	});

	const active = $derived.by(() => {
		if (!chart) return null;
		if (hover !== null && hover < chart.pts.length) return chart.pts[hover];
		return chart.pts[chart.pts.length - 1];
	});

	const hovering = $derived(hover !== null && chart !== null && hover < chart.pts.length);

	function moveCrosshair(event: PointerEvent) {
		if (!chart) return;
		const rect = (event.currentTarget as SVGSVGElement).getBoundingClientRect();
		const x = ((event.clientX - rect.left) / rect.width) * W;
		let best = 0;
		for (let i = 1; i < chart.pts.length; i++) {
			if (Math.abs(chart.pts[i].x - x) < Math.abs(chart.pts[best].x - x)) best = i;
		}
		hover = best;
	}

	function resetCrosshair() {
		hover = null;
	}
</script>

<div class="controls">
	<Select bind:value={selectedKey} size="sm" aria-label="Упражнение">
		{#each series as item (item.key)}
			<option value={item.key}>{item.name}</option>
		{/each}
	</Select>
	<div class="ranges" role="group" aria-label="Период">
		{#each ranges as item (item.id)}
			<button
				type="button"
				class="chip"
				class:active={rangeId === item.id}
				onclick={() => (rangeId = item.id)}
			>
				{item.label}
			</button>
		{/each}
	</div>
</div>

{#if chart && active}
	<div class="readout" aria-live="polite">
		<span class="value">{formatWeight(active.weight)} <small>кг</small></span>
		<span class="date mono">{formatReadoutDate(active.time)}</span>
	</div>

	<div class="chart" bind:clientWidth={W}>
		<svg
			viewBox="0 0 {W} {H}"
			role="img"
			aria-label="График веса: {current?.name}"
			onpointermove={moveCrosshair}
			onpointerdown={moveCrosshair}
			onpointerup={resetCrosshair}
			onpointercancel={resetCrosshair}
			onpointerleave={resetCrosshair}
		>
			<defs>
				<!-- слева от курсора линия цветная, справа — гаснет, как в telegram -->
				<clipPath id="chart-clip-{uid}">
					<rect x="0" y="0" width={hovering && active ? active.x : W} height={H} />
				</clipPath>
			</defs>

			{#each chart.ticks as tick, i (i)}
				<line x1={PAD.left} x2={W - PAD.right} y1={tick.y} y2={tick.y} class="grid" />
				<text x={W - PAD.right - 2} y={tick.y - 6} class="tick" text-anchor="end">{tick.label}</text
				>
			{/each}
			{#each chart.xLabels as label, i (i)}
				<text x={label.x} y={H - 4} class="tick" text-anchor={label.anchor}>{label.text}</text>
			{/each}

			{#if chart.path}
				<path d={chart.path} class="line dim" />
				<path d={chart.path} class="line" clip-path="url(#chart-clip-{uid})" />
			{/if}

			{#if hovering && active}
				<line x1={active.x} x2={active.x} y1={PAD.top - 8} y2={H - PAD.bottom} class="crosshair" />
			{/if}
			{#if hovering || chart.pts.length === 1}
				<circle cx={active.x} cy={active.y} r="5.5" class="marker" />
			{/if}
		</svg>
	</div>
	{#if chart.pts.length === 1}
		<p class="muted note">Пока одна точка — записывай подходы, и здесь появится линия.</p>
	{/if}
{:else}
	<p class="muted note">За этот период нет подходов с весом.</p>
{/if}

<style>
	.controls {
		display: flex;
		gap: 10px;
		align-items: center;
		margin-bottom: 18px;
		flex-wrap: wrap;
	}

	.controls :global(.select) {
		flex: 1;
		min-width: 200px;
		max-width: 340px;
	}

	.ranges {
		display: flex;
		gap: 6px;
		margin-left: auto;
	}

	.readout {
		display: flex;
		flex-direction: column;
		gap: 3px;
		margin-bottom: 6px;
	}

	.readout .value {
		font-family: var(--font-display);
		font-size: 26px;
		font-weight: 800;
		color: var(--ink);
		line-height: 1.1;
	}

	.readout .value small {
		font-size: 14px;
		font-weight: 600;
		color: var(--volt);
	}

	.readout .date {
		font-size: 11px;
		color: var(--muted);
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}

	.chart {
		/* без min-width: 0 svg распирал бы flex/grid-родителя */
		min-width: 0;
	}

	svg {
		display: block;
		width: 100%;
		height: auto;
		cursor: crosshair;
		/* вертикальный скролл страницы не перехватываем, горизонтальный жест — наш */
		touch-action: pan-y;
	}

	.grid {
		stroke: var(--line);
		stroke-width: 1;
	}

	.tick {
		font-family: var(--font-mono);
		/* rem: viewBox 1:1 к пикселям, на мобильном подписи растут с базовым шрифтом */
		font-size: 0.6875rem;
		fill: var(--muted);
	}

	.line {
		fill: none;
		stroke: var(--volt);
		stroke-width: 2.5;
		stroke-linejoin: round;
		stroke-linecap: round;
	}

	.line.dim {
		stroke: oklch(from var(--muted) l c h / 0.4);
	}

	.crosshair {
		stroke: var(--line-strong);
		stroke-width: 1;
	}

	.marker {
		fill: var(--volt);
		stroke: var(--bg-raised);
		stroke-width: 2.5;
	}

	.note {
		font-size: 13px;
		margin: 10px 0 0;
	}

	@media (max-width: 600px) {
		.ranges {
			margin-left: 0;
		}
	}
</style>
