import { kebabSlug, stripHtml, type BlockEditorDoc } from '@repo/shared';

/** Keep section keys independent of translated heading text and leave the document untouched. */
export function legalContents(doc: BlockEditorDoc) {
	const used = new Set<string>();
	const headingIds: Record<string, string> = Object.create(null);
	const headingAliases: Record<string, string> = Object.create(null);
	const legacyIds = new Set(doc.blocks.filter(block => block.type === 'header')
		.map(block => kebabSlug(stripHtml(block.data.text))).filter(Boolean));
	const sections: { id: string; title: string }[] = [];

	for (const [index, block] of doc.blocks.entries()) {
		if (block.type !== 'header') continue;
		const title = stripHtml(block.data.text).trim();
		if (!title) continue;
		const key = block.id.replace(/-(?:en|fr|es)(?=-|$)/g, '');
		const base = kebabSlug(key) || `section-${index + 1}`;
		let id = base;
		let suffix = 2;
		while (used.has(id) || legacyIds.has(id)) id = `${base}-${suffix++}`;
		used.add(id);
		headingIds[block.id] = id;
		sections.push({ id, title });
	}

	const aliased = new Set<string>();
	for (const block of doc.blocks) {
		if (block.type !== 'header' || !headingIds[block.id]) continue;
		const legacy = kebabSlug(stripHtml(block.data.text));
		if (legacy && !aliased.has(legacy)) {
			headingAliases[block.id] = legacy;
			aliased.add(legacy);
		}
	}

	return { sections, headingIds, headingAliases };
}
