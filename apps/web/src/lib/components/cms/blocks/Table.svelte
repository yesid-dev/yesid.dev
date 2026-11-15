<script lang="ts">
	import { sanitizeTableCell, stripHtml, type TableBlock } from '@repo/shared';
	import { parseDocument } from 'htmlparser2';

	let { data }: { data: TableBlock['data'] } = $props();

	function isStandaloneLink(html: string): boolean {
		let nodes = parseDocument(html).children;
		while (true) {
			const content = nodes.filter(node => node.type !== 'text' || node.data.trim());
			if (content.length !== 1 || content[0].type !== 'tag') return false;
			const element = content[0];
			if (element.name === 'a') return Boolean(element.attribs.href);
			if (!['b', 'strong', 'i', 'em', 'u', 'code'].includes(element.name)) return false;
			nodes = element.children;
		}
	}

	const rows = $derived(data.content.map(row => row.map(cell => {
		const html = sanitizeTableCell(cell);
		return { html, standalone: isStandaloneLink(html) };
	})));
	// Name the focusable scroll region from authored copy, in the post's language.
	const label = $derived(rows[0]?.map(cell => stripHtml(cell.html)).filter(Boolean).join(' · ') || 'Table');
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex (Keyboard users need to focus this overflow region to scroll it.) -->
<div class="table-scroll" role="region" aria-label={label} tabindex="0">
	<table class="table-content">
		{#if data.withHeadings && rows.length}
			<thead><tr>{#each rows[0] as cell}<th scope="col" class:standalone-link={cell.standalone}>{@html cell.html}</th>{/each}</tr></thead>
		{/if}
		<tbody>
			{#each data.withHeadings ? rows.slice(1) : rows as row}
				<tr>{#each row as cell}<td class:standalone-link={cell.standalone}>{@html cell.html}</td>{/each}</tr>
			{/each}
		</tbody>
	</table>
</div>

<style>
	.table-scroll {
		min-width: 0;
		max-width: 100%;
		overflow-x: auto;
		margin-block: 1.5em;
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
	}
	.table-scroll:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
	.table-scroll > table.table-content {
		display: table;
		width: 100%;
		border-collapse: collapse;
		font: inherit;
		color: inherit;
	}
	th, td {
		min-width: 12ch;
		padding: 0.65em 0.85em;
		text-align: start;
		vertical-align: top;
		overflow-wrap: normal;
		border: 1px solid var(--border-subtle);
	}
	th { font-weight: 600; color: var(--foreground); background: var(--card); }
	:is(th, td):has(:global(a[href])) {
		line-height: max(24px, 1.7em);
	}
	:is(th, td) :global(a[href]) {
		color: var(--primary);
		text-decoration: underline;
		line-height: inherit;
		/* Inline boxes exclude the line-height's leading from their clickable area. */
		padding-block: 1px;
	}
	.standalone-link :global(a[href]) {
		display: inline-block;
		min-block-size: 44px;
		min-inline-size: 44px;
		max-inline-size: 100%;
		align-content: center;
		vertical-align: middle;
	}
</style>
