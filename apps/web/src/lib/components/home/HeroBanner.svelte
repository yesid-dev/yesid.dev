<!-- Scroll-driven metro intro with an in-place collapse and reversible replay. -->
<script lang="ts">
	import { onMount, onDestroy, tick, untrack } from 'svelte';
	import { isPrefersReducedMotion } from '@yesid/motion/stores/reducedMotion';
	import { clock } from '@yesid/ui/state';
	import { homeIntroStore } from '#lib/state/home-intro.svelte.ts';
	import {
		initScrollTriggerConfig,
		loadDrawSVG,
		loadCustomEase,
		ScrollTrigger,
		gsap,
	} from '@yesid/motion/utils/gsap';
	import { createHeroTimeline } from '#lib/motion/scrubs/index.ts';
	import { isViewportAtMost } from '@yesid/motion/utils/device';
	import { getLenis } from '@yesid/motion/utils/lenis';
	import { heroRewindEase } from '#lib/motion/utils/heroRewind.ts';
	import { siteLabels } from '#lib/content/index.ts';
	import {
		fetchLiveKpis,
		generateHeroData,
		startLiveKpiPolling,
		type HeroData,
		type LiveHeroSnapshot,
	} from '#lib/live/index.ts';
	import type { HeroContent, HeroAnimContent, LocalizedString, ProjectSummary } from '#lib/types.ts';
	import { resolveLocale } from '#lib/utils/locale.ts';
	import { getLocale } from '#lib/utils/locale-context.ts';
	import { localizeHref } from '#lib/utils/locale-routing.ts';
	import { fillTemplate } from '#lib/utils/labels.ts';

	const locale = getLocale();
	import MetroNetwork from '#lib/motion/svg/MetroNetwork.svelte';
	import HeroTextContent from './HeroTextContent.svelte';
	import HeroTransitCard, { type ReadingState } from './HeroTransitCard.svelte';

	interface Props {
		metroSvg: string;
		hero: HeroContent;
		heroAnim: HeroAnimContent;
		initialHeroData: HeroData;
		/** Contact channels Calendar link opened by the second hero button. */
		bookingHref: string;
		/** Transit, the opening's showcase (screenshots, words and links). */
		transitProject?: ProjectSummary;
	}
	let { metroSvg, hero: heroContent, heroAnim: heroAnimContent, initialHeroData: INITIAL_HERO_DATA, bookingHref, transitProject }: Props = $props();

	let pinContainer: HTMLDivElement;
	let svgWrapper: HTMLDivElement;
	let scrollPrompt: HTMLParagraphElement;
	let scrollText: HTMLSpanElement;

	const scrollDownLabel = $derived(resolveLocale(heroAnimContent.scrollDown, locale));
	// Fit a nowrap mono line to 90vw; budget one extra character for the cursor.
	const billboardVw = $derived.by(() => {
		const len = scrollDownLabel.length + 1;
		const size = (90 / len + 0.5) / 0.6;
		return Math.min(8, Math.max(4, size)).toFixed(2);
	});
	const heading = $derived(resolveLocale(heroContent.opening.sentence, locale));
	const lead = $derived(resolveLocale(heroContent.opening.lead, locale));
	const ctaProjectLabel = $derived(resolveLocale(heroContent.opening.ctaProject, locale));
	const bookingLabel = $derived(resolveLocale(heroContent.ctaContact, locale));
	const newTabLabel = ` ${resolveLocale(siteLabels.a11y.opensNewTab, locale)}`;
	// Seed once from the prop, then let refreshes own the local data.
	let heroData: HeroData = $state(untrack(() => INITIAL_HERO_DATA));
	// LIVE labels require real transit data; simulated values must retain DEMO labels.
	let live = $state(false);
	let readingState = $state<ReadingState>('demo');
	const regenerateLabel = $derived(resolveLocale(heroContent.refreshButton.label, locale));
	const t = siteLabels.transit;
	const words = (value: LocalizedString) => resolveLocale(value, locale);

	const sceneWords = $derived({
		name: resolveLocale(heroContent.scene.name, locale),
		open: resolveLocale(heroContent.scene.open, locale),
		close: resolveLocale(heroContent.scene.close, locale),
	});
	let reducedMotion = $state(false);
	let stillOpen = $state(false);
	let stillScene = $state<HTMLElement>();
	const replayAriaLabel = $derived(reducedMotion ? (stillOpen ? sceneWords.close : sceneWords.open) : resolveLocale(siteLabels.a11y.replayIntro, locale));
	async function toggleStillScene(): Promise<void> {
		stillOpen = !stillOpen;
		await tick();
		const target = stillOpen ? stillScene : heroTextContainer.querySelector<HTMLButtonElement>('[data-testid="hero-dot-replay"]');
		target?.scrollIntoView({ behavior: 'instant', block: 'center' });
		target?.focus({ preventScroll: true });
	}

	const metroCaption = resolveLocale(siteLabels.ui.metroCaption, locale);

	let heroTextContainer: HTMLDivElement;

	// The shared clock advances server-provided freshness between polls.
	let liveBase = $state<{ freshnessS: number; receivedAt: number } | null>(null);
	$effect(() => clock.subscribe());
	const ageSeconds = $derived(
		liveBase ? liveBase.freshnessS + Math.max(0, Math.round((clock.now - liveBase.receivedAt) / 1000)) : 0,
	);

	/** "22 seconds", "1 minute", "3 minutes" in the page language. */
	function ageWords(seconds: number): string {
		const s = Math.max(1, Math.round(seconds));
		if (s < 60) return s === 1 ? words(t.second) : fillTemplate(words(t.seconds), { n: String(s) });
		const m = Math.floor(s / 60);
		return m === 1 ? words(t.minute) : fillTemplate(words(t.minutes), { n: String(m) });
	}

	// A refresh the visitor asked for that did not bring new data; cleared by the next reading.
	let refreshFailed = $state(false);
	let refreshing = $state(false);
	let announcement = $state('');

	/** The words beside the figures: what the reading is and how old, or why it is not live. */
	const stateLine = $derived.by((): { word?: string; text: string } => {
		const age = ageWords(ageSeconds);
		if (refreshFailed && (readingState === 'live' || readingState === 'held')) {
			return { text: fillTemplate(words(t.refreshFailedKept), { age }) };
		}
		if (refreshFailed && readingState === 'failure') return { text: words(t.refreshFailedDemo) };
		if (readingState === 'live') {
			return {
				word: words(t.stateLive),
				text: ageSeconds < 10 ? words(t.updatedJustNow) : fillTemplate(words(t.updatedAgo), { age }),
			};
		}
		if (readingState === 'held') return { text: fillTemplate(words(t.stateHeld), { age }) };
		if (readingState === 'failure') return { text: resolveLocale(heroContent.sqlPanel.failure, locale) };
		return {
			text: `${resolveLocale(heroContent.sqlPanel.liveLabel, locale)}. ${resolveLocale(heroContent.refreshButton.helper, locale)}`,
		};
	});

	function applyLiveSnapshot(snapshot: LiveHeroSnapshot) {
		heroData = snapshot.data;
		live = true;
		readingState = 'live';
		refreshFailed = false;
		liveBase = { freshnessS: snapshot.freshnessS, receivedAt: Date.now() };
	}

	function dropToDemo() {
		live = false;
		readingState = 'failure';
		liveBase = null;
		heroData = generateHeroData();
	}

	let consecutiveFailures = 0;
	let pendingLiveCheck: Promise<boolean> | null = null;
	/** One live check; resolves true when a reading arrived. */
	function refreshLive(): Promise<boolean> {
		// A click during a poll shares that check instead of consuming two failures.
		if (pendingLiveCheck) return pendingLiveCheck;
		pendingLiveCheck = fetchLiveKpis().then((snapshot) => {
			if (destroyed) return false;
			if (snapshot) {
				consecutiveFailures = 0;
				applyLiveSnapshot(snapshot);
				return true;
			}
			consecutiveFailures += 1;
			// Keep the original liveBase so a held real reading keeps ageing.
			if (live && consecutiveFailures < 2) readingState = 'held';
			else if (live) dropToDemo();
			else readingState = 'failure';
			return false;
		}).finally(() => { pendingLiveCheck = null; });
		return pendingLiveCheck;
	}

	/** Said politely: cleared first, so the same words are announced again. */
	function announce(text: string): void {
		announcement = '';
		setTimeout(() => { if (!destroyed) announcement = text; }, 80);
	}

	/** Refresh asks Transit at once; the focus stays on the button, which says it is working. */
	async function handleRefresh(): Promise<void> {
		if (refreshing || !liveEnabled) return;
		refreshing = true;
		const arrived = await refreshLive();
		if (destroyed) return;
		refreshing = false;
		refreshFailed = !arrived;
		announce(arrived ? words(t.refreshed) : stateLine.text);
	}

	function handleRegenerate(): void {
		heroData = generateHeroData();
	}

	// Automated browsers use deterministic demo data so E2E runs do not depend on the transit service.
	let liveEnabled = false;
	onMount(() => {
		if (navigator.webdriver) return;
		liveEnabled = true;
		const stopLivePolling = startLiveKpiPolling(() => { void refreshLive(); });
		return stopLivePolling;
	});

	let cleanup: (() => void) | undefined;
	let destroyed = false;
	onDestroy(() => {
		destroyed = true;
		stopRewind();
		cleanup?.();
		homeIntroStore.reset();
	});

	let replayEnabled = $state(false);
	let introCollapsed = $state(true);
	let heroApproaching = $state(false);
	let replayArming = false;
	let restoreReplayFocus = false;

	async function setupIntro(): Promise<void> {
		await tick();
		if (destroyed) return;

		const svg = pinContainer?.querySelector('[data-testid="metro-network"]');
		if (!svg) {
			homeIntroStore.settle();
			return;
		}

		const heroDot = heroTextContainer.querySelector('.hero-dot') as SVGSVGElement;

		await Promise.all([loadDrawSVG(), loadCustomEase()]);
		if (destroyed) return;
		initScrollTriggerConfig();

		// The scroll instruction stays still throughout the intro.
		scrollText.textContent = scrollDownLabel;

		await document.fonts.ready;
		if (destroyed) return;

		// Choose pin length once at mount; resizing across the breakpoint does not rebuild the timeline.
		const isMobile = isViewportAtMost(1023);

		const destroyHero = createHeroTimeline(pinContainer, {
			svgWrapper,
			heroTextContainer,
			heroDot,
			scrollPrompt,
			pinLength: isMobile ? '300%' : '800%',
			onHeroApproach: approaching => { heroApproaching = approaching; },
			// Refresh before rewind because a deferred refresh would restore scroll and cancel native smooth scrolling.
			skipDeferredRefresh: true,
			// Defer teardown until outside the timeline update.
			onIntroComplete: () => {
				if (replayArming) return;
				requestAnimationFrame(() => {
					void collapseIntroTrack();
				});
			},
		});

		function onVisibilityChange() {
			if (!document.hidden) {
				ScrollTrigger.refresh();
			}
		}
		document.addEventListener('visibilitychange', onVisibilityChange);

		cleanup = () => {
			destroyHero();
			document.removeEventListener('visibilitychange', onVisibilityChange);
		};
	}

	let rewindFrame: number | undefined;
	let rewindTrigger: ReturnType<typeof ScrollTrigger.getAll>[number] | undefined;
	let finishRewind: (() => void) | undefined;
	let refreshProgress: number | undefined;
	function setRewindLayers(): void {
		// Avoid retaining oversized compositor surfaces on narrow and touch viewports.
		gsap.set([heroTextContainer, svgWrapper], { force3D: !isViewportAtMost(1023) && ScrollTrigger.isTouch === 0 });
	}
	function prepareRewindRefresh(): void {
		if (!rewindTrigger?.animation) return;
		refreshProgress = rewindTrigger.animation.progress();
		// Global refresh reverts every pin, including disabled ones. Let it measure and restore ours too.
		rewindTrigger.enable(false, false);
	}
	function restoreRewindRefresh(): void {
		if (!rewindTrigger?.animation || refreshProgress === undefined) return;
		rewindTrigger.disable(false);
		rewindTrigger.animation.progress(refreshProgress);
		setRewindLayers();
		refreshProgress = undefined;
	}
	function stopRewind(): void {
		ScrollTrigger.removeEventListener('refreshInit', prepareRewindRefresh);
		ScrollTrigger.removeEventListener('refresh', restoreRewindRefresh);
		refreshProgress = undefined;
		if (rewindFrame !== undefined) cancelAnimationFrame(rewindFrame);
		rewindFrame = undefined;
		const trigger = rewindTrigger; rewindTrigger = undefined;
		if (trigger?.animation && !destroyed) {
			// Match the document to the already-painted frame before handing control back to scrolling.
			const paintedProgress = trigger.animation.progress();
			const top = trigger.start + paintedProgress * (trigger.end - trigger.start);
			jumpTo(top);
			trigger.enable(false, false);
			ScrollTrigger.update();
			const scrub = trigger.getTween();
			if (scrub) scrub.pause();
			trigger.animation.progress(paintedProgress);
		}
		if (trigger) gsap.set([heroTextContainer, svgWrapper], { force3D: 'auto' });
		const finish = finishRewind; finishRewind = undefined; finish?.();
	}

	function scrollBackToTop(): Promise<void> {
		stopRewind();
		const trigger = ScrollTrigger.getAll().find(t => t.trigger === pinContainer && Boolean(t.vars.pin));
		if (!trigger?.animation) { jumpTo(0); return Promise.resolve(); }
		const animation = trigger.animation;
		// Touch scrubbing may still be catching up to the prepared end frame.
		const scrub = trigger.getTween();
		if (scrub) scrub.progress(1);
		animation.progress(1);
		rewindTrigger = trigger;
		// Keep the pin's geometry, but avoid full-page scroll/layout work for every reverse frame.
		trigger.disable(false);
		ScrollTrigger.addEventListener('refreshInit', prepareRewindRefresh);
		ScrollTrigger.addEventListener('refresh', restoreRewindRefresh);
		setRewindLayers();
		const startedAt = performance.now();
		return new Promise(resolve => {
			finishRewind = resolve;
			const frame = () => {
				// A busy touch frame can deliver an old RAF timestamp. Use the current clock so the final handoff cannot lag behind it.
				const elapsed = Math.min(1, (performance.now() - startedAt) / 2000);
				animation.progress(1 - heroRewindEase(elapsed));
				if (elapsed < 1) rewindFrame = requestAnimationFrame(frame);
				else stopRewind();
			};
			rewindFrame = requestAnimationFrame(frame);
		});
	}

	// Clear all intro inline styles so replay starts from the same CSS baseline as a fresh mount.
	function clearIntroSceneStyles(): void {
		const pieces = pinContainer.querySelectorAll(
			'.metro-line, .metro-station, .metro-bg, .metro-label, .metro-caption',
		);
		const staggers = heroTextContainer.querySelectorAll('[data-hero-stagger]');
		gsap.set(
			[svgWrapper, scrollPrompt, heroTextContainer, ...Array.from(staggers), ...Array.from(pieces)],
			{ clearProps: 'all' },
		);
		svgWrapper.style.transformOrigin = '';
		heroTextContainer.style.transformOrigin = '';
	}

	// Collapse the track and subtract its removed height so the settled hero stays in place.
	async function collapseIntroTrack(): Promise<void> {
		if (destroyed || introCollapsed) return;
		const beforeHeight = document.documentElement.scrollHeight;
		const beforeY = window.scrollY;
		cleanup?.();
		cleanup = undefined;
		clearIntroSceneStyles();
		introCollapsed = true;
		await tick();
		if (destroyed) return;
		const delta = Math.max(0, beforeHeight - document.documentElement.scrollHeight);
		jumpTo(Math.max(0, beforeY - delta));
		ScrollTrigger.refresh();
		homeIntroStore.settle();
		if (restoreReplayFocus && document.activeElement === document.body) {
			heroTextContainer.querySelector<HTMLButtonElement>('[data-testid="hero-dot-replay"]')?.focus({ preventScroll: true });
		}
		restoreReplayFocus = false;
	}

	function jumpTo(top: number): void {
		const lenis = getLenis();
		if (lenis) {
			// Resize Lenis before jumping; its debounced geometry cache otherwise clamps against the old track height.
			lenis.resize();
			lenis.scrollTo(top, { immediate: true, force: true });
		} else {
			window.scrollTo({ top, behavior: 'auto' });
		}
	}

	// Rebuild and correct the pin end before paint, then rewind; jumping directly to the end must not arm completion.
	async function handleReplay(): Promise<void> {
		if (destroyed || replayArming || !replayEnabled) return;
		if (reducedMotion) { await toggleStillScene(); return; }
		heroApproaching = false;
		restoreReplayFocus = document.activeElement === heroTextContainer.querySelector('[data-testid="hero-dot-replay"]');
		homeIntroStore.begin();
		replayArming = true;
		try {
			if (introCollapsed) {
				// Preload before geometry changes so chunk fetching cannot expose an intermediate frame.
				await Promise.all([loadDrawSVG(), loadCustomEase()]);
				if (destroyed) return;
				const beforeHeight = document.documentElement.scrollHeight;
				const beforeY = window.scrollY;
				// Shield the settled text across the class flip until the rebuilt timeline owns opacity.
				heroTextContainer.style.opacity = '1';
				introCollapsed = false; // re-enlarge the track
				await tick();
				if (destroyed) return;
				// Overshoot by one viewport so the first render cannot arm completion and collapse the rebuilt track.
				jumpTo(
					beforeY +
						Math.max(0, document.documentElement.scrollHeight - beforeHeight) +
						window.innerHeight,
				);
				await setupIntro();
				if (destroyed) return;
				// Remove the shield before tween initialization so backward scrubbing restores CSS opacity instead of the shield.
				heroTextContainer.style.opacity = '';
				// Refresh materializes pin bounds and updates downstream triggers before the corrective jump.
				ScrollTrigger.refresh();

				const st = ScrollTrigger.getAll().find(
					(t) => t.trigger === pinContainer && Boolean(t.vars.pin),
				);
				if (st) {
					jumpTo(st.end + Math.max(0, beforeY - st.start));

					ScrollTrigger.update();
				}
			}
			await scrollBackToTop();
		} finally {
			replayArming = false;
		}
	}

	onMount(() => {
		replayEnabled = true;
		const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
		const update = () => {
			reducedMotion = preference.matches;
			if (reducedMotion) stopRewind();
			if (stillOpen) {
				stillOpen = false;
				heroTextContainer.querySelector<HTMLButtonElement>('[data-testid="hero-dot-replay"]')?.focus({ preventScroll: true });
			}
			if (reducedMotion && !introCollapsed) void collapseIntroTrack();
		};
		update();
		preference.addEventListener('change', update);
		window.addEventListener('wheel', stopRewind, { passive: true });
		window.addEventListener('touchstart', stopRewind, { passive: true });
		homeIntroStore.settle();
		return () => {
			preference.removeEventListener('change', update);
			window.removeEventListener('wheel', stopRewind);
			window.removeEventListener('touchstart', stopRewind);
		};
	});

</script>

<section
	class="hero-section-reserve relative {introCollapsed ? 'hero-intro-done' : ''}"
	data-testid="hero-banner"
>
	<div
		bind:this={pinContainer}
		class="hero-pin relative flex w-full items-center justify-center overflow-hidden"
		style="padding-bottom: env(safe-area-inset-bottom, 0px);"
	>

		<div
			bind:this={svgWrapper}
			class="hero-metro-wrapper absolute inset-0 flex items-center justify-center md:px-4 md:pr-20"
		>
			<!-- Size the lamp against the pin viewport so track-height changes cannot rescale it. -->
			<div class="hero-lamp" aria-hidden="true"></div>
			<MetroNetwork svg={metroSvg} />
			<!-- The caption occupies the art-free bottom strip outside the centered metro frame. -->
			{#if metroCaption}
				<p class="metro-caption" data-testid="metro-caption" aria-hidden="true">
					{metroCaption}
				</p>
			{/if}
		</div>

		<div
			bind:this={heroTextContainer}
			class="hero-text-layer absolute inset-0 flex items-start justify-center opacity-0 lg:items-center"
			data-testid="hero-text-container"
		>
			<div class="w-full px-[var(--space-page-x)]">
				<div class="hero-grid">
					<HeroTextContent
						{heading}
						{lead}
						{ctaProjectLabel}
						ctaProjectHref={localizeHref('/contact', locale)}
						{bookingLabel}
						{bookingHref}
						{newTabLabel}
						{replayEnabled}
						beaconSettled={introCollapsed}
						{replayAriaLabel}
						replayExpanded={reducedMotion ? stillOpen : undefined}
						onReplay={handleReplay}
					/>

					<div class="hero-transit-slot" data-hero-stagger="4">
						<HeroTransitCard
							project={transitProject}
							{heroData}
							{readingState}
							{stateLine}
							{refreshing}
							{announcement}
							{regenerateLabel}
							onRefresh={handleRefresh}
							onRegenerate={handleRegenerate}
						/>
					</div>
				</div>
			</div>
		</div>

		<p
			bind:this={scrollPrompt}
			class="scroll-prompt pointer-events-none absolute left-0 w-full text-center font-mono font-black uppercase leading-[0.95] text-primary md:whitespace-nowrap md:leading-none"
			style="--billboard-vw: {billboardVw}vw"
		>
			<span bind:this={scrollText}></span>
		</p>
	</div>

	{#if reducedMotion && stillOpen}
		<section id="metro-still-scene" bind:this={stillScene} tabindex="-1" aria-label={sceneWords.name}
			class="metro-still-scene mx-auto w-full max-w-5xl p-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
			<h2 class="text-center">{sceneWords.name}</h2>
			<MetroNetwork svg={metroSvg} still />
		</section>
	{/if}

</section>

<style>
	/* Reserve the trigger height plus its pin extension. */
	.hero-section-reserve {
		min-height: 450svh;
	}

	@media (--desktop-min) {
		.hero-section-reserve {
			min-height: 900svh;
		}
	}

	.hero-pin {
		height: 100lvh;
	}

	.hero-lamp {
		position: absolute;
		inset: 0;
		pointer-events: none;
		background-image: radial-gradient(120vw 100% at 50% 0%, color-mix(in srgb, var(--glow) 12%, transparent), transparent 60%);
	}

	/* CSS disables the intro and scroll reserve under reduced motion before hydration. */
	@media (prefers-reduced-motion: reduce) {
		.hero-section-reserve {
			min-height: 100svh;
		}

		.hero-pin {
			height: auto;
			min-height: 100svh;
		}

		.hero-metro-wrapper {
			display: none;
		}

		.scroll-prompt {
			display: none;
		}

		:global(.hero-section-reserve [data-testid='hero-text-container']) {
			align-self: stretch;
			align-items: start;
			opacity: 1 !important;
			position: relative !important;
		}
	}

	/* The collapsed hero is the SSR default; replay temporarily restores the full intro track.
	   Anchor the settled layer and grid below the header while their content is being parsed. */
	.hero-section-reserve.hero-intro-done {
		min-height: 100svh;
	}

	.hero-intro-done .hero-pin {
		height: auto;
		min-height: 100svh;
	}

	.hero-intro-done .hero-metro-wrapper {
		display: none;
	}

	.hero-intro-done .scroll-prompt {
		display: none;
	}

	:global(.hero-section-reserve.hero-intro-done [data-testid='hero-text-container']) {
		align-self: stretch;
		align-items: start;
		opacity: 1 !important;
		position: relative !important;
		transform: none !important;
	}

	/* Keep the caption in the wrapper's art-free bottom strip to prevent overlap at every breakpoint. */
	.metro-caption {
		position: absolute;
		left: 50%;
		transform: translateX(-50%);
		bottom: clamp(10px, 2.5vh, 28px);
		margin: 0;

		width: max-content;
		max-width: calc(100vw - 32px);
		text-align: center;
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--secondary-foreground);
		opacity: 0;
		pointer-events: none;
	}

	@media (--tablet-min) {
		.metro-caption {
			font-size: var(--text-micro);
		}
	}

	.hero-text-layer {
		/* While the intro plays, the layer floats over the metro scene and lets the scroll through. */
		pointer-events: none;
		width: 100%;
		padding-top: calc(var(--nav-clearance) + 1rem);
		padding-bottom: 2rem;
	}

	.hero-text-layer :global(a),
	.hero-text-layer :global(button) {
		pointer-events: auto;
	}

	/* Settled (the default) or reduced motion: the layer is the opening itself, in the page's flow,
	   so every part of it, the Transit card included, takes the pointer and taps. */
	:global(.hero-section-reserve.hero-intro-done [data-testid='hero-text-container']) {
		pointer-events: auto;
	}

	@media (prefers-reduced-motion: reduce) {
		:global(.hero-section-reserve [data-testid='hero-text-container']) {
			pointer-events: auto;
		}
	}

	/* Phones and tablets stack: the offer, then Transit. */
	.hero-grid {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 2rem;
		align-items: start;
	}

	.scroll-prompt {
		font-size: 11.5vw;
		letter-spacing: -0.3vw;
		bottom: calc(100lvh - 100dvh);
	}

	@media (--tablet-min) {
		.scroll-prompt {
			font-size: var(--billboard-vw, 6.8vw);
			letter-spacing: -0.5vw;
			bottom: 0;
		}
	}

	/* Desktop: the offer and Transit share the width evenly, close under the header; the opening
	   fills the window as a minimum and grows with short windows or large text. */
	@media (--desktop-min) {
		.hero-text-layer {
			padding-top: calc(var(--nav-clearance) + 0.5rem);
			padding-bottom: 2.5rem;
		}
		.hero-grid {
			grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
			gap: clamp(2.5rem, 4vw, 5rem);
			/* Owner live QA (DEV-43): the heading, lead and both actions read as one left-aligned
			   block centred beside the Transit card. `safe` keeps the top of that block under the
			   header pill when 200% text or a short window makes it taller than the opening. */
			align-items: safe center;
		}

		.hero-intro-done .hero-grid {
			align-items: start;
		}

		/* Give the settled card room below the header from the viewport. The footprint
		   floor grows with the preview's width and stays independent of parsed card rows. */
		.hero-intro-done .hero-transit-slot {
			margin-block-start: max(0px, calc((100svh - max(50rem, 33.25rem + 20vw)) / 2));
		}

		/* Give the offer a viewport-relative inset without sizing it from the Transit card. */
		.hero-intro-done .hero-grid > :global(.hero-viewport-text) {
			margin-block-start: min(16svh, 9rem);
		}
	}
</style>
