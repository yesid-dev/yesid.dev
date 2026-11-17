<script lang="ts">
	import '#lib/styles/article-body.css';

	import BlockRenderer from '#lib/components/cms/BlockRenderer.svelte';
	import { ReadingFrame } from '@yesid/ui/layout';
	import { legalContents } from '#lib/utils/legal-contents.ts';
	import { siteNavigationLabels } from '#lib/content/site-navigation-labels.ts';
	import { getLocale } from '#lib/utils/locale-context.ts';
	import { resolveLocale } from '#lib/utils/locale.ts';

	let { data } = $props();

	const locale = getLocale();
	const title = $derived(resolveLocale(data.legalPage.title, locale));
	const body = $derived(resolveLocale(data.legalPage.body, locale));
	const contents = $derived(legalContents(body));
	const contentsLabel = $derived(resolveLocale(siteNavigationLabels.navChrome.shared.tocHeading, locale));
</script>

<ReadingFrame {title} sections={contents.sections} {contentsLabel} contentsRule="hand-drawn" class="reading-detail" data-testid="page-legal" data-ripple-exempt>
	<div class="article-body legal-body prose-dark" data-testid="legal-body">
		<BlockRenderer doc={body} headingIds={contents.headingIds} headingAliases={contents.headingAliases} />
	</div>
</ReadingFrame>
