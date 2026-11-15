<!--
  The services' orange top strip and service selector (D-M5, owner 15 November 2026).
  A list of links drawn with yesid.design's station-tabs.css: in `scroll` mode (Services) each
  station jumps to its service and the one in view carries aria-current; in `navigate` mode
  (a service page) each station opens its service's page and the current one is
  aria-current="page". The strip's band runs up behind the header pill to the window's top
  edge, one unbroken orange in both themes with the dark signage ink. The page decides
  whether the strip sticks.
-->
<script lang="ts">
	import type { Service } from '#lib/types.ts';
	import { resolveLocale } from '#lib/utils/locale.ts';
	import { getLocale } from '#lib/utils/locale-context.ts';
	import { localizeHref } from '#lib/utils/locale-routing.ts';
	import { siteLabels } from '#lib/content/index.ts';
	import { orderServices } from '#lib/utils/station.ts';
	import { servicesLabels } from '#lib/components/services/services-labels.ts';
	import { isPrefersReducedMotion } from '@yesid/motion/stores/reducedMotion';
	import { scrollChain } from '@yesid/motion/actions';

	// Keyed pages remount, so the initialization-time locale stays current.
	const locale = getLocale();

	let {
		services,
		activeId,
		mode = 'scroll',
		onSelect
	}: {
		services: readonly Service[];
		activeId: string;
		mode?: 'scroll' | 'navigate';
		onSelect?: (id: string) => void;
	} = $props();

	const navAria = $derived(
		resolveLocale(
			mode === 'navigate' ? siteLabels.servicesChrome.detail.serviceNavAria : servicesLabels.stationsOnPageAria,
			locale,
		),
	);

	let sorted = $derived(orderServices(services));

	const stationShortLabels = siteLabels.servicesChrome.listing.stationShortLabels;

	function getLabel(service: Service): string {
		const short = stationShortLabels[service.id as keyof typeof stationShortLabels];
		if (short) return resolveLocale(short, locale);
		return resolveLocale(service.title, locale);
	}

	// Disable station clicks during swipes regardless of event ordering.
	let swipeActive = $state(false);
	let touchStartX = 0;

	function onTouchStart(e: TouchEvent) {
		touchStartX = e.touches[0].clientX;
		swipeActive = false;
	}

	function onTouchMove(e: TouchEvent) {
		if (!swipeActive && Math.abs(e.touches[0].clientX - touchStartX) > 8) {
			swipeActive = true;
		}
	}

	function onTouchEnd() {
		if (swipeActive) {
			// Delay reset so the post-touch click event is still blocked
			setTimeout(() => { swipeActive = false; }, 300);
		}
	}

	function onStationClick(event: MouseEvent, id: string) {
		if (mode !== 'scroll' || !onSelect) return;
		if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
		event.preventDefault();
		onSelect(id);
	}

	let navRef = $state<HTMLElement | null>(null);

	// Center only the strip; listing scroll updates must never move the window.
	$effect(() => {
		const container = navRef;
		if (!container || !activeId) return;
		const activeEl = container.querySelector<HTMLElement>(
			`[data-testid="station-tab-${activeId}"]`,
		);
		if (!activeEl) return;
		const cRect = container.getBoundingClientRect();
		const aRect = activeEl.getBoundingClientRect();
		const delta = aRect.left - cRect.left - (container.clientWidth - activeEl.clientWidth) / 2;
		if (Math.abs(delta) < 1) return;
		const reduce = isPrefersReducedMotion();
		container.scrollTo({ left: container.scrollLeft + delta, behavior: reduce ? 'auto' : 'smooth' });
	});
</script>

<div class="station-strip" data-testid="station-strip" data-mode={mode}>
	<nav
		bind:this={navRef}
		aria-label={navAria}
		class="station-strip-nav"
		class:swipe-lock={swipeActive}
		use:scrollChain
		ontouchstart={onTouchStart}
		ontouchmove={onTouchMove}
		ontouchend={onTouchEnd}
	>
		<ul class="station-tabs station-strip-list">
			{#each sorted as service (service.id)}
				{@const isActive = service.id === activeId}
				<li class="station-strip-item">
					{#if mode === 'navigate'}
						<a
							href={localizeHref(`/services/${service.id}`, locale)}
							class="station-tab tap-press"
							aria-current={isActive ? 'page' : undefined}
							data-testid="station-tab-{service.id}"
							data-active={isActive ? 'true' : undefined}
						>{getLabel(service)}</a>
					{:else}
						<a
							href="#service-{service.id}"
							class="station-tab tap-press"
							aria-current={isActive ? 'true' : undefined}
							data-state={isActive ? 'active' : undefined}
							data-testid="station-tab-{service.id}"
							data-active={isActive ? 'true' : undefined}
							onclick={(event) => onStationClick(event, service.id)}
						>{getLabel(service)}</a>
					{/if}
				</li>
			{/each}
		</ul>
	</nav>
	<div class="scroll-cue" aria-hidden="true"></div>
</div>

<style>
	/* Signage colours, the same in both themes: the brand orange the tokens keep in light and
	   dark (--glow) with the dark signage ink (5.8:1); the current station takes the kit's
	   signage pair. station-tabs.css draws everything else; these are its two colour inputs. */
	.station-strip {
		--primary: var(--glow);
		--station-tab-ink: var(--signage-bg);
		position: relative;
		background: var(--primary);
	}

	/* The orange top: the band continues up behind the floating header pill to the window's
	   top edge, one unbroken orange. It goes with the strip (sticky on Services, scrolling away
	   on a service page). The pill keeps its own look on top. */
	.station-strip::before {
		content: '';
		position: absolute;
		inset-inline: 0;
		bottom: 100%;
		height: calc(var(--nav-clearance, 5.5rem) + 0.5rem);
		background: var(--primary);
		pointer-events: none;
	}

	.station-strip-nav {
		overflow-x: auto;
		overscroll-behavior-x: contain;
		scrollbar-width: none;
	}

	.station-strip-nav::-webkit-scrollbar {
		display: none;
	}

	.station-strip-list {
		width: max-content;
		min-width: 100%;
		margin: 0;
		padding: 3px 0 0;
		list-style: none;
	}

	.station-strip-item {
		display: flex;
		flex: 0 0 auto;
	}

	/* The strip keeps its calibrated height (--strip-h): the stations fill it below the 3px inset. */
	.station-tab {
		flex-grow: 0;
		min-height: calc(var(--strip-h) - 3px);
		padding-inline: 1.25rem;
	}

	/* Swipe guard: disable all pointer events on stations during a horizontal swipe, so no
	   click fires on a link mid-swipe. */
	.swipe-lock .station-tab {
		pointer-events: none;
	}

	/* The overlay signals horizontal overflow without blocking clicks. Its end-stop is the
	   strip's own orange. */
	.scroll-cue {
		position: absolute;
		top: 0;
		right: 0;
		bottom: 0;
		width: 3rem;
		background: linear-gradient(to right, transparent, var(--primary));
		pointer-events: none;
	}

	@media (min-width: 1280px) {
		.station-strip-list {
			justify-content: center;
		}

		.scroll-cue {
			display: none;
		}
	}
</style>
