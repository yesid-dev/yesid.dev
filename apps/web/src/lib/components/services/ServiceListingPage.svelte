<script lang="ts">
	import { onMount, tick, untrack } from 'svelte';
	import { browser } from '$app/env';
	import { page } from '$app/state';
	import { gotoPreservingScroll } from '#lib/utils/navigation-focus.ts';
	import type { Service } from '#lib/types.ts';
	import { resolveLocale } from '#lib/utils/locale.ts';
	import { getLocale } from '#lib/utils/locale-context.ts';
	import { siteLabels } from '#lib/content/index.ts';
	import { getLenis } from '@yesid/motion/utils/lenis';
	import { RailTitle } from '@yesid/ui/brand';
	import { PageSection, PageSections } from '@yesid/ui/layout';
	import StationTabs from '#lib/components/shared/StationTabs.svelte';
	import CtaBand from '#lib/components/shared/CtaBand.svelte';
	import ServiceCard from './ServiceCard.svelte';
	import { orderServices } from '#lib/utils/station.ts';

	const locale = getLocale();

	let {
		services,
		serviceSvgContents,
	}: {
		services: readonly Service[];
		serviceSvgContents: Record<string, string>;
	} = $props();

	let sorted = $derived(orderServices(services));
	const heading = resolveLocale(siteLabels.servicesChrome.listing.heading, locale);

	// untrack: activeId seeds from the first station once, then the IntersectionObserver and
	// station clicks own it.
	let activeId = $state(untrack(() => sorted[0]?.id ?? ''));

	// Lenis-aware scroll to a service card; activeId follows from the IntersectionObserver
	// once the card lands in view. Focus moves to the card's title, below the sticky strip.
	function scrollToStation(id: string, focus = false) {
		const lenis = getLenis();
		const target = document.querySelector<HTMLElement>(`#service-${id}`);
		if (!target) return;
		if (lenis) {
			// Lenis already honours the target's CSS scroll-margin-top.
			lenis.scrollTo(target);
		} else {
			// Native fallback already honours scroll-margin-top.
			target.scrollIntoView({ behavior: 'smooth', block: 'start' });
		}
		if (focus) document.getElementById(`svc-title-${id}`)?.focus({ preventScroll: true });
	}

	// Write the shareable station parameter only on explicit station clicks; scroll-spy updates
	// must not rewrite history.
	async function handleStationSelect(id: string) {
		activeId = id;
		if (!browser) return;
		const url = new URL(page.url.href);
		url.searchParams.set('station', id);
		// Await the navigation BEFORE scrolling: on touch devices (no Lenis) a native smooth
		// scroll fired before goto settled was cancelled mid-animation. replaceState keeps the
		// jump out of the history stack (a scroll position, not a destination).
		await gotoPreservingScroll(url.toString(), { replaceState: true });
		scrollToStation(id, true);
	}

	onMount(() => {
		if (!browser) return;

		// Deep-link / switch-restore: if ?station=<id> names a real station, scroll to it after
		// the cards have painted.
		const requested = page.url.searchParams.get('station');
		if (requested && sorted.some((s) => s.id === requested)) {
			void tick().then(() => scrollToStation(requested));
		}

		const cards = document.querySelectorAll<HTMLElement>('[id^="service-"]');
		if (cards.length === 0) return;

		let observer: IntersectionObserver;
		function observeStations() {
			observer?.disconnect();
			const clearance = parseFloat(getComputedStyle(cards[0]).scrollMarginTop) || 0;
			const top = Math.min(innerHeight - 1, Math.max(innerHeight * 0.3, clearance));
			observer = new IntersectionObserver(
				(entries) => {
					for (const entry of entries) {
						if (entry.isIntersecting) activeId = entry.target.id.replace('service-', '');
					}
				},
				{ rootMargin: `-${top}px 0px -${innerHeight - top - 1}px 0px` }
			);
			cards.forEach((el) => observer.observe(el));
		}
		observeStations();
		window.addEventListener('resize', observeStations);

		return () => {
			observer.disconnect();
			window.removeEventListener('resize', observeStations);
		};
	});
</script>

<!--
  /services (D-M5, DEV-39): the orange top strip, sticky, selects a service; "Services." on the
  left rail; four alike service cards; the closing band. Sections end with the kit's divider,
  except the last (none before the footer).
-->
<div class="services-page" data-testid="service-listing-page" data-register="reading">
	<div class="tabs-bar">
		<StationTabs services={sorted} {activeId} mode="scroll" onSelect={handleStationSelect} />
	</div>

	<PageSections>
		<PageSection class="services-list-section" aria-labelledby="services-heading">
			<RailTitle
				{heading}
				level={1}
				titleId="services-heading"
				side="left"
				class="services-rail-title"
				size="clamp(3.5rem, 7vw, 6rem)"
				style="--rail-title-top: calc(var(--nav-clearance) + var(--strip-h) + 1.5rem)"
			>
				<ul class="service-list">
					{#each sorted as service (service.id)}
						<ServiceCard {service} svgContent={serviceSvgContents[service.id] ?? ''} />
					{/each}
				</ul>
			</RailTitle>
		</PageSection>

		<PageSection class="services-band" data-register="expressive" data-testid="services-cta">
			<CtaBand testidPrefix="services-cta-band" />
		</PageSection>
	</PageSections>
</div>

<style>
	.services-page {
		position: relative;
		/* transparent so the root layout's single .circuit-grid shows through */
		overflow-x: clip;
	}

	/* Sticky under the header pill; the strip's orange runs up behind the pill. */
	.tabs-bar {
		position: sticky;
		top: var(--nav-clearance, 5.5rem);
		z-index: var(--z-rail);
	}

	:global(.services-list-section) {
		padding-block: clamp(1.5rem, 4vw, 3rem) clamp(2.5rem, 6vw, 4rem);
	}

	/* The cards keep the centred measure between the two rails. */
	.service-list {
		display: flex;
		flex-direction: column;
		gap: clamp(1rem, 2vw, 1.5rem);
		max-width: 76rem;
		margin: 0 auto;
		padding: 0 var(--space-page-x);
	}

	@media (min-width: 1024px) {
		.service-list {
			padding-inline: 0;
		}
	}
</style>
