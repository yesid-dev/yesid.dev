<script lang="ts">
	import '#lib/styles/article-body.css';
	import type { AboutIntroContent } from '#lib/types.ts';
	import { aboutPageContent } from '#lib/content/index.ts';
	import AboutLanguages from '#lib/components/about/AboutLanguages.svelte';
	import AboutEducation from '#lib/components/about/AboutEducation.svelte';
	import AboutWeather from '#lib/components/about/AboutWeather.svelte';
	import AboutInterests from '#lib/components/about/AboutInterests.svelte';
	import TitleWithDot from '#lib/components/shared/TitleWithDot.svelte';
	import { resolveLocale } from '#lib/utils/locale.ts';
	import { getLocale } from '#lib/utils/locale-context.ts';
	import { localizeHref } from '#lib/utils/locale-routing.ts';

	const locale = getLocale();

	let { about }: { about: AboutIntroContent } = $props();

	const name = $derived(resolveLocale(about.name, locale));
	const title = $derived(resolveLocale(about.title, locale));
	const bio = $derived(resolveLocale(about.bio, locale));
	const moreLink = $derived(resolveLocale(about.moreLink, locale));

	// The cards read the same generated About content as /about itself, so a CMS edit lands in both
	// places from one publish. They pass the same headings About computes (owner live QA, DEV-43),
	// so both surfaces render the identical shared cards: no STOP numbers, no lamp, no glow. Weather
	// self-refreshes from /api/weather after hydration (the widget's own behavior).
	const c = aboutPageContent;
	const headings = $derived({
		languages: resolveLocale(c.stopLabels.clients, locale),
		education: resolveLocale(c.stopLabels.stack, locale),
		weather: resolveLocale(c.cardHeadings.weather, locale),
		interests: resolveLocale(c.stopLabels.interests, locale),
	});
</script>

<div class="about-teaser reading-detail" data-testid="home-about-teaser">
	<div class="teaser-identity">
		<p class="teaser-name"><TitleWithDot text={name} /></p>
		<p class="teaser-title">{title}</p>
		<p class="teaser-bio article-body">{bio}</p>
		<a href={localizeHref('/about', locale)} class="teaser-more tap-feedback" data-testid="home-about-more">
			{moreLink}
		</a>
	</div>

	<!-- Full-bleed badge wall: About's exact container (px-3) + 4px bento
	     seams, so the cards render at their true About size. -->
	<div class="teaser-badges-bleed">
		<div class="teaser-badges" data-testid="home-about-badges">
			<div class="badge-cell badge-cell--languages">
				<AboutLanguages languages={c.languages} heading={headings.languages} />
			</div>
			<div class="badge-cell badge-cell--education">
				<AboutEducation education={c.education} heading={headings.education} />
			</div>
			<div class="badge-cell badge-cell--weather">
				<AboutWeather config={c.weather} weather={null} heading={headings.weather} />
			</div>
			<div class="badge-cell badge-cell--interests">
				<AboutInterests interests={c.interests} heading={headings.interests} />
			</div>
		</div>
	</div>
</div>

<style>

	.about-teaser {
		display: grid;
		gap: 2.5rem;
		width: 100%;
		padding-block: 3.5rem;
	}

	.teaser-identity {
		padding-inline: var(--space-page-x);
		text-align: center;
	}

	.teaser-name {
		font-family: var(--font-heading);
		font-size: var(--text-display);
		font-weight: 900;
		line-height: 1.05;
		color: var(--foreground);
	}

	.teaser-title {
		margin-top: 0.5rem;
		font-family: var(--font-mono);
		font-size: var(--text-subheading);
		letter-spacing: 1.5px;
		text-transform: uppercase;
		color: var(--accent-text);
	}

	.teaser-bio.article-body {
		margin-top: 1.25rem;
		margin-inline: auto;
		max-width: 52ch;
		color: var(--secondary-foreground);
	}

	.teaser-more {
		display: inline-flex;
		align-items: center;
		min-block-size: var(--size-tap-min);
		margin-top: 1.25rem;
		padding: 0.5rem 0.25rem;
		border-radius: var(--radius-md);
		font-family: var(--font-mono);
		font-size: var(--text-body);
		color: var(--primary);
	}

	/* Mirror About's bento geometry so shared badges keep the same footprint on both surfaces. */
	/* About's exact container: px-3 wrapper + 4px bento seams. */
	.teaser-badges-bleed {
		padding-inline: 0.75rem;
	}

	.teaser-badges {
		display: grid;
		grid-template-columns: 1fr;
		grid-template-areas:
			'languages'
			'education'
			'weather'
			'interests';
		grid-auto-rows: auto;
		gap: 4px;
	}

	.badge-cell--languages { grid-area: languages; }
	.badge-cell--education { grid-area: education; }
	.badge-cell--weather { grid-area: weather; }
	.badge-cell--interests { grid-area: interests; }

	/* Foldable/tablet: 2-col, natural heights (About's mid-breakpoint model). */
	@media (min-width: 640px) {
		.teaser-badges {
			grid-template-columns: repeat(2, 1fr);
			grid-template-areas:
				'languages education'
				'weather   interests';
		}
	}

	/* Desktop: the 4-column square, CENTERED, at About's TRUE cell size:
	   each column is exactly one About dashboard column
	   ((100vw - px-3*2 - 5 seams) / 6), so four of them + 3 seams sit as a
	   centered block; rows keep About's exact row height. */
	@media (--desktop-min) {
		.teaser-badges-bleed {
			width: calc((100vw - 24px - 20px) / 6 * 4 + 12px);
			margin-inline: auto;
			padding-inline: 0;
		}

		.teaser-badges {
			grid-template-columns: repeat(4, 1fr);
			grid-template-rows: repeat(2, 1fr);
			grid-template-areas:
				'languages education education weather'
				'interests interests interests interests';
			height: calc((100dvh - 5rem - 48px) / 2);
		}
	}
</style>
