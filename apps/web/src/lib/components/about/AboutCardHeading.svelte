<!--
  An About card's heading (D-M6): the card starts with its subject in sentence case and reading
  ink, where the "STOP 0n · NAME" label and its lamp stood. yesid.design has no card title part
  yet (kit gap reported in DEV-42), so this is plain heading type on the page.
-->
<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { getLocale } from '#lib/utils/locale-context.ts';
	import { sentenceCase } from './about-copy.ts';

	let { text, class: className = '', ...rest }: { text: string; class?: string } & HTMLAttributes<HTMLHeadingElement> = $props();

	const locale = getLocale();
</script>

<h2 class="about-card-heading {className}" data-slot="card-heading" {...rest}>{sentenceCase(text, locale)}</h2>

<style>
	.about-card-heading {
		margin: 0;
		font-family: var(--font-heading);
		font-size: var(--text-body);
		font-weight: 600;
		line-height: 1.3;
		letter-spacing: -0.005em;
		color: var(--foreground);
		text-wrap: balance;
	}
</style>
