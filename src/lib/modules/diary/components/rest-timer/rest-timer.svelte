<script lang="ts">
	import { diaryModel } from '../../model';
	import { Button } from '$lib/shared/components/button';
	import { Icon } from '$lib/shared/components/icon';

	const restTimer = diaryModel.restTimer;

	let now = $state(Date.now());
	let finished = $state(false);
	let audioCtx: AudioContext | null = null;

	$effect(() => {
		const timer = $restTimer;
		finished = false;
		if (!timer) return;
		// контекст создаётся, пока жест записи подхода ещё «свежий» —
		// иначе браузер не даст проиграть сигнал через полторы минуты
		try {
			audioCtx ??= new AudioContext();
			void audioCtx.resume();
		} catch {
			audioCtx = null;
		}
		now = Date.now();
		const interval = setInterval(() => {
			now = Date.now();
			if (!finished && now >= timer.endsAt) {
				finished = true;
				beep();
				navigator.vibrate?.([200, 120, 200]);
				// плашка гаснет сама; restStopped при уже пустом сторе безвреден
				setTimeout(() => diaryModel.restStopped(), 5000);
			}
		}, 250);
		return () => clearInterval(interval);
	});

	const remaining = $derived(
		$restTimer ? Math.max(0, Math.ceil(($restTimer.endsAt - now) / 1000)) : 0
	);
	const progress = $derived(
		$restTimer
			? Math.min(1, Math.max(0, ($restTimer.endsAt - now) / 1000 / $restTimer.totalSeconds))
			: 0
	);

	function formatTime(seconds: number): string {
		const minutes = Math.floor(seconds / 60);
		return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
	}

	function beep() {
		const ctx = audioCtx;
		if (!ctx) return;
		const start = ctx.currentTime;
		for (let i = 0; i < 3; i++) {
			const oscillator = ctx.createOscillator();
			const gain = ctx.createGain();
			oscillator.type = 'sine';
			oscillator.frequency.value = 880;
			const at = start + i * 0.28;
			gain.gain.setValueAtTime(0.0001, at);
			gain.gain.exponentialRampToValueAtTime(0.35, at + 0.02);
			gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.22);
			oscillator.connect(gain).connect(ctx.destination);
			oscillator.start(at);
			oscillator.stop(at + 0.24);
		}
	}
</script>

{#if $restTimer}
	<div class="rest plate" class:finished role="timer" aria-live="polite">
		<!-- transform вместо width: composited-анимация, layout не трогается;
		     уезжающий влево край прячет overflow: hidden родителя -->
		<div
			class="bar"
			style="transform: translateX({(progress - 1) * 100}%)"
			aria-hidden="true"
		></div>
		<div class="content">
			<span class="mono label">{finished ? '// отдых окончен' : '// отдых'}</span>
			<span class="mono time">{finished ? 'ПОГНАЛИ' : formatTime(remaining)}</span>
			<div class="controls">
				{#if !finished}
					<button class="chip" onclick={() => diaryModel.restExtended(30)}>+30 сек</button>
				{/if}
				<Button
					kind="icon"
					onclick={() => diaryModel.restStopped()}
					title="Пропустить отдых"
					aria-label="Пропустить отдых"
				>
					<Icon name="close" />
				</Button>
			</div>
		</div>
	</div>
{/if}

<style>
	.rest {
		position: fixed;
		/* центрирование без transform: его перетёрла бы анимация rise */
		left: 0;
		right: 0;
		margin-inline: auto;
		bottom: calc(16px + var(--safe-area-bottom));
		z-index: 30;
		width: min(560px, calc(100% - 2rem));
		padding: 12px 16px;
		overflow: hidden;
		animation: rise var(--spring-transition) both;
		box-shadow: 0 14px 40px -18px oklch(from var(--bg) calc(l * 0.2) c h / 0.9);
	}

	.rest.finished {
		border-color: var(--volt);
		box-shadow:
			0 14px 40px -18px oklch(from var(--volt) l c h / 0.5),
			0 0 0 1px oklch(from var(--volt) l c h / 0.2);
	}

	.bar {
		position: absolute;
		inset: 0;
		background: oklch(from var(--volt) l c h / 0.12);
		border-right: 2px solid oklch(from var(--volt) l c h / 0.5);
		transition: transform 0.25s linear;
		pointer-events: none;
	}

	.content {
		position: relative;
		display: flex;
		align-items: center;
		gap: 14px;
	}

	.label {
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.18em;
		color: var(--volt);
		white-space: nowrap;
	}

	.time {
		font-size: 20px;
		font-weight: 700;
		flex: 1;
		text-align: center;
		font-variant-numeric: tabular-nums;
	}

	.finished .time {
		color: var(--volt);
	}

	.controls {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	/* на мобильном — над таб-баром (его высота ~4.25rem, см. layout) */
	@media (max-width: 720px) {
		.rest {
			bottom: calc(4.25rem + max(var(--safe-area-bottom), 0.375rem) + 10px);
		}
	}
</style>
