<script lang="ts">
	import { resolveLocale } from '#lib/utils/locale.ts';
	import { getLocale } from '#lib/utils/locale-context.ts';

	const locale = getLocale();
	import type { AboutContent } from '#lib/types.ts';
	import { PageSection, PageSections } from '@yesid/ui/layout';
	import AboutIdentity from './AboutIdentity.svelte';
	import AboutPolaroids from './AboutPolaroids.svelte';
	import AboutMetrics from './AboutMetrics.svelte';
	import AboutMethod from './AboutMethod.svelte';
	import AboutTestimonials from './AboutTestimonials.svelte';
	import AboutWeather from './AboutWeather.svelte';
	import AboutLanguages from './AboutLanguages.svelte';
	import AboutEducation from './AboutEducation.svelte';
	import AboutInterests from './AboutInterests.svelte';
	import AboutCta from './AboutCta.svelte';
	import AboutTrain from './AboutTrain.svelte';
	import { aboutLabels } from './about-copy.ts';

	let {
		aboutPage,
		weather,
	}: {
		aboutPage: AboutContent;
		weather?: { temp: number; condition: string; icon: string } | null;
	} = $props();

	const c = $derived(aboutPage);
	// Each card starts with its plain heading (D-M6): no "STOP 0n" numbers, no lamp.
	const heading = $derived({
		metrics: resolveLocale(c.stopLabels.metrics, locale),
		testimonials: resolveLocale(c.stopLabels.testimonials, locale),
		process: resolveLocale(c.stopLabels.process, locale),
		stack: resolveLocale(c.stopLabels.stack, locale),
		clients: resolveLocale(c.stopLabels.clients, locale),
		interests: resolveLocale(c.stopLabels.interests, locale),
		snapshots: resolveLocale(c.stopLabels.snapshots, locale),
		weather: resolveLocale(aboutLabels.weatherHeading, locale),
		cta: resolveLocale(aboutLabels.ctaHeading, locale),
	});
</script>

<!-- About is one section, the page's last: the kit draws no divider, and the footer's hazard strip closes it. -->
<PageSections divider="hand-drawn" data-register="reading">
<PageSection class="w-full" style="min-height: calc(100dvh - 5rem)" data-testid="page-about">
	<div class="px-3 py-2">
		<div class="dashboard">

				<!-- SELL ROW 1 -->
				<div class="area-identity"><AboutIdentity identity={c.identity} /></div>
				<div class="area-metrics"><AboutMetrics metrics={c.metrics} heading={heading.metrics} /></div>
				<div class="area-testimonials"><AboutTestimonials testimonials={c.testimonials} heading={heading.testimonials} labels={c.labels} /></div>

				<!-- SELL ROW 2 -->
				<div class="area-process"><AboutMethod steps={c.methodology} heading={heading.process} /></div>
				<div class="area-stack"><AboutEducation education={c.education} heading={heading.stack} /></div>

				<!-- SELL/PERSONAL ROW 3 -->
				<div class="area-clients"><AboutLanguages languages={c.languages} heading={heading.clients} /></div>
				<div class="area-interests"><AboutInterests interests={c.interests} heading={heading.interests} /></div>
				<div class="area-snapshots" data-testid="about-polaroids-cell"><AboutPolaroids polaroids={c.identity.polaroids} heading={heading.snapshots} /></div>

				<!-- ACTION ROW 4 -->
				<div class="area-weather"><AboutWeather config={c.weather} {weather} heading={heading.weather} /></div>
				<div class="area-train"><AboutTrain /></div>
				<div class="area-cta"><AboutCta cta={c.cta} heading={heading.cta} /></div>

			</div>
		</div>
</PageSection>
</PageSections>

<style>
	/* ═══ DASHBOARD: CSS Grid Named Areas ═══ */

	/* Mobile: single column (< 500px) */
	.dashboard {
		display: grid;
		gap: 4px;
		grid-template-columns: 1fr;
		grid-template-areas:
			"identity"
			"metrics"
			"testim"
			"process"
			"stack"
			"clients"
			"interests"
			"snapshots"
			"weather"
			"train"
			"cta";
		grid-auto-rows: auto;
	}

	/* Foldable: 2 col (500px+) */
	@media (min-width: 500px) {
		.dashboard {
			grid-template-columns: repeat(2, 1fr);
			grid-template-areas:
				"identity   identity"
				"metrics    metrics"
				"process    testim"
				"stack      testim"
				"clients    clients"
				"interests  interests"
				"snapshots  weather"
				"train      cta";
		}
	}

	/* Tablet: 4 col (768px+) */
	@media (--tablet-min) {
		.dashboard {
			grid-template-columns: repeat(4, 1fr);
			grid-template-areas:
				"identity    identity    metrics     metrics"
				"process     stack       testim      testim"
				"clients     interests   interests   snapshots"
				"train       weather     cta         cta";
		}
	}

	/* Desktop: 6 col × 4 row — the target layout (1024px+) */
	@media (--desktop-min) {
		.dashboard {
			grid-template-columns: repeat(6, 1fr);
			grid-template-areas:
				"identity  identity  metrics   metrics   testim    testim"
				"process   process   stack     stack     testim    testim"
				"clients   interests interests interests interests snapshots"
				"train     weather   cta       cta       cta       snapshots";
		}
	}

	/* Named area assignments — DRY: one rule per card, works at all breakpoints */
	.area-identity     { grid-area: identity; }
	.area-metrics      { grid-area: metrics; }
	.area-process      { grid-area: process; }
	.area-stack        { grid-area: stack; }
	.area-testimonials { grid-area: testim; }
	.area-clients      { grid-area: clients; }
	.area-interests    { grid-area: interests; }
	.area-snapshots    { grid-area: snapshots; min-height: 380px; }
	.area-weather      { grid-area: weather; }
	.area-train        { grid-area: train; }
	.area-cta          { grid-area: cta; }

	/* Desktop: snapshots auto-size from grid row, remove min-height */
	@media (--desktop-min) {
		.area-snapshots { min-height: 0; }
	}

	/* All grid cells stretch their children to fill */
	.dashboard > div {
		min-height: 0;
		min-width: 0;
		display: flex;
		align-items: stretch;
	}
	.dashboard > div > :global(*) {
		height: 100%;
		width: 100%;
	}

</style>
