<!--
  The home's projects (D-M1, DEV-38), a full loop since DEV-43: the browser's own horizontal scroll
  with snap points and the real cards only (never a duplicated copy). At most two cards a view on
  desktop, one on phones and tablets; swipe, the keyboard (Tab into a card's links, or the
  arrow keys) and the previous and next buttons move it. Each button wraps past its end, so neither
  is a dead end: the reel continues in both directions. The position is the real range in view and
  is announced politely after a move; the first card in view survives a remount. The buttons and
  the position show only when the cards overflow (a fitted view stays static, controls hidden).
  No autoplay; under reduced motion the buttons jump.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { resolveLocale } from '#lib/utils/locale.ts';
	import { getLocale } from '#lib/utils/locale-context.ts';
	import { localizeHref } from '#lib/utils/locale-routing.ts';
	import { fillTemplate } from '#lib/utils/labels.ts';
	import { persisted } from '@yesid/ui/state';
	import { siteLabels } from '#lib/content/index.ts';
	import type { ProjectSummary, ProofReelContent } from '#lib/types.ts';
	import type { GlanceFact } from '#lib/utils/glance-facts.ts';
	import { SliderButton } from '@yesid/ui/brand';
	import { equalizeRows } from '#lib/utils/equalize-rows.ts';
	import HomeProjectCard from './HomeProjectCard.svelte';
	import { homeLabels } from './home-labels.ts';
	import { cardsPerView, stepStart } from './carousel-position.ts';

	const locale = getLocale();

	let {
		proofReel: proofReelContent,
		projects,
		facts = {},
	}: {
		proofReel: ProofReelContent;
		projects: readonly ProjectSummary[];
		facts?: Readonly<Record<string, readonly GlanceFact[]>>;
	} = $props();

	const prevLabel = $derived(resolveLocale(siteLabels.a11y.carouselPrev, locale));
	const nextLabel = $derived(resolveLocale(siteLabels.a11y.carouselNext, locale));
	const viewAllLabel = $derived(resolveLocale(proofReelContent.viewAllLabel, locale));
	const total = $derived(projects.length);

	let track = $state<HTMLDivElement>();
	let controls = $state<HTMLDivElement>();
	/** Cards a view: one under 1024px, at most two from there (owner, 15 November 2026). */
	let perView = $state(1);
	/** The first card in view. */
	let first = $state(0);
	let overflows = $state(false);
	let announcement = $state('');
	const stored = persisted<number>('featured-card', 0);

	/** Only an overflowing reel with two or more cards loops; a fitted view stays static. */
	const looping = $derived(overflows && total > 1);
	const last = $derived(Math.min(total, first + perView));
	const position = $derived(
		perView > 1 && last - first > 1
			? fillTemplate(resolveLocale(homeLabels.projects.positionRange, locale), { from: String(first + 1), to: String(last), total: String(total) })
			: fillTemplate(resolveLocale(homeLabels.projects.positionOne, locale), { from: String(first + 1), total: String(total) }),
	);

	function cards(): HTMLElement[] {
		return track ? Array.from(track.children) as HTMLElement[] : [];
	}

	function reducedMotion(): boolean {
		return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	}

	/** Reads the view from the track: how many cards fit, which comes first, whether they overflow. */
	function measure(): void {
		if (!track) return;
		perView = cardsPerView(total, window.matchMedia('(min-width: 1024px)').matches);
		overflows = track.scrollWidth - track.clientWidth > 1;
		// Not laid out yet (or no layout engine): keep the card the page restored.
		if (track.clientWidth === 0) return;
		const start = track.getBoundingClientRect().left;
		const offsets = cards().map((card) => Math.abs(card.getBoundingClientRect().left - start));
		first = offsets.length ? offsets.indexOf(Math.min(...offsets)) : 0;
	}

	function scrollToCard(index: number, smooth = true): void {
		const card = cards()[Math.max(0, Math.min(index, total - 1))];
		if (!track || !card) return;
		const left = card.offsetLeft - (cards()[0]?.offsetLeft ?? 0);
		track.scrollTo({ left, behavior: smooth && !reducedMotion() ? 'smooth' : 'instant' });
	}

	/** A control moves one card and wraps past either end, so the loop continues both ways. */
	function move(direction: -1 | 1, fromCard = false): number | null {
		measure();
		if (!looping) return null;
		moved = true;
		const target = stepStart(first, direction, total, perView, looping);
		scrollToCard(target, !fromCard && target === first + direction);
		return target;
	}

	let moved = false;
	let settleTimer: ReturnType<typeof setTimeout> | undefined;
	function onScroll(): void {
		clearTimeout(settleTimer);
		settleTimer = setTimeout(() => {
			const focused = document.activeElement;
			measure();
			stored.value = first;
			// Announced once the cards have settled, never on load.
			if (moved || track?.contains(focused)) announcement = position;
			moved = false;
		}, 120);
	}

	// A drag past either end wraps too: the scroll itself stops at the edge, so read the intent.
	let touchStart: { id: number; x: number; y: number; left: number } | null = null;
	function onTouchStart(event: TouchEvent): void {
		touchStart = null;
		const touch = event.touches[0];
		if (!touch || event.touches.length !== 1 || !track || !looping) return;
		if (!(event.target instanceof Node) || !track.contains(event.target)) return;
		touchStart = { id: touch.identifier, x: touch.clientX, y: touch.clientY, left: track.scrollLeft };
	}

	function onTouchEnd(event: TouchEvent): void {
		const start = touchStart;
		touchStart = null;
		const touch = event.changedTouches[0];
		if (!start || !touch || event.touches.length > 0 || event.changedTouches.length !== 1 || !track || !looping) return;
		if (touch.identifier !== start.id) return;
		const dx = touch.clientX - start.x;
		const dy = touch.clientY - start.y;
		if (Math.abs(dx) < 24 || Math.abs(dx) <= Math.abs(dy)) return;
		const max = track.scrollWidth - track.clientWidth;
		if (start.left <= 1 && dx > 0) move(-1);
		else if (start.left >= max - 1 && dx < 0) move(1);
	}

	function onTouchCancel(): void {
		touchStart = null;
	}

	/** Arrow keys move the reel while the focus is on it or on its buttons. */
	function onKeydown(event: KeyboardEvent): void {
		if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
		if (!looping) return;
		const target = event.target as Node | null;
		if (!target || !(track?.contains(target) || controls?.contains(target))) return;
		if ((target as HTMLElement).closest('input, textarea, select, [contenteditable="true"]')) return;
		event.preventDefault();
		const fromCard = Boolean(track?.contains(target));
		const focusedIndex = cards().findIndex(card => card.contains(target));
		const destination = move(event.key === 'ArrowRight' ? 1 : -1, fromCard);
		if (fromCard && destination !== null && (focusedIndex < destination || focusedIndex >= destination + perView)) {
			cards()[destination]?.querySelector<HTMLAnchorElement>('a[href]')?.focus({ preventScroll: true });
		}
	}

	/** Binds the reel's own gestures to its section: arrows over the cards and their buttons, and
	 *  the touch drag that wraps at either end. */
	function reelGestures(node: HTMLElement) {
		node.addEventListener('keydown', onKeydown);
		node.addEventListener('touchstart', onTouchStart, { passive: true });
		node.addEventListener('touchend', onTouchEnd, { passive: true });
		node.addEventListener('touchcancel', onTouchCancel, { passive: true });
		return {
			destroy() {
				node.removeEventListener('keydown', onKeydown);
				node.removeEventListener('touchstart', onTouchStart);
				node.removeEventListener('touchend', onTouchEnd);
				node.removeEventListener('touchcancel', onTouchCancel);
			},
		};
	}

	onMount(() => {
		// The card in view survives a remount (back and forward, a language switch).
		if (stored.value > 0 && stored.value < total) {
			first = Math.min(stored.value, Math.max(0, total - 1));
			scrollToCard(first, false);
		}
		measure();
		const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(() => measure());
		if (track) observer?.observe(track);
		return () => {
			clearTimeout(settleTimer);
			observer?.disconnect();
		};
	});
</script>

<div
	data-testid="proof-reel-section"
	class="proof-reel-section"
	style="--proof-per-view: {perView}"
	use:reelGestures
>
	<div
		bind:this={track}
		id="home-proof-track"
		class="proof-track"
		data-testid="proof-track"
		onscroll={onScroll}
		use:equalizeRows={['.home-card__title', '.home-card__text', '.home-card__facts']}
		data-ripple-exempt
	>
		{#each projects as project (project.slug)}
			<div class="proof-slide" data-testid="proof-slide">
				<HomeProjectCard {project} facts={facts[project.slug] ?? []} />
			</div>
		{/each}
	</div>

	<div class="proof-bar">
		<div class="proof-controls" data-testid="proof-controls" hidden={!overflows} bind:this={controls}>
			<SliderButton
				direction="previous"
				aria-label={prevLabel}
				aria-controls="home-proof-track"
				data-testid="proof-prev"
				onclick={() => move(-1)}
			/>
			<SliderButton
				direction="next"
				aria-label={nextLabel}
				aria-controls="home-proof-track"
				data-testid="proof-next"
				onclick={() => move(1)}
			/>
			<p class="proof-position" data-testid="proof-position">{position}</p>
		</div>
		<p class="sr-only" aria-live="polite" data-testid="proof-announcement">{announcement}</p>
		<p class="proof-view-all"><a data-testid="proof-view-all" href={localizeHref(proofReelContent.viewAllHref, locale)}>{viewAllLabel}</a></p>
	</div>
</div>

<style>
	.proof-reel-section {
		padding-block-end: var(--space-section-y);
		padding-inline: var(--space-page-x);
	}

	/* One card a view on phones and tablets, two on desktop, side by side on a scroll that snaps. */
	.proof-track {
		--proof-gap: 1.25rem;
		display: grid;
		grid-auto-flow: column;
		grid-auto-columns: calc((100% - (var(--proof-per-view, 1) - 1) * var(--proof-gap)) / var(--proof-per-view, 1));
		column-gap: var(--proof-gap);
		/* One card a view keeps its natural height; side by side, the cards share one. */
		align-items: start;
		overflow-x: auto;
		overscroll-behavior-x: contain;
		scroll-snap-type: x mandatory;
		scroll-behavior: smooth;
		/* Room for the cards' 1px lift and focus outlines inside the clipping scroll. */
		padding: 6px 4px;
		margin: -6px -4px;
		scroll-padding-inline: 4px;
		scrollbar-width: none;
	}

	.proof-track::-webkit-scrollbar {
		display: none;
	}

	.proof-slide {
		display: flex;
		min-width: 0;
		scroll-snap-align: start;
	}

	.proof-bar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.75rem 1.25rem;
		margin-top: 1.25rem;
	}

	.proof-controls {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.proof-controls[hidden] {
		display: none;
	}

	.proof-position {
		margin-inline-start: 0.5rem;
		font-size: var(--text-small);
		color: var(--muted-foreground);
		font-variant-numeric: tabular-nums;
	}

	/* An orange text link (base.css styles class-less links), a 44px target. */
	.proof-view-all {
		margin-inline-start: auto;
	}

	.proof-view-all :global(a) {
		display: inline-flex;
		align-items: center;
		min-height: var(--size-tap-min);
	}

	@media (prefers-reduced-motion: reduce) {
		.proof-track {
			scroll-behavior: auto;
		}
	}

	/* Desktop: the measure gives the cards their width; no extra page gutter inside it. */
	@media (--desktop-min) {
		.proof-reel-section {
			padding-inline: 0;
		}
		.proof-track {
			align-items: stretch;
		}
	}
</style>
