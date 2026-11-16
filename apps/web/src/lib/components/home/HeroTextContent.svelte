<!--
  HeroTextContent: the offer in the opening (D-M1, DEV-38): the heading ending on the orange dot
  ("click me" replays the metro scene), the lead and the two actions. HeroBanner coordinates the
  scroll-driven intro through the data-hero-stagger attributes.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import HeroDotAnnotation from './HeroDotAnnotation.svelte';
	import { getLettering } from './annotation-lettering';
	import { siteLabels } from '#lib/content/index.ts';
	import { resolveLocale } from '#lib/utils/locale.ts';
	import { Button } from '@yesid/ui/button';
	import { getLocale } from '#lib/utils/locale-context.ts';
	import { trackLinkActivation } from '#lib/analytics/site-events.ts';

	const locale = getLocale();
	let {
		heading,
		lead,
		ctaProjectLabel,
		ctaProjectHref,
		bookingLabel,
		bookingHref,
		newTabLabel,
		replayEnabled = false,
		beaconSettled = false,
		replayAriaLabel = 'Replay intro',
		replayExpanded,
		onReplay,
	}: {
		/** The offer, one sentence without its final period (the dot is the replay button). */
		heading: string;
		lead: string;
		ctaProjectLabel: string;
		ctaProjectHref: string;
		bookingLabel: string;
		bookingHref: string;
		/** Accessible suffix for the booking link, which opens a new tab. */
		newTabLabel: string;
		replayEnabled?: boolean;
		/** Final geometry enables annotation positioning and redraw. */
		beaconSettled?: boolean;
		/** aria-label for the armed dot (site_labels a11y.replayIntro). */
		replayAriaLabel?: string;
		replayExpanded?: boolean;
		/** Fired when the armed dot is clicked: HeroBanner replays the intro. */
		onReplay?: () => void;
	} = $props();

	const lettering = getLettering(resolveLocale(siteLabels.annotation.clickMe, locale));
	// The dot is glued to the last letter only, so a long last word can still wrap at 200% text.
	const head = $derived(heading.slice(0, -1));
	const lastLetter = $derived(heading.slice(-1));
	// The heading never breaks inside a word: its size is capped so the language's longest word fits.
	const longestWord = $derived(Math.max(...heading.split(/\s+/).map((word) => word.length)) + 1);

	let headingBox: HTMLDivElement;
	let headingWidth = $state(0);
	let headingHeight = $state(0);
	let arrow = $state('');
	let arrowHead = $state('');
	let annotationX = $state(0);
	const annotationY = 22;
	let annotationReady = $state(false);

	/** "click me" sits above the heading, beside its longest line toward the edge; the arrow ends at the dot. */
	function alignArrow() {
		if (!headingBox || !beaconSettled) return;
		const box = headingBox.getBoundingClientRect();
		const dotRect = headingBox.querySelector('[data-testid="hero-dot"]')?.getBoundingClientRect();
		if (!dotRect) return;
		const x = dotRect.right - box.left + 8;
		const y = dotRect.top + dotRect.height / 2 - box.top;
		const range = document.createRange();
		const walker = document.createTreeWalker(headingBox.querySelector('h1')!, NodeFilter.SHOW_TEXT);
		const rights: number[] = [];
		while (walker.nextNode()) {
			if (!walker.currentNode.textContent?.trim()) continue;
			range.selectNodeContents(walker.currentNode);
			rights.push(...Array.from(range.getClientRects(), (rect) => rect.right - box.left));
		}
		const inkRight = Math.max(x, ...rights);
		let edge = Math.min(headingWidth - 8, Math.max(inkRight + 24, x + 48));
		annotationX = Math.max(0, edge - lettering.width - 40);
		const startX = annotationX + lettering.end.x + 1;
		const startY = annotationY + lettering.end.y;
		edge = Math.min(headingWidth - 8, Math.max(edge, startX + 20));
		const bendY = Math.max(startY + 18, y - 12);
		arrow = `M${startX} ${startY} C${Math.max(startX, edge - 16)} ${startY} ${edge} ${startY} ${edge} ${startY + 16} C${edge + 6} ${startY + 32} ${edge + 6} ${bendY - 16} ${edge} ${bendY} C${edge} ${y + 24} ${x + 25} ${y} ${x} ${y}`;
		arrowHead = `M${x + 9} ${y - 5} L${x} ${y} L${x + 9} ${y + 5}`;
	}

	$effect(() => {
		void [headingWidth, headingHeight, beaconSettled, heading];
		alignArrow();
	});
	onMount(() => {
		const resize = () => alignArrow();
		void (document.fonts?.ready ?? Promise.resolve()).then(() => {
			resize();
			annotationReady = true;
		});
		window.addEventListener('resize', resize);
		return () => window.removeEventListener('resize', resize);
	});
</script>

<div class="hero-viewport-text" style="--hero-longest-word: {longestWord}">
	<div class="hero-heading" bind:this={headingBox} bind:clientWidth={headingWidth} bind:clientHeight={headingHeight}>
		<!-- The words fade in with the intro; the dot stays, as the station the scene zooms out of. -->
		<h1 class="hero-title" aria-label={heading} data-testid="hero-heading">
			<span data-hero-stagger="1" data-testid="hero-line1">{head}</span><span class="hero-title-tail"
				><span data-hero-stagger="1">{lastLetter}</span><span class="hero-dot-anchor"
					><button
						type="button"
						class="hero-dot-btn {replayEnabled ? 'hero-dot-armed' : ''}"
						data-testid="hero-dot-replay"
						disabled={!replayEnabled}
						aria-hidden={replayEnabled ? undefined : 'true'}
						aria-label={replayAriaLabel}
						aria-expanded={replayExpanded}
						aria-controls={replayExpanded !== undefined ? 'metro-still-scene' : undefined}
						onclick={() => onReplay?.()}
						><svg class="hero-dot" data-testid="hero-dot" viewBox="0 0 10 10" aria-hidden="true"
							><circle cx="5" cy="5" r="5" fill="currentColor" /></svg
						></button
					></span
				></span
			>
		</h1>

		<HeroDotAnnotation
			{lettering}
			width={headingWidth}
			height={headingHeight}
			x={annotationX}
			y={annotationY}
			{arrow}
			tip={arrowHead}
			visible={beaconSettled}
			ready={annotationReady}
		/>
	</div>

	<p class="hero-lead" data-testid="hero-subtitle" data-hero-stagger="2">{lead}</p>

	<div class="hero-actions" data-hero-stagger="6">
		<Button variant="conversion" size="cta-lg" wrap href={ctaProjectHref} data-testid="hero-cta-project">
			{ctaProjectLabel}
		</Button>
		<Button
			variant="outline"
			class="bg-background hover:bg-background focus:bg-background"
			size="cta-lg"
			wrap
			href={bookingHref}
			target="_blank"
			rel="noopener"
			data-testid="hero-cta-contact"
			aria-label="{bookingLabel}{newTabLabel}"
			onclick={(event) => trackLinkActivation(event, 'booking_click', { placement: 'hero' })}
			onauxclick={(event) => trackLinkActivation(event, 'booking_click', { placement: 'hero' })}
		>
			{bookingLabel}
		</Button>
	</div>
</div>

<style>
	.hero-viewport-text {
		width: 100%;
		container-type: inline-size;
	}

	/* Room above the heading for the hand-lettered "click me". */
	.hero-heading {
		position: relative;
		padding-block: 2.5rem 0.75rem;
	}

	/* Bigger on every width, never wider than the language's longest word allows. */
	.hero-title {
		margin: 0;
		font-family: var(--font-heading);
		font-weight: 900;
		line-height: 1;
		letter-spacing: -0.035em;
		color: var(--foreground);
		text-wrap: balance;
		font-size: min(clamp(2.25rem, 11.5cqi, 3.5rem), calc(100cqi / (var(--hero-longest-word) * 0.66)));
	}

	@media (--tablet-min) {
		.hero-title {
			font-size: min(clamp(3rem, 9cqi, 4.5rem), calc(100cqi / (var(--hero-longest-word) * 0.66)));
		}
	}

	@media (--desktop-min) {
		.hero-heading {
			padding-block-start: 2.75rem;
		}
		.hero-title {
			font-size: max(2.25rem, min(clamp(3.5rem, 5.6vw, 7rem), calc(100cqi / (var(--hero-longest-word) * 0.66))));
		}
	}

	/* The last letter and the dot never part. */
	.hero-title-tail {
		white-space: nowrap;
	}

	.hero-dot-anchor {
		display: inline-block;
		line-height: 0;
	}

	/* A period-sized mark inside a 44px button. */
	.hero-dot {
		display: inline-block;
		width: 0.22em;
		height: 0.22em;
		vertical-align: baseline;
		color: var(--primary);
		overflow: visible;
	}

	.hero-dot-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: var(--size-tap-min);
		height: var(--size-tap-min);
		padding: 0;
		margin: calc((0.22em - var(--size-tap-min)) / 2);
		vertical-align: 0.03em;
		background: none;
		border: none;
		font: inherit;
		line-height: inherit;
		color: inherit;
		cursor: default;
		position: relative;
	}

	.hero-dot-armed {
		cursor: pointer;
	}

	.hero-dot-armed:focus-visible {
		outline: 2px solid var(--ring);
		outline-offset: 6px;
		border-radius: 50%;
	}

	.hero-lead {
		max-width: 34em;
		margin-top: 1rem;
		text-wrap: pretty;
		font-size: var(--text-reading);
		line-height: 1.55;
		color: var(--secondary-foreground);
	}

	@media (--desktop-min) {
		.hero-lead {
			font-size: var(--text-reading-desktop);
		}
	}

	.hero-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		margin-top: 1.5rem;
	}

	@media (max-width: 479px) {
		.hero-actions > :global(*) {
			flex: 1 1 100%;
		}
	}
</style>
