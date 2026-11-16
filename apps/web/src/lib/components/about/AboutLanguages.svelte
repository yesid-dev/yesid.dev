<!--
  Languages (owner live QA, DEV-43): the card is its imagery again. The plain sentence-case heading
  sits inside the top-left of the photo stack, where the old "STOP 0n · NAME" badge stood, so the
  photos keep the card's whole height; no number, lamp or glow. The readable names, the flag
  hover/tap and the shared About/Home behaviour stay as they are.
-->
<script lang="ts">
	import type { AboutLanguage } from '#lib/types.ts';
	import { asset } from '#lib/directus/assets.ts';
	import { resolveLocale } from '#lib/utils/locale.ts';
	import { getLocale } from '#lib/utils/locale-context.ts';
	import { Card } from '@yesid/ui/card';
	import LanguageFlag, { isFlagId } from './LanguageFlag.svelte';
	import AboutCardHeading from './AboutCardHeading.svelte';

	const locale = getLocale();

	let { languages, heading }: { languages: readonly AboutLanguage[]; heading: string } = $props();

	let activeIndex = $state(-1);

	function handleTap(index: number) {
		activeIndex = activeIndex === index ? -1 : index;
	}

	function resolveLanguageImage(image: string): string {
		if (image.startsWith('/') || image.startsWith('http') || image.startsWith('data:')) return image;
		return asset(image);
	}
</script>

{#snippet flags()}
	<div class="language-strip flex h-full min-h-36 flex-col">
		{#each languages as language, i}
			{@const languageLabel = resolveLocale(language.label, locale)}
			<button
				type="button"
				class="tap-press language-flag relative flex min-h-0 flex-1 items-center justify-center overflow-hidden transition-all duration-500 ease-out"
				class:language-flag-seamed={i > 0}
				class:language-flag-active={activeIndex === i}
				data-testid="about-language-flag"
				data-region={language.id}
				aria-label={languageLabel}
				aria-pressed={activeIndex === i}
				onclick={() => handleTap(i)}
			>
				{#if isFlagId(language.id)}
					<LanguageFlag id={language.id} class="flag-image absolute inset-0 transition-transform duration-500 ease-out" />
				{:else}
					<img
						src={resolveLanguageImage(language.image)}
						alt=""
						class="flag-image absolute inset-0 transition-transform duration-500 ease-out"
						data-testid="about-language-image"
						loading="lazy"
						decoding="async"
					/>
				{/if}
				<div class="flag-overlay absolute inset-0 transition-opacity duration-500"></div>

				<span class="flag-label absolute z-10 font-mono text-caption font-semibold tracking-[3px]">
					{languageLabel}
				</span>
			</button>
		{/each}
	</div>
{/snippet}

<Card class="languages-plain relative h-full !gap-0 overflow-hidden !py-0" data-testid="about-languages">
	<AboutCardHeading text={heading} class="languages-heading" />
	<div class="relative flex h-full flex-col">
		{@render flags()}
	</div>
</Card>

<style>
	.language-strip {
		container-type: inline-size;
		isolation: isolate;
	}

	/* Mobile (single-column stack, below the about grid's 500px de-stack): the
	   card height is driven only by this floor since h-full has no row to
	   stretch into. Raise it so the stacked flags read taller on phones; every
	   wider layout (2/4/6-col bento) keeps the min-h-36 floor + h-full. */
	@media (max-width: 499.98px) {
		.language-strip {
			min-height: 18rem;
		}
	}

	button.language-flag {
		appearance: none;
		border: none;
		padding: 0;
		font: inherit;
		color: inherit;
		background: transparent;
		cursor: pointer;
	}

	.language-flag {
		min-width: 0;
	}

	.language-flag-seamed {
		border-top: 1px solid color-mix(in srgb, var(--primary) 52%, transparent);
	}

	.language-flag :global(.flag-image) {
		width: 100%;
		height: 100%;
		object-fit: cover;
		filter: brightness(0.96) saturate(1.12);
		transform: scale(1.01);
	}

	.flag-overlay {
		background: color-mix(in srgb, var(--background) 12%, transparent);
	}

	/* The readable name on a firmer chip at 13px in every card width and on both surfaces. */
	.flag-label {
		right: clamp(0.35rem, 1.8cqw, 0.7rem);
		bottom: clamp(0.2rem, 1cqw, 0.45rem);
		padding: 0.1rem 0.4rem;
		border: 1px solid color-mix(in srgb, var(--primary) 42%, transparent);
		border-radius: var(--radius-sm);
		background: color-mix(in srgb, var(--background) 72%, transparent);
		color: var(--foreground);
		font-size: var(--text-caption);
		letter-spacing: 0.12em;
		line-height: 1.5;
		backdrop-filter: none;
		text-shadow: none;
		text-transform: uppercase;
		white-space: nowrap;
	}

	/* The heading sits on the imagery, in the card's top-left, above the flags and never clipped by
	   them. A halo in the card ink keeps it legible over any flag, in both themes, with no plate. */
	:global(.languages-heading) {
		position: absolute;
		z-index: 20;
		inset-block-start: 0.75rem;
		inset-inline-start: 1rem;
		max-inline-size: calc(100% - 2rem);
		text-shadow:
			0 1px 2px var(--background),
			0 0 10px color-mix(in srgb, var(--background) 88%, transparent);
	}

	:global([data-theme="light"]) .language-flag :global(.flag-image),
	:global(.theme-light) .language-flag :global(.flag-image) {
		filter: brightness(1.04) saturate(1.08);
	}

	.language-flag:hover :global(.flag-image),
	.language-flag.language-flag-active :global(.flag-image) {
		filter: brightness(1.05) saturate(1.18);
		transform: scale(1.04);
	}

	:global([data-theme='light']) .language-flag:hover :global(.flag-image),
	:global(.theme-light) .language-flag:hover :global(.flag-image),
	:global([data-theme='light']) .language-flag.language-flag-active :global(.flag-image),
	:global(.theme-light) .language-flag.language-flag-active :global(.flag-image) {
		filter: brightness(1.1) saturate(1.13);
	}

	.language-flag:hover .flag-overlay,
	.language-flag.language-flag-active .flag-overlay {
		opacity: var(--opacity-subtle);
	}

	.language-flag:hover,
	.language-flag.language-flag-active {
		flex: 1.55;
		z-index: 5;
	}
</style>
