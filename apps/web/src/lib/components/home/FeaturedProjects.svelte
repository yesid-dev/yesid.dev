<!-- Real slides loop continuously in both directions. No autoplay or duplicate links. -->
<script lang="ts">
	import { onMount } from 'svelte';
	import EmblaCarousel, { type EmblaCarouselType } from 'embla-carousel';
	import { WheelGesturesPlugin } from 'embla-carousel-wheel-gestures';
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
	import { cardsPerView } from './carousel-position.ts';

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
	/** Whether the engine (or the absence of layout) has decided `overflows`. */
	let measured = $state(false);
	let ready = $state(false);
	let announcement = $state('');
	const stored = persisted<number>('featured-card', 0);

	let carousel: EmblaCarouselType | undefined;
	let moved = false;
	let arrowFocus = false;
	const last = $derived(total ? (first + perView - 1) % total + 1 : 0);
	const position = $derived(
		perView > 1
			? fillTemplate(resolveLocale(siteLabels.a11y.carouselPosition, locale), { from: String(first + 1), to: String(last), total: String(total) })
			: fillTemplate(resolveLocale(siteLabels.a11y.carouselPositionOne, locale), { from: String(first + 1), total: String(total) }),
	);

	function reducedMotion(): boolean {
		return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	}

	function syncPosition(api: EmblaCarouselType): void {
		perView = cardsPerView(api.slideNodes().length, window.matchMedia('(min-width: 1024px)').matches);
		overflows = api.scrollSnapList().length > 1;
		first = api.selectedScrollSnap();
		stored.value = first;
	}

	function announce(): void {
		if (moved || track?.contains(document.activeElement)) announcement = position;
		moved = false;
	}

	function move(direction: -1 | 1): number | null {
		if (!carousel || !overflows) return null;
		moved = true;
		if (direction === 1) carousel.scrollNext(reducedMotion());
		else carousel.scrollPrev(reducedMotion());
		if (reducedMotion()) announce();
		return carousel.selectedScrollSnap();
	}

	/** Tab and direct focus reveal the real card; arrow-driven focus follows the ongoing move. */
	function revealFocusedCard(api: EmblaCarouselType, event: FocusEvent): boolean {
		if (arrowFocus || !(event.target instanceof Node)) return false;
		const index = api.slideNodes().findIndex(card => card.contains(event.target as Node));
		if (index >= 0) {
			if (track) track.scrollLeft = 0;
			api.scrollTo(index, reducedMotion());
		}
		return false;
	}

	function onKeydown(event: KeyboardEvent): void {
		if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
		if (!overflows || !carousel || !(event.target instanceof HTMLElement)) return;
		const target = event.target;
		if (!(track?.contains(target) || controls?.contains(target))) return;
		if (target.closest('input, textarea, select, [contenteditable="true"]')) return;
		event.preventDefault();
		const cards = carousel.slideNodes();
		const focusedIndex = cards.findIndex(card => card.contains(target));
		const destination = move(event.key === 'ArrowRight' ? 1 : -1);
		if (destination === null || focusedIndex < 0) return;
		if ((focusedIndex - destination + cards.length) % cards.length < perView) return;
		arrowFocus = true;
		try {
			cards[destination]?.querySelector<HTMLAnchorElement>('a[href]')?.focus({ preventScroll: true });
		} finally {
			arrowFocus = false;
		}
	}

	function shiftWheel(event: WheelEvent): void {
		if (!ready || !overflows || !track || !event.shiftKey || event.ctrlKey || event.deltaX !== 0 || event.deltaY === 0) return;
		if (!(event.target instanceof Node) || !track.contains(event.target)) return;
		// Browsers deliver Shift+wheel as deltaY. Give the horizontal gesture to the same engine.
		event.preventDefault();
		event.stopImmediatePropagation();
		track.dispatchEvent(new WheelEvent('wheel', {
			bubbles: true, cancelable: true, deltaX: event.deltaY, deltaMode: event.deltaMode,
			clientX: event.clientX, clientY: event.clientY,
		}));
	}

	function reelInputs(node: HTMLElement) {
		node.addEventListener('keydown', onKeydown);
		node.addEventListener('wheel', shiftWheel, { capture: true, passive: false });
		return { destroy() {
			node.removeEventListener('keydown', onKeydown);
			node.removeEventListener('wheel', shiftWheel, true);
		} };
	}

	onMount(() => {
		perView = cardsPerView(total, window.matchMedia('(min-width: 1024px)').matches);
		first = Number.isInteger(stored.value) && stored.value >= 0 && stored.value < total ? stored.value : 0;
		// No layout (including DOM unit tests): retain the restored logical position.
		if (!track || track.clientWidth === 0 || total === 0) {
			measured = true;
			return;
		}
		track.scrollLeft = 0;
		carousel = EmblaCarousel(track, {
			align: 'start', loop: true, startIndex: first,
			watchFocus: revealFocusedCard,
			breakpoints: { '(prefers-reduced-motion: reduce)': { duration: 0 } },
		}, [WheelGesturesPlugin()]);
		ready = true;
		carousel.on('select', syncPosition).on('reInit', syncPosition).on('settle', announce);
		carousel.on('pointerDown', () => { moved = true; });
		syncPosition(carousel);
		measured = true;
		return () => { carousel?.destroy(); carousel = undefined; };
	});

</script>

<div
	data-testid="proof-reel-section"
	class="proof-reel-section"
	style="--proof-total: {Math.max(1, total)}"
	use:reelInputs
>
	<div
		bind:this={track}
		id="home-proof-track"
		class="proof-track"
		data-testid="proof-track"
		data-loop-ready={ready ? '' : undefined}
		data-ripple-exempt
	>
		<div class="proof-slides" use:equalizeRows={['.home-card__title', '.home-card__text', '.home-card__facts']}>
		{#each projects as project (project.slug)}
			<div class="proof-slide" data-testid="proof-slide">
				<HomeProjectCard {project} facts={facts[project.slug] ?? []} />
			</div>
		{/each}
		</div>
	</div>

	<div class="proof-bar">
		<!-- Until the engine measures, the card count predicts overflow so the bar has its final height
			from the first paint: one card never overflows, two only under 1024px, three or more always. -->
		<div
			class="proof-controls"
			data-testid="proof-controls"
			data-fits-wide={!measured && total === 2 ? '' : undefined}
			hidden={measured ? !overflows : total < 2}
			bind:this={controls}
		>
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

	/* The engine repositions these same real slides only while they are outside the viewport. */
	.proof-track {
		--proof-gap: 1.25rem;
		--proof-per-view: 1;
		overflow-x: auto;
		overscroll-behavior-x: contain;
		scroll-snap-type: x mandatory;
		scroll-padding-inline: 4px;
		scrollbar-width: none;
		padding: 6px 4px;
		margin: -6px -4px;
	}

	.proof-track[data-loop-ready] {
		overflow: hidden;
		scroll-snap-type: none;
		touch-action: pan-y pinch-zoom;
	}

	.proof-slides {
		display: flex;
		align-items: flex-start;
		gap: var(--proof-gap);
	}

	.proof-slide {
		display: flex;
		flex: 0 0 calc((100% - (var(--proof-per-view) - 1) * var(--proof-gap)) / var(--proof-per-view));
		min-width: 0;
		scroll-snap-align: start;
	}

	/* A looping flex gap needs its trailing seam too; fitted views have no trailing gap. */
	.proof-slide:last-child {
		margin-inline-end: var(--proof-gap);
	}

	.proof-slide:only-child {
		margin-inline-end: 0;
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

	/* Desktop: the measure gives the cards their width; no extra page gutter inside it. */
	@media (--desktop-min) {
		.proof-reel-section {
			padding-inline: 0;
		}
		.proof-track {
			--proof-per-view: min(2, var(--proof-total));
		}
		.proof-slides {
			align-items: stretch;
		}
		.proof-slide:last-child:nth-child(2) {
			margin-inline-end: 0;
		}
		.proof-controls[data-fits-wide] {
			display: none;
		}
	}

	/* Without scripts the buttons cannot move the reel; the track still scrolls natively. */
	@media (scripting: none) {
		.proof-controls {
			display: none;
		}
	}
</style>
