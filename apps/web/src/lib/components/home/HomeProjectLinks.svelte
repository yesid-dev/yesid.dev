<!-- A home project card's own links: Case study, Website and Repo where they exist, each named with its project. -->
<script lang="ts">
	import type { ProjectSummary } from '#lib/types.ts';
	import { trackLinkActivation } from '#lib/analytics/site-events.ts';
	import { isProjectProofHref } from '#lib/utils/high-intent-links.ts';
	import { resolveLocale } from '#lib/utils/locale.ts';
	import { localizeHref } from '#lib/utils/locale-routing.ts';
	import { getLocale } from '#lib/utils/locale-context.ts';
	import { fillTemplate } from '#lib/utils/labels.ts';
	import { SITE_HOST } from '#lib/utils/seo-defaults.ts';
	import { homeLabels } from './home-labels.ts';

	let { project }: { project: ProjectSummary } = $props();

	const locale = getLocale();
	const l = homeLabels.projects;
	const name = $derived(resolveLocale(project.title, locale));
	const newTab = resolveLocale(homeLabels.hero.newTab, locale);
	const named = (template: typeof l.caseStudyName) => fillTemplate(resolveLocale(template, locale), { project: name });

	// This site's own card has no Website link: the visitor is on it.
	const isThisSite = (href: string) => href.replace(/\/+$/, '') === SITE_HOST;

	function track(event: MouseEvent, href: string, link: 'live' | 'repo'): void {
		if (isProjectProofHref(href)) trackLinkActivation(event, 'project_proof_click', { link });
	}
</script>

<ul class="home-project-links" data-testid="home-project-links">
	<li>
		<a href={localizeHref(`/projects/${project.slug}`, locale)} aria-label={named(l.caseStudyName)} data-testid="home-project-case-study"
			>{resolveLocale(l.caseStudy, locale)}</a
		>
	</li>
	{#if project.liveUrl && !isThisSite(project.liveUrl)}
		{@const href = project.liveUrl}
		<li>
			<a
				{href}
				target="_blank"
				rel="noopener noreferrer"
				aria-label="{named(l.websiteName)}{newTab}"
				data-testid="home-project-website"
				onclick={(event) => track(event, href, 'live')}
				onauxclick={(event) => track(event, href, 'live')}>{resolveLocale(l.website, locale)}</a
			>
		</li>
	{/if}
	{#if project.repoUrl && !project.repoPrivate}
		{@const href = project.repoUrl}
		<li>
			<a
				{href}
				target="_blank"
				rel="noopener noreferrer"
				aria-label="{named(l.repoName)}{newTab}"
				data-testid="home-project-repo"
				onclick={(event) => track(event, href, 'repo')}
				onauxclick={(event) => track(event, href, 'repo')}>{resolveLocale(l.repo, locale)}</a
			>
		</li>
	{/if}
</ul>

<style>
	.home-project-links {
		display: flex;
		flex-wrap: wrap;
		gap: 0 1.5rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	/* Text links in the brand's orange (base.css styles class-less links); each a 44px target. */
	.home-project-links :global(a) {
		display: inline-flex;
		align-items: center;
		min-height: var(--size-tap-min);
	}
</style>
