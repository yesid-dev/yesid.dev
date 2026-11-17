<!-- Inline heading marks are HTML; omit permalinks when stripped text yields an empty slug. -->
<script lang="ts">
	import type { HeaderBlock } from '@repo/shared';
	import { kebabSlug, stripHtml } from '@repo/shared';

	let { data, id, aliasId }: { data: HeaderBlock['data']; id?: string; aliasId?: string } = $props();

	const headingId = $derived(id ?? kebabSlug(stripHtml(data.text)));
	const focusProps = $derived(id ? { tabindex: -1 } : {});
	const showAnchor = $derived(headingId !== '' && data.level >= 2 && data.level <= 4);
</script>

{#snippet legacyAnchor()}
	{#if aliasId}<span id={aliasId} class="legacy-heading-anchor" aria-hidden="true"></span>{/if}
{/snippet}

{#snippet permalink()}
	{#if showAnchor}
		<a class="heading-anchor" href="#{headingId}" aria-labelledby={headingId}>#</a>
	{/if}
{/snippet}

{#if data.level === 1}
	<h1 id={headingId} {...focusProps}>{@render legacyAnchor()}{@html data.text}</h1>
{:else if data.level === 2}
	<h2 id={headingId} {...focusProps}>{@render legacyAnchor()}{@html data.text}{@render permalink()}</h2>
{:else if data.level === 3}
	<h3 id={headingId} {...focusProps}>{@render legacyAnchor()}{@html data.text}{@render permalink()}</h3>
{:else if data.level === 4}
	<h4 id={headingId} {...focusProps}>{@render legacyAnchor()}{@html data.text}{@render permalink()}</h4>
{:else if data.level === 5}
	<h5 id={headingId} {...focusProps}>{@render legacyAnchor()}{@html data.text}</h5>
{:else}
	<h6 id={headingId} {...focusProps}>{@render legacyAnchor()}{@html data.text}</h6>
{/if}

<style>
	.legacy-heading-anchor { display: block; height: 0; scroll-margin-top: calc(var(--nav-clearance, 5.5rem) + 1rem); }
</style>
