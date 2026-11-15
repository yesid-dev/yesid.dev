<!--
  Get in touch: the terminal panel without its console costume (D-M6). No pretend command, no
  ">" prompts and no filler line; the email, GitHub and LinkedIn are real links, and the
  dimension line sits under the title bar (D22). The card contains links, so it is the kit's
  interactive card: it lifts 1px and lights its edge, the same in both themes. The one yellow
  "talk to Yesid" button closes it.
-->
<script lang="ts">
	import type { AboutCta } from '#lib/types.ts';
	import { resolveLocale } from '#lib/utils/locale.ts';
	import { localizeHref } from '#lib/utils/locale-routing.ts';
	import { getLocale } from '#lib/utils/locale-context.ts';

	const locale = getLocale();
	import { TerminalPanel } from '@yesid/ui/brand';
	import { siteLabels } from '#lib/content/index.ts';
	import { Button } from '@yesid/ui/button';
	import { Card } from '@yesid/ui/card';
	import AboutCardHeading from './AboutCardHeading.svelte';
	import { aboutLabels, contactLines } from './about-copy.ts';

	let { cta, heading }: { cta: AboutCta; heading: string } = $props();

	const buttonLabel = $derived(resolveLocale(cta.buttonLabel, locale));
	const terminalTitle = $derived(resolveLocale(siteLabels.ui.terminalTitle, locale));
	const lines = $derived(contactLines(cta.lines, locale));
	const newTab = $derived(resolveLocale(aboutLabels.opensInNewTab, locale));
</script>

<Card interactive class="relative h-full p-3" data-testid="about-cta">
	<div class="relative flex flex-col">
		<AboutCardHeading text={heading} />

		<TerminalPanel title={terminalTitle} rule="dimension" class="mt-3">
			<ul class="contact-lines font-mono text-reading-code leading-[1.6] lg:text-reading-code-desktop" data-testid="about-contact-lines">
				{#each lines as line}
					{#if line.kind === 'link'}
						<li>
							<span class="contact-label">{line.label}</span>
							<a
								href={line.href}
								target={line.external ? '_blank' : undefined}
								rel={line.external ? 'noopener noreferrer' : undefined}
								data-testid="about-contact-link"
							>{#each line.display as part, i}{#if i > 0}<wbr />{/if}{part}{/each}{#if line.external}<span class="sr-only"> {newTab}</span>{/if}</a>
						</li>
					{:else}
						<li>{line.text}</li>
					{/if}
				{/each}
			</ul>
		</TerminalPanel>

		<!-- Action row: the About view's one "talk to Yesid" conversion, yellow. -->
		<div class="mt-3 flex flex-wrap items-center gap-3">
			<Button variant="conversion" size="cta" href={localizeHref(cta.buttonHref, locale)} data-testid="about-cta-button">
				{buttonLabel}
			</Button>
		</div>
	</div>
</Card>

<style>
	.contact-lines {
		display: grid;
		gap: 2px;
		margin: 0;
		padding: 0;
		list-style: none;
		color: var(--terminal-ink);
	}

	.contact-label {
		color: var(--terminal-ink-muted);
	}

	/* Each link occupies its own row space; keep the anchor classless for kit text-link styles. */
	.contact-lines :global(a) {
		display: inline-block;
		box-sizing: border-box;
		min-height: 44px;
		padding-block: 10px;
		overflow-wrap: normal;
		word-break: normal;
	}
</style>
