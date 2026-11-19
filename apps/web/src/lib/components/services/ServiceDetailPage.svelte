<!--
  ServiceDetailPage: one service's page, /services/[id] (D-M5, DEV-39).
  The orange top strip with the current service (not sticky), then the opening at reading size
  with the drawing and its "click me", then three columns on desktop: contents and the metric,
  the story ("Is this you?" first, in a card that never folds), related work and the stack.
  Previous and next, the closing band. Sections end with the kit's divider, except the last.
-->
<script lang="ts">
	import { Separator } from '@yesid/ui/separator';
	import '#lib/styles/article-body.css';
	import { afterNavigate } from '$app/navigation';
	import { registerDetailReadingPosition } from '#lib/state/detail-reading-position.ts';
	import type { Service, ProjectSummary } from '#lib/types.ts';
	import { resolveLocale } from '#lib/utils/locale.ts';
	import { localizeHref } from '#lib/utils/locale-routing.ts';
	import { getLocale } from '#lib/utils/locale-context.ts';
	import { splitLeadSentence, toTextBlocks } from '#lib/utils/text-blocks.ts';
	import { siteLabels } from '#lib/content/index.ts';
	import { boop } from '@yesid/motion/actions';
	import { prefersReducedMotion } from '@yesid/motion/stores/reducedMotion';
	import StationTabs from '#lib/components/shared/StationTabs.svelte';
	import ServiceNav from './ServiceNav.svelte';
	import ServiceSvgPanel from './ServiceSvgPanel.svelte';
	import HeroDotAnnotation from '#lib/components/home/HeroDotAnnotation.svelte';
	import { getLettering } from '#lib/components/home/annotation-lettering.ts';
	import ServiceStackPanel from './ServiceStackPanel.svelte';
	import {
		CollapsibleSection,
		SectionIcon,
		TocNav,
		useSectionJump,
		type SectionIconName,
		type TocEntry,
	} from '@yesid/ui/brand';
	import { DetailFrame, PageSection, PageSections } from '@yesid/ui/layout';
	import CtaBand from '#lib/components/shared/CtaBand.svelte';
	import SectionsToggle from '#lib/components/shared/SectionsToggle.svelte';
	import TitleWithDot from '#lib/components/shared/TitleWithDot.svelte';

	const locale = getLocale();

	let {
		service,
		services,
		prev,
		next,
		relatedProjects,
		serviceSvgContents
	}: {
		service: Service;
		services: readonly Service[];
		prev?: Service;
		next?: Service;
		relatedProjects: readonly ProjectSummary[];
		serviceSvgContents: Record<string, string>;
	} = $props();

	let title = $derived(resolveLocale(service.title, locale));
	const titleFitUnits = $derived.by(() => {
		const words = title.trim().split(/\s+/);
		const last = words.pop() ?? '';
		// Include the orange period's advance when the final word limits the phone title size.
		// 0.64em per letter covers the widest measured word, "E-commerce.", with a little room.
		return Math.max(1, ...words.map(word => word.length * 0.64), last.length * 0.64 + 0.36);
	});
	let description = $derived(resolveLocale(service.description, locale));
	let svgContent = $derived(serviceSvgContents[service.id] ?? '');
	let benefitHeadline = $derived(
		service.benefitHeadline ? resolveLocale(service.benefitHeadline, locale) : null
	);
	let metricValue = $derived(
		service.impactMetric ? resolveLocale(service.impactMetric.value, locale) : null
	);
	let metricLabel = $derived(
		service.impactMetric ? resolveLocale(service.impactMetric.label, locale) : null
	);
	// Services chrome: CMS truth (site_labels -> servicesChrome.detail / .listing).
	let stackLabel = $derived(resolveLocale(siteLabels.servicesChrome.detail.stackHeading, locale));
	let hasStack = $derived((service.stack?.length ?? 0) > 0);
	// The hand-lettered "click me", left of the drawing, its arrow ending at the drawing's edge.
	const clickMe = getLettering(resolveLocale(siteLabels.annotation.clickMe, locale));
	const clickBaseline = 26;
	const clickStart = { x: 4 + clickMe.end.x + 2, y: clickBaseline + clickMe.end.y };
	const clickWidth = Math.ceil(clickStart.x + 30);
	const clickArrow = `M${clickStart.x} ${clickStart.y} C${clickStart.x + 6} ${clickStart.y + 26} ${clickWidth - 26} 52 ${clickWidth - 2} 52`;
	const clickTip = `M${clickWidth - 11} 47 L${clickWidth - 2} 52 L${clickWidth - 11} 57`;
	// Phones: the same hand lettering points across the title row.
	const clickMobileBaseline = 24;
	const clickMobileStartY = clickMobileBaseline + clickMe.end.y;
	const clickMobileWidth = Math.ceil(clickStart.x + 19);
	const clickMobileHeight = 36;
	const clickMobileTarget = clickMobileWidth - 2;
	const clickMobileArrow = `M${clickStart.x} ${clickMobileStartY} Q${clickMobileTarget - 11} ${clickMobileStartY + 4} ${clickMobileTarget} 18`;
	const clickMobileTip = `M${clickMobileTarget - 5} 14 L${clickMobileTarget} 18 L${clickMobileTarget - 5} 22`;

	let backLinkLabel = $derived(resolveLocale(siteLabels.servicesChrome.detail.backToServicesLabel, locale));
	let valuePropositionHeading = $derived(
		resolveLocale(siteLabels.servicesChrome.detail.valuePropositionHeading, locale)
	);
	let deliverablesHeading = $derived(
		resolveLocale(siteLabels.servicesChrome.detail.deliverablesHeading, locale)
	);
	let relatedProjectsHeading = $derived(
		resolveLocale(siteLabels.servicesChrome.detail.relatedProjectsHeading, locale)
	);
	let relatedProjectsAria = $derived(
		resolveLocale(siteLabels.servicesChrome.detail.relatedProjectsNavAria, locale)
	);
	let seeAllProjectsLabel = $derived(
		resolveLocale(siteLabels.projectsChrome.listing.seeAllLink, locale)
	);

	// "How this helps you" keeps its own first sentence in view when it is closed.
	let valueProposition = $derived(
		service.valueProposition ? splitLeadSentence(resolveLocale(service.valueProposition, locale)) : null
	);

	// Fit first: the CMS's first section after the deliverables ("Is this you?") opens the story
	// in a card that never folds; the others keep their place after the deliverables.
	type StorySection = { anchor: string; title: string; content: string };
	let storySections = $derived(
		(service.sections ?? []).map((section, i): StorySection => ({
			anchor: `svc-section-${i}`,
			title: resolveLocale(section.title, locale),
			content: resolveLocale(section.content, locale),
		}))
	);
	let fitSection = $derived(storySections[0] ?? null);
	let laterSections = $derived(storySections.slice(1));

	// Contents: the sections in reading order. Each entry mirrors its card's icon (the shared
	// SectionIcon registry); the story sections carry no number badge and there is no counter.
	// The icons follow the section's role in the CMS order, never an English heading.
	const FIT_ICON: SectionIconName = 'grid';
	const APPROACH_ICON: SectionIconName = 'arrow';
	const tocHeading = $derived(resolveLocale(siteLabels.navChrome.shared.tocHeading, locale));
	const tocEntries = $derived.by((): TocEntry[] => {
		const entries: TocEntry[] = [];
		const add = (id: string, entryTitle: string, icon?: SectionIconName, rail = false) =>
			entries.push({ id, title: entryTitle, level: 2, badge: icon ? { kind: 'icon', name: icon } : undefined, rail, children: [] });
		if (fitSection) add(fitSection.anchor, fitSection.title, FIT_ICON);
		if (service.valueProposition) add('svc-valueprop', valuePropositionHeading, 'eye');
		if (service.deliverables && service.deliverables.length > 0) add('svc-deliverables', deliverablesHeading, 'list');
		for (const [i, section] of laterSections.entries()) add(section.anchor, section.title, i === 0 ? APPROACH_ICON : undefined);
		if (relatedProjects.length > 0) add('svc-related', relatedProjectsHeading, 'briefcase', true);
		if (hasStack) add('svc-stack', stackLabel, 'layers', true);
		return entries;
	});

	let activeTocId = $state('');
	const navigation = useSectionJump(afterNavigate);
	registerDetailReadingPosition('.sections.article-body > div > [data-toc]', navigation);
	const hasImpact = $derived(Boolean(metricValue) || tocEntries.length > 0);
	const hasSidePanel = $derived(hasStack || relatedProjects.length > 0);
</script>

{#snippet approachIcon()}
	<SectionIcon name={APPROACH_ICON} class="h-4 w-4 shrink-0 text-primary" />
{/snippet}

{#snippet sectionBody(content: string)}
	<div class="section-body">
		{#each toTextBlocks(content) as block}
			{#if block.kind === 'list'}
				<ul class="section-list">
					{#each block.items as item}
						<li class="deliverable-item">
							<span class="deliverable-dot first-line-bullet" aria-hidden="true"></span>
							<span>{item}</span>
						</li>
					{/each}
				</ul>
			{:else}
				<p>{block.text}</p>
			{/if}
		{/each}
	</div>
{/snippet}

{#snippet impact()}
	<div class="impact-column">
		{#if tocEntries.length > 0}
			<div class="impact-toc">
				<TocNav entries={tocEntries} activeId={activeTocId} {navigation} heading={tocHeading} counter={false} />
			</div>
		{/if}

		{#if metricValue}
			<div class="impact-metric" data-ripple-exempt>
				<span class="impact-value">{metricValue}</span>
				{#if metricLabel}
					<span class="impact-label">{metricLabel}</span>
				{/if}
			</div>
			{#if benefitHeadline}
				<Separator variant="hand-drawn" data-testid="content-divider" />
				<p class="benefit-headline">{benefitHeadline}</p>
			{/if}
		{/if}
	</div>
{/snippet}

{#snippet projectsAside()}
	<div class="projects-panel reading-support" data-ripple-exempt>
		<ServiceStackPanel
			variant="desktop"
			stack={service.stack ?? []}
			{relatedProjects}
			{locale}
			{stackLabel}
			{relatedProjectsHeading}
			{relatedProjectsAria}
			{seeAllProjectsLabel}
		/>
	</div>
{/snippet}

{#snippet after()}
	{#if hasSidePanel}
		<div class="projects-mobile reading-support" data-ripple-exempt>
			<ServiceStackPanel
				variant="mobile"
				stack={service.stack ?? []}
				{relatedProjects}
				{locale}
				{stackLabel}
				{relatedProjectsHeading}
				{relatedProjectsAria}
				{seeAllProjectsLabel}
			/>
		</div>
	{/if}

	<div class="nav-area">
		<ServiceNav {prev} {next} />
	</div>
{/snippet}

<div class="service-detail" data-testid="service-detail-page" data-register="reading">
	<div class="tabs-bar">
		<StationTabs {services} activeId={service.id} mode="navigate" />
	</div>

	<PageSections divider="hand-drawn">
		<PageSection class="service-hero-section" aria-labelledby="service-detail-title">
			<div class="hero-area">
				<a
					href={localizeHref('/services', locale)}
					class="back-link tap-feedback"
					use:boop={{ scale: 1.05, timing: 200 }}
				>
					{backLinkLabel}
				</a>

				<header class="hero-grid">
					<div class="title-cell" style:--title-fit-units={titleFitUnits}>
						<h1 class="detail-title" id="service-detail-title">
							<TitleWithDot text={title} />
						</h1>
					</div>

					{#if svgContent}
						<div class="svg-mobile" data-ripple-exempt>
							<span class="click-me click-me--mobile" style:aspect-ratio={`${clickMobileWidth} / ${clickMobileHeight}`}>
								<HeroDotAnnotation
									lettering={clickMe}
									width={clickMobileWidth}
									height={clickMobileHeight}
									x={4}
									y={clickMobileBaseline}
									arrow={clickMobileArrow}
									tip={clickMobileTip}
									visible={!$prefersReducedMotion}
									ready
								/>
							</span>
							<ServiceSvgPanel {svgContent} variant="banner" />
						</div>
						<!-- From 768px: the drawing in its frame, "click me" to its left. -->
						<div class="svg-desktop" data-ripple-exempt>
							<span class="click-me" style="width: {clickWidth}px">
								<HeroDotAnnotation
									lettering={clickMe}
									width={clickWidth}
									height={64}
									x={4}
									y={clickBaseline}
									arrow={clickArrow}
									tip={clickTip}
									visible={!$prefersReducedMotion}
									ready
								/>
							</span>
							<ServiceSvgPanel {svgContent} />
						</div>
					{/if}

					<p class="detail-description">{description}</p>

					<div class="sections-slot">
						<SectionsToggle />
					</div>
				</header>
			</div>
		</PageSection>

		<PageSection class="service-story-section">
			<DetailFrame
				class="reading-detail"
				rule="none"
				{after}
				style="--detail-rail-top: calc(var(--chrome-offset) + 2rem);"
				left={hasImpact ? impact : undefined}
				right={hasSidePanel ? projectsAside : undefined}
				railScroll
				bind:activeId={activeTocId}
				toc={{ entries: tocEntries, navigation, landFragments: true }}
			>
				<div class="sections article-body" data-ripple-exempt>
					<!-- Phones and tablets: the metric before the story. -->
					{#if metricValue}
						<div class="metric-inline">
							<Separator variant="hand-drawn" class="absolute inset-x-0 -bottom-[4px]" data-testid="content-divider" />
							<span class="metric-inline-value">{metricValue}</span>
							{#if metricLabel}
								<span class="metric-inline-label">{metricLabel}</span>
							{/if}
							{#if benefitHeadline}
								<p class="metric-inline-headline">{benefitHeadline}</p>
							{/if}
						</div>
					{/if}

					<!-- Is this you? The answer to "is this for me" never folds. -->
					{#if fitSection}
						<div>
							<CollapsibleSection title={fitSection.title} anchor={fitSection.anchor} collapsible={false} textSize="inherit">
								{#snippet icon()}
									<SectionIcon name={FIT_ICON} class="h-4 w-4 shrink-0 text-primary" />
								{/snippet}
								{@render sectionBody(fitSection.content)}
							</CollapsibleSection>
						</div>
					{/if}

					{#if valueProposition}
						<div>
							<CollapsibleSection title={valuePropositionHeading} anchor="svc-valueprop" open={true}>
								{#snippet icon()}
									<SectionIcon name="eye" class="h-4 w-4 shrink-0 text-primary" />
								{/snippet}
								{#snippet summary()}
									{#if valueProposition?.lead}
										<p class="section-lead">{valueProposition.lead}</p>
									{/if}
								{/snippet}
								<p class="section-body">{valueProposition.rest}</p>
							</CollapsibleSection>
						</div>
					{/if}

					{#if service.deliverables && service.deliverables.length > 0}
						<div>
							<CollapsibleSection title={deliverablesHeading} anchor="svc-deliverables" open={true}>
								{#snippet icon()}
									<SectionIcon name="list" class="h-4 w-4 shrink-0 text-primary" />
								{/snippet}
								<div class="deliverables-grid">
									{#each service.deliverables as deliverable}
										<div class="deliverable-item">
											<span class="deliverable-dot first-line-bullet" aria-hidden="true"></span>
											<span>{resolveLocale(deliverable, locale)}</span>
										</div>
									{/each}
								</div>
							</CollapsibleSection>
						</div>
					{/if}

					{#each laterSections as section, index (section.anchor)}
						<div>
							<CollapsibleSection
								title={section.title}
								anchor={section.anchor}
								open={true}
								icon={index === 0 ? approachIcon : undefined}
							>
								{@render sectionBody(section.content)}
							</CollapsibleSection>
						</div>
					{/each}
				</div>
			</DetailFrame>
		</PageSection>

		<PageSection class="services-band" data-register="expressive" data-testid="service-cta">
			<CtaBand testidPrefix="service-cta-band" />
		</PageSection>
	</PageSections>
</div>

<style>
	.service-detail {
		/* transparent so the root .circuit-grid shows through, matching /projects */
		min-height: 100dvh;
	}

	/* Not sticky on a service page: the strip and its orange top scroll away with the page. */
	.tabs-bar {
		position: relative;
		z-index: var(--z-rail);
	}

	/* ── Opening ── */

	.hero-area {
		padding: 0.5rem var(--space-page-x) clamp(1rem, 2vw, 1.75rem);
	}

	.back-link {
		display: inline-flex;
		align-items: center;
		min-height: 2.75rem; /* 44px touch target */
		margin: 0 0 0.25rem -0.5rem; /* compensate the padding so the text stays flush */
		padding-inline: 0.5rem;
		font-family: var(--font-mono);
		font-size: var(--text-back-link);
		color: var(--primary);
		text-decoration: none;
	}

	.back-link:hover {
		text-decoration: underline;
	}

	/* Phones: the title, annotation and drawing share one row. */
	.hero-grid {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		grid-template-areas:
			'title art'
			'desc desc'
			'bulk bulk';
		column-gap: 0.5rem;
		align-items: center;
	}

	.title-cell {
		grid-area: title;
		container-type: inline-size;
	}

	.detail-title {
		margin: 0;
		font-family: var(--font-heading);
		font-size: max(1.125rem, min(clamp(var(--text-title), 10vw, var(--text-display)), calc(100cqi / var(--title-fit-units))));
		font-weight: 900;
		line-height: 1.05;
		letter-spacing: -0.02em;
		color: var(--foreground);
		overflow-wrap: break-word;
		text-wrap: balance;
	}

	.svg-mobile {
		grid-area: art;
		display: flex;
		align-items: center;
		gap: 0.125rem;
	}

	.svg-mobile :global(.svg-panel--banner) {
		flex: none;
		width: auto;
		padding: 0.25rem;
	}

	/* !important outranks SvgIcon's inline size, as in ServiceSvgPanel. */
	.svg-mobile :global([data-slot='svg-icon']) {
		width: 56px !important;
		height: 56px !important;
	}

	.svg-desktop {
		display: none;
		grid-area: art;
		position: relative;
	}

	.svg-desktop :global(.svg-panel:not(.svg-panel--banner)) {
		width: clamp(200px, 18vw, 256px);
		aspect-ratio: 1;
	}

	.click-me {
		position: absolute;
		top: 1rem;
		right: calc(100% + 0.25rem);
		height: 64px;
		pointer-events: none;
	}

	.click-me--mobile {
		position: relative;
		inset: auto;
		display: block;
		flex: none;
		inline-size: clamp(3rem, 15vw, 4.75rem);
		height: auto;
	}

	@media (prefers-reduced-motion: reduce) {
		.click-me--mobile { display: none; }
	}

	.detail-description {
		grid-area: desc;
		max-width: 60ch;
		margin: 0.75rem 0 0;
		font-size: var(--text-reading);
		line-height: 1.6;
		color: var(--secondary-foreground);
	}

	.sections-slot {
		grid-area: bulk;
		display: flex;
		margin-top: 0.75rem;
	}

	@media (--tablet-min) {
		.hero-grid {
			grid-template-rows: auto auto 1fr;
			grid-template-areas:
				'title art'
				'desc art'
				'bulk art';
			column-gap: clamp(2rem, 4vw, 4rem);
			align-items: start;
		}

		.svg-mobile {
			display: none;
		}

		.svg-desktop {
			display: block;
		}

		/* "click me" hangs left of the drawing: the words keep clear of its arrow. */
		.detail-title {
			font-size: var(--text-display);
			max-width: calc(100% - 8rem);
		}

		.detail-description {
			max-width: min(60ch, calc(100% - 8rem));
		}
	}

	/* ── Impact column (desktop rail) ── */

	.impact-column {
		display: flex;
		flex-direction: column;
	}

	.impact-toc {
		margin-bottom: 2rem;
	}

	/* The published metric in reading ink, smaller, its label in sentence case. */
	.impact-metric {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.impact-value {
		overflow-wrap: anywhere;
		font-family: var(--font-heading);
		font-size: var(--text-title);
		font-weight: 900;
		line-height: 1.1;
		color: var(--foreground);
		font-variant-numeric: tabular-nums;
	}

	.impact-label {
		font-size: var(--text-small);
		color: var(--secondary-foreground);
	}

	.benefit-headline {
		font-size: var(--text-body);
		font-weight: 500;
		color: var(--secondary-foreground);
		line-height: 1.5;
	}

	/* ── Inline metric (below 1024px) ── */

	.metric-inline {
		position: relative;
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.25rem 0.625rem;
		padding-bottom: 1rem;
		margin-bottom: 0.5rem;
	}

	@media (--desktop-min) {
		.metric-inline {
			display: none;
		}
	}

	.metric-inline-value {
		max-width: 100%;
		overflow-wrap: anywhere;
		font-family: var(--font-heading);
		font-size: var(--text-heading);
		font-weight: 900;
		line-height: 1.2;
		color: var(--foreground);
		font-variant-numeric: tabular-nums;
	}

	.metric-inline-label {
		font-size: var(--text-small);
		color: var(--secondary-foreground);
	}

	.metric-inline-headline {
		flex-basis: 100%;
		font-size: var(--text-body);
		color: var(--secondary-foreground);
		line-height: 1.5;
		margin-top: 0.25rem;
	}

	/* ── Sections ── */

	.sections {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.section-body {
		display: flex;
		flex-direction: column;
		gap: 0.875rem;
		color: var(--secondary-foreground);
	}

	.section-lead {
		margin: 0;
		color: var(--foreground);
	}

	.section-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.deliverables-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 0.625rem;
	}

	@media (--tablet-min) {
		.deliverables-grid {
			grid-template-columns: 1fr 1fr;
		}
	}

	.deliverable-item {
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
		color: var(--secondary-foreground);
	}

	.deliverable-dot {
		--bullet-size: 6px;
		background: var(--primary);
	}

	/* ── Related projects and stack ── */

	.projects-panel {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.projects-mobile {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 1.5rem var(--space-page-x);
	}

	@media (--desktop-min) {
		.projects-mobile {
			display: none;
		}
	}

	.nav-area {
		padding: 0 var(--space-page-x) 1rem;
	}
</style>
