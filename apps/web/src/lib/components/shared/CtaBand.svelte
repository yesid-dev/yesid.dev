<!-- Shared conversion band with localized content and per-surface test IDs. -->
<script lang="ts">
	import { ctaContent, heroContent, siteMeta, siteLabels } from '#lib/content/index.ts';
	import { trackLinkActivation } from '#lib/analytics/site-events.ts';
	import { Button } from '@yesid/ui/button';
	import { Separator } from '@yesid/ui/separator';
	import { resolveLocale } from '#lib/utils/locale.ts';
	import { getLocale } from '#lib/utils/locale-context.ts';
	import { localizeHref } from '#lib/utils/locale-routing.ts';
	import CtaBlueprintBackground from './CtaBlueprintBackground.svelte';

	const locale = getLocale();

	let {
		testidPrefix = 'cta-band',
		leadingRule = true,
		bookingHref,
	}: {
		testidPrefix?: string;
		/** False inside the kit's PageSections, which draws the boundary itself (D22). */
		leadingRule?: boolean;
		/**
		 * With a booking link the band offers the home's pair (D-M1): "Tell me about your project"
		 * (the one yellow button) and "Book a call" (outlined), instead of Contact and GitHub.
		 */
		bookingHref?: string;
	} = $props();

	// The CMS heading carries a deliberate \n line break.
	const headingLines = $derived(resolveLocale(ctaContent.heading, locale).split('\n'));
	const subtitle = $derived(resolveLocale(ctaContent.subtitle, locale));
	const contactLabel = $derived(resolveLocale(ctaContent.ctaContact, locale));
	const githubLabel = $derived(resolveLocale(ctaContent.ctaGithub, locale));
	const projectLabel = $derived(resolveLocale(heroContent.opening.ctaProject, locale));
	const bookingLabel = $derived(resolveLocale(heroContent.ctaContact, locale));
	const newTabLabel = $derived(` ${resolveLocale(siteLabels.a11y.opensNewTab, locale)}`);
</script>

<!-- Registered sections suppress this edge rule; legacy callers retain their own divider. -->
{#if leadingRule}<Separator variant="hand-drawn" data-edge-rule />{/if}
<section class="cta-band-shell" data-testid={testidPrefix}>
	<CtaBlueprintBackground />
	<div class="cta-band">
		<h2 class="band-heading">
			{#each headingLines as line, i}
				<span class="band-line">{line}{#if i === headingLines.length - 1}<span class="band-dot">.</span>{/if}</span>
			{/each}
		</h2>
		<p class="band-subtitle">{subtitle}</p>
		<div class="band-actions">
			{#if bookingHref}
				<Button variant="conversion" size="cta-lg" href={localizeHref('/contact', locale)} data-testid="{testidPrefix}-contact">
					{projectLabel}
				</Button>
				<Button
					variant="outline"
					size="cta-lg"
					href={bookingHref}
					target="_blank"
					rel="noopener"
					aria-label="{bookingLabel}{newTabLabel}"
					data-testid="{testidPrefix}-booking"
					onclick={(event) => trackLinkActivation(event, 'booking_click')}
					onauxclick={(event) => trackLinkActivation(event, 'booking_click')}
				>
					{bookingLabel}
				</Button>
			{:else}
				<Button
					variant="conversion"
					size="cta-lg"
					href={localizeHref('/contact', locale)}
					data-testid="{testidPrefix}-contact"
				>
					{contactLabel}
				</Button>
				<Button
					variant="default"
					size="cta-lg"
					href={siteMeta.links.github}
					target="_blank"
					rel="noopener"
					data-testid="{testidPrefix}-github"
				>
					{githubLabel}
				</Button>
			{/if}
		</div>
	</div>
</section>

<style>
	.cta-band-shell {
		position: relative;
		isolation: isolate;
		width: 100%;
		overflow: clip;
	}

	.cta-band {
		position: relative;
		z-index: 1;
		width: 100%;
		max-width: 72rem;
		margin-inline: auto;
		padding: 4rem var(--space-page-x);
		text-align: center;
	}

	.band-heading {
		font-family: var(--font-heading);
		font-size: clamp(2.5rem, 6vw, 4rem);
		font-weight: 900;
		line-height: 1.05;
		letter-spacing: -0.02em;
		color: var(--foreground);
	}

	.band-line {
		display: block;
	}

	.band-dot {
		color: var(--primary);
	}

	.band-subtitle {
		margin-top: 1.25rem;
		margin-inline: auto;
		max-width: 58ch;
		font-size: 1.125rem;
		color: var(--secondary-foreground);
		line-height: 1.7;
	}

	@media (--tablet-min) {
		.band-subtitle {
			font-size: 1.25rem;
		}
	}

	.band-actions {
		margin-top: 2.25rem;
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 1rem;
	}
</style>
