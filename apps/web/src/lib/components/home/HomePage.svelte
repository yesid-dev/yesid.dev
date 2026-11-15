<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/env';
	import HeroBanner from './HeroBanner.svelte';
	import Manifesto from './Manifesto.svelte';
	import FeaturedProjects from './FeaturedProjects.svelte';
	import HomeServices from './HomeServices.svelte';
	import HomeAboutTeaser from './HomeAboutTeaser.svelte';
	import CtaBand from '#lib/components/shared/CtaBand.svelte';
	import HomeCloser from './HomeCloser.svelte';
	import ServicesBlueprint from './ServicesBlueprint.svelte';
	import { PageSections, PageSection } from '@yesid/ui/layout';
	import { RailTitle } from '@yesid/ui/brand';
	import { resolveLocale } from '#lib/utils/locale.ts';
	import { getLocale } from '#lib/utils/locale-context.ts';
	import { ScrollTrigger } from '@yesid/motion/utils/gsap';
	import { registerScrollContext, lenisAwareScrollTo } from '#lib/state/locale-handoff.svelte.ts';
	import { siteLabels } from '#lib/content/index.ts';
	import type { GlanceFact } from '#lib/utils/glance-facts.ts';
	import type {
		HeroContent,
		HeroAnimContent,
		ManifestoContent,
		ProofReelContent,
		ServicesGridContent,
		AboutIntroContent,
		CloserContent,
		ProjectSummary,
		Service,
		SiteMeta,
	} from '#lib/types.ts';
	import type { HeroData } from '#lib/live/index.ts';

	const locale = getLocale();

	interface Props {
		metroSvg: string;
		hero: HeroContent;
		heroAnim: HeroAnimContent;
		manifesto: ManifestoContent;
		proofReel: ProofReelContent;
		servicesGrid: ServicesGridContent;
		about: AboutIntroContent;
		closer: CloserContent;
		initialHeroData: HeroData;

		services: readonly Service[];
		featuredProjects: readonly ProjectSummary[];
		/** Each featured project's key "At a glance" facts, by slug. */
		featuredFacts?: Readonly<Record<string, readonly GlanceFact[]>>;
		serviceSvgContents?: Record<string, string>;
		siteMeta: SiteMeta;
		bookingHref: string;
	}
	let {
		metroSvg,
		hero,
		heroAnim,
		manifesto,
		proofReel,
		servicesGrid,
		about,
		closer,
		initialHeroData,
		services,
		featuredProjects,
		featuredFacts = {},
		siteMeta,
		bookingHref,
	}: Props = $props();

	// Rail titles from site_labels.
	const sectionProjects = resolveLocale(siteLabels.pages.homeSectionProjects, locale);
	const sectionServices = resolveLocale(siteLabels.pages.homeSectionServices, locale);
	const sectionAbout = resolveLocale(siteLabels.pages.homeSectionAbout, locale);
	const sectionTerminus = resolveLocale(siteLabels.pages.homeSectionTerminus, locale);

	// Transit is the opening's showcase; the carousel shows the other featured work, client work first.
	const TRANSIT_SLUG = 'transit-data-pipeline';
	const transitProject = $derived(featuredProjects.find((project) => project.slug === TRANSIT_SLUG));
	const carouselProjects = $derived(
		featuredProjects
			.filter((project) => project.slug !== TRANSIT_SLUG)
			.map((project, index) => ({ project, index, client: Boolean(project.location) }))
			.sort((a, b) => Number(b.client) - Number(a.client) || a.index - b.index)
			.map(({ project }) => project),
	);

	let destroyFns: Array<() => void> = [];

	/** Max scrollable distance for the current (post-pin-refresh) document. */
	function maxScroll(): number {
		return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
	}

	/** The pin ScrollTrigger if the hero intro is live (absent once collapsed). */
	function findPinTrigger(): ReturnType<typeof ScrollTrigger.getAll>[number] | undefined {
		return ScrollTrigger.getAll().find((t) => Boolean(t.vars.pin));
	}

	onMount(() => {
		if (!browser) return;

		// The projects settle their height after mount (fonts, aligned card rows); the manifesto's
		// scrub below them measures its trigger positions, so refresh them once the height changes.
		const projects = document.querySelector('[data-testid="home-section-projects"]');
		if (projects && typeof ResizeObserver !== 'undefined') {
			let height = projects.getBoundingClientRect().height;
			let timer: ReturnType<typeof setTimeout> | undefined;
			const observer = new ResizeObserver(() => {
				const next = projects.getBoundingClientRect().height;
				if (Math.abs(next - height) < 1) return;
				height = next;
				clearTimeout(timer);
				timer = setTimeout(() => ScrollTrigger.refresh(), 150);
			});
			observer.observe(projects);
			destroyFns.push(() => {
				clearTimeout(timer);
				observer.disconnect();
			});
		}

		// Restore a scroll fraction after the hero pin refresh because locale and intro state change document height.
		destroyFns.push(
			registerScrollContext({
				capture: () => {
					const max = maxScroll();
					return {
						kind: 'home-fraction',
						fraction: max > 0 ? window.scrollY / max : 0,
						y: window.scrollY,
					};
				},
				restore: async (snap) => {
					const s = snap as { fraction?: number; y?: number } | null;
					const fraction = Math.min(1, Math.max(0, s?.fraction ?? 0));

					// The pin ScrollTrigger is built in a rAF after paint; poll a bounded number of
					// frames, refresh to lock its geometry, then jump. A collapsed intro never builds
					// one, so the poll times out fast and the jump uses the short collapsed height.
					await waitForPinOrTimeout(30);
					const pin = findPinTrigger();
					if (pin) ScrollTrigger.refresh();

					lenisAwareScrollTo(Math.round(fraction * maxScroll()));
				},
			}),
		);
	});

	/** Resolve once the pin ScrollTrigger exists, or after `maxFrames` rAFs. */
	function waitForPinOrTimeout(maxFrames: number): Promise<void> {
		return new Promise((resolve) => {
			let frames = 0;
			const tick = () => {
				if (findPinTrigger() || frames >= maxFrames) {
					resolve();
					return;
				}
				frames++;
				requestAnimationFrame(tick);
			};
			requestAnimationFrame(tick);
		});
	}

	onDestroy(() => {
		destroyFns.forEach((fn) => fn());
		destroyFns = [];
	});
</script>

<!-- The page's sections (D22): the kit draws the dimension line at the bottom of every section but
     the last, so none sits before the footer. Order (D-M1): the opening, Projects, the manifesto,
     Services, About, the closing band, Terminus. -->
<PageSections class="home-sections" data-testid="home-sections">
	<!-- 1. The opening: edge to edge, the offer beside Transit's live data. -->
	<PageSection class="home-opening" data-testid="home-section-opening">
		<HeroBanner {metroSvg} {hero} {heroAnim} {initialHeroData} {bookingHref} {transitProject} />
	</PageSection>

	<!-- 2. Projects: the blueprint drawing behind, edge to edge; the cards in the centred measure. -->
	<PageSection class="home-section home-section--projects" data-testid="home-section-projects" aria-labelledby="home-title-projects">
		<div class="home-section-backdrop" aria-hidden="true"><ServicesBlueprint /></div>
		<RailTitle heading={sectionProjects} side="left" titleId="home-title-projects">
			<div class="home-measure">
				<FeaturedProjects {proofReel} projects={carouselProjects} facts={featuredFacts} />
			</div>
		</RailTitle>
	</PageSection>

	<!-- 3. The manifesto, as it is. -->
	<PageSection class="home-manifesto" data-testid="home-section-manifesto">
		<Manifesto {manifesto} />
	</PageSection>

	<!-- 4. Services. -->
	<PageSection class="home-section" data-testid="home-section-services" aria-labelledby="home-title-services">
		<RailTitle heading={sectionServices} side="right" titleId="home-title-services">
			<div class="home-measure">
				<HomeServices {servicesGrid} {services} />
			</div>
		</RailTitle>
	</PageSection>

	<!-- 5. About, exactly as it is on the live home. -->
	<PageSection class="home-section" data-testid="home-section-about" aria-labelledby="home-title-about">
		<RailTitle heading={sectionAbout} side="right" titleId="home-title-about">
			<div class="home-measure home-measure--about">
				<HomeAboutTeaser {about} />
			</div>
		</RailTitle>
	</PageSection>

	<!-- 6. "Let's build something that moves" on its blueprint, edge to edge. -->
	<PageSection class="home-band" data-testid="home-section-band" style="--cta-blueprint-ink: 0.75">
		<CtaBand testidPrefix="home-cta-band" leadingRule={false} {bookingHref} />
	</PageSection>

	<!-- 7. Terminus and the closing scene: the last section, so no divider before the footer. The
	     scene keeps today's geometry: the title owns the left rail and the props run to the right edge. -->
	<PageSection class="home-section home-section--terminus" data-testid="home-section-terminus" aria-labelledby="home-title-terminus">
		<div class="home-terminus">
			<div class="home-terminus__rail"><RailTitle heading={sectionTerminus} side="left" titleId="home-title-terminus" /></div>
			<div class="home-terminus__scene"><HomeCloser {closer} {siteMeta} /></div>
		</div>
	</PageSection>
</PageSections>

<style>
	/* The centred measure between the rails; the backgrounds stay edge to edge. */
	.home-measure {
		width: 100%;
		max-width: 82rem;
		margin-inline: auto;
		min-width: 0;
	}

	:global(.home-sections .home-section) {
		position: relative;
		isolation: isolate;
	}

	/* Room above each titled section; its content keeps its own room below. */
	:global(.home-sections .home-section) {
		padding-block-start: var(--space-section-y);
	}

	/* Terminus starts as far from its dimension line as the band's heading does (4rem): the
	   closing scene keeps its own 4rem on desktop; on phones the room sits above its title. */
	:global(.home-sections .home-section--terminus) {
		padding-block-start: 4rem;
	}

	@media (--desktop-min) {
		:global(.home-sections .home-section--terminus) {
			padding-block-start: 0;
		}
	}

	/* Phones and tablets: the title reads across above the scene, in the page gutter. */
	.home-terminus__rail {
		padding-inline: var(--space-page-x);
		margin-block-end: var(--space-card-gap, 1.5rem);
	}

	.home-terminus__scene {
		min-width: 0;
	}

	/* Desktop: the title's rail on the left, the scene to the window's right edge, as today. */
	@media (--desktop-min) {
		.home-terminus {
			display: grid;
			grid-template-columns: var(--rail-title-rail, clamp(4.5rem, 8vw, 8rem)) minmax(0, 1fr);
		}
		.home-terminus__rail {
			padding-inline: 0;
			margin-block-end: 0;
		}
	}

	.home-section-backdrop {
		position: absolute;
		inset: 0;
		z-index: -1;
		pointer-events: none;
		opacity: 0.75;
	}
</style>
