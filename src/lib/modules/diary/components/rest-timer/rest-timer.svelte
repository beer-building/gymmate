<script lang="ts">
	import { diaryModel } from '../../model';
	import { Button } from '$lib/shared/components/button';
	import { Icon } from '$lib/shared/components/icon';
	import {
		notificationPermission,
		requestNotifications,
		scheduleRestEnd,
		cancelRestEnd,
		notifyRestEndNow
	} from '../../helpers/rest-notify';

	const restTimer = diaryModel.restTimer;

	let now = $state(Date.now());
	let finished = $state(false);
	let audioCtx: AudioContext | null = null;
	// показываем «колокольчик», пока разрешение не запрошено
	let permission = $state(notificationPermission());

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

		// системное уведомление на конец отдыха — сработает и при свёрнутом
		// приложении (где поддержан Notification Triggers). triggered=true —
		// ОС покажет сама, in-page дублировать не нужно.
		let triggered = false;
		void scheduleRestEnd(timer.endsAt).then((ok) => (triggered = ok));

		now = Date.now();
		const interval = setInterval(() => {
			now = Date.now();
			if (!finished && now >= timer.endsAt) {
				finished = true;
				beep();
				navigator.vibrate?.([200, 120, 200]);
				// если вкладка свёрнута и ОС-уведомление не запланировано — покажем сейчас
				if (document.hidden && !triggered) void notifyRestEndNow();
				// плашка гаснет сама; restStopped при уже пустом сторе безвреден
				setTimeout(() => diaryModel.restStopped(), 5000);
			}
		}, 250);
		return () => {
			clearInterval(interval);
			void cancelRestEnd();
		};
	});

	async function enableNotifications() {
		permission = await requestNotifications();
		// разрешили во время идущего отдыха — сразу планируем на текущий таймер
		if (permission === 'granted' && $restTimer && !finished) {
			void scheduleRestEnd($restTimer.endsAt);
		}
	}

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
				{#if !finished && permission === 'default'}
					<!-- разовый запрос разрешения: уведомить, когда отдых кончится в фоне.
				     иконка инлайн — не через динамический import Icon -->
					<Button
						kind="icon"
						class="notify-toggle"
						onclick={enableNotifications}
						title="Уведомлять, когда отдых кончится"
						aria-label="Включить уведомления об окончании отдыха"
					>
						<svg class="bell-glyph" viewBox="0 0 24 24" aria-hidden="true">
							<path
								d="M12 2.25A6.75 6.75 0 0 0 5.25 9v.75a8.217 8.217 0 0 1-2.119 5.52.75.75 0 0 0 .298 1.206c1.544.57 3.16.99 4.831 1.243a3.75 3.75 0 1 0 7.48 0 24.583 24.583 0 0 0 4.83-1.244.75.75 0 0 0 .298-1.205 8.217 8.217 0 0 1-2.118-5.52V9A6.75 6.75 0 0 0 12 2.25ZM9.75 18c0-.034 0-.067.002-.1a25.05 25.05 0 0 0 4.496 0l.002.1a2.25 2.25 0 1 1-4.5 0Z"
							/>
						</svg>
					</Button>
				{/if}
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
		box-shadow: 0 14px 40px -18px oklch(from var(--color-background) calc(l * 0.2) c h / 0.9);
	}

	.rest.finished {
		border-color: var(--color-accent);
		box-shadow:
			0 14px 40px -18px oklch(from var(--color-accent) l c h / 0.5),
			0 0 0 1px oklch(from var(--color-accent) l c h / 0.2);
	}

	.bar {
		position: absolute;
		inset: 0;
		background: oklch(from var(--color-accent) l c h / 0.12);
		border-right: 2px solid oklch(from var(--color-accent) l c h / 0.5);
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
		color: var(--color-accent);
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
		color: var(--color-accent);
	}

	.controls {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	/* колокольчик — действие, не удаление: volt вместо дефолтного danger у icon-кнопки */
	.controls :global(.notify-toggle) {
		--icon-color: var(--color-accent);
	}

	.bell-glyph {
		width: 1.05rem;
		height: 1.05rem;
		fill: currentColor;
	}

	/* на мобильном — над таб-баром (его высота ~4.25rem, см. layout) */
	@media (max-width: 720px) {
		.rest {
			bottom: calc(4.25rem + max(var(--safe-area-bottom), 0.375rem) + 10px);
		}
	}
</style>
