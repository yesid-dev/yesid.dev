<!--
  Education: the two schools on their orange station rings. Shared with the home's About block,
  which passes `stop` and `label` and renders as it always has. About passes `heading` (D-M6): a
  plain heading, a static card without glow, and in a narrow card the mark sits above its words
  so a program never breaks inside a word.
-->
<script lang="ts">
	import type { AboutEducationItem } from '#lib/types.ts';
	import { resolveLocale } from '#lib/utils/locale.ts';
	import { getLocale } from '#lib/utils/locale-context.ts';
	import { cursorGlow } from '@yesid/motion/actions';
	import StopLabel from '#lib/components/brand/StopLabel.svelte';
	import { Card } from '@yesid/ui/card';
	import AboutCardHeading from './AboutCardHeading.svelte';

	const locale = getLocale();

	let {
		education,
		stop = '',
		label = '',
		heading,
	}: { education: readonly AboutEducationItem[]; stop?: string; label?: string; heading?: string } = $props();
</script>

{#snippet schools()}
	<div class="edu-line mt-4 flex flex-1 flex-col justify-center">
		{#each education as item}
			{@const school = resolveLocale(item.school, locale)}
			{@const program = resolveLocale(item.program, locale)}
			<div class="edu-stop">
				<div class="edu-mark">
					<!-- Real school marks, pixel-traced to vector (Champlain
					     Cougars navy paw / Bishop's purple BU monogram). Brand
					     colours are baked into the artwork; a white outline keeps
					     each mark legible in both themes. The orange ring
					     is the wayfinding chrome: the station the school sits on. -->
					<img
						src={item.icon === 'champlain'
							? '/images/about/edu-champlain.svg'
							: '/images/about/edu-bishops.svg'}
						alt=""
						width="40"
						height="40"
						loading="lazy"
					/>
				</div>
				<div class="min-w-0">
					<div class="school">{school}</div>
					<div class="program">{program}</div>
				</div>
			</div>
		{/each}
	</div>
{/snippet}

{#if heading !== undefined}
	<Card class="edu-card edu-plain h-full p-3" data-testid="about-education">
		<div class="relative flex h-full flex-col">
			<AboutCardHeading text={heading} />
			{@render schools()}
		</div>
	</Card>
{:else}
	<div class="group h-full" use:cursorGlow>
		<Card class="h-full p-3" data-testid="about-education">
			<div class="relative flex h-full flex-col">
				<StopLabel {stop} {label} as="h2" />
				{@render schools()}
			</div>
		</Card>
	</div>
{/if}

<style>

	.edu-line {
		position: relative;
		gap: 1.1rem;
		padding-left: 0.35rem;
	}

	.edu-stop {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		align-items: center;
		gap: 0.9rem;
	}

	/* The mark sits in a clean orange wayfinding ring — transparent centre,
	   no fill — so the navy paw / purple monogram pop as the station glyph. */
	.edu-mark {
		display: grid;
		place-items: center;
		width: 3rem;
		height: 3rem;
		flex: 0 0 auto;
		border-radius: var(--radius-pill);
		border: 2px solid color-mix(in srgb, var(--primary) 55%, transparent);
		box-shadow: 0 0 0 4px color-mix(in srgb, var(--glow) 8%, transparent);
		transition: border-color var(--duration-normal) var(--ease-default);
	}

	.group:hover .edu-mark {
		border-color: var(--primary);
	}

	.edu-mark img {
		width: 2.25rem;
		height: 2.25rem;
		object-fit: contain;
	}

	/* Legible: school name steps up to text-small heading weight, program to
	   a comfortable readable line. */
	.school {
		overflow-wrap: anywhere;
		font-family: var(--font-heading);
		font-size: var(--text-small);
		font-weight: 800;
		letter-spacing: -0.01em;
		line-height: 1.2;
		color: var(--foreground);
	}

	.program {
		margin-top: 0.25rem;
		font-size: var(--text-small);
		line-height: 1.45;
		color: var(--secondary-foreground);
	}

	/* About (D-M6): the rings keep their orange edge without the glow, and words break only
	   between words. In a narrow card the mark sits above its school, so the words keep the
	   card's whole width. */
	:global(.edu-card) {
		container: about-education / inline-size;
	}

	:global(.edu-plain) .edu-mark {
		box-shadow: none;
		transition: none;
	}

	:global(.edu-plain) .school,
	:global(.edu-plain) .program {
		overflow-wrap: normal;
		word-break: normal;
		hyphens: none;
	}

	@container about-education (max-width: 260px) {
		:global(.edu-plain) .edu-stop {
			grid-template-columns: minmax(0, 1fr);
			justify-items: start;
			gap: 0.5rem;
		}
	}
</style>
