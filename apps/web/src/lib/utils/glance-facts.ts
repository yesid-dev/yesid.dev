import type { BlockEditorDoc, LocalizedBlockEditorDoc } from '@repo/shared';
import type { Locale } from '#lib/types.ts';

/** One "At a glance" row as plain text. */
export interface GlanceFact {
	label: string;
	value: string;
}

const NAMED_ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

/** Table cells hold inline HTML (links, code); a card shows their words only. */
function plainText(html: string): string {
	return html
		.replace(/<[^>]*>/g, '')
		.replace(/&(?:#(\d+)|#x([0-9a-f]+)|(amp|lt|gt|quot|apos|nbsp));/gi, (entity, dec?: string, hex?: string, name?: string) => {
			if (name) return NAMED_ENTITIES[name.toLowerCase()]!;
			const code = dec ? Number(dec) : parseInt(hex!, 16);
			return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : entity;
		})
		.replace(/\s+/g, ' ')
		.trim();
}

/** The rows of a case study's first table (its "At a glance"), heading row excluded. */
function glanceRows(doc: BlockEditorDoc | undefined): string[][] {
	const table = doc?.blocks.find((block) => block.type === 'table');
	const content = (table?.data as { content?: unknown } | undefined)?.content;
	if (!Array.isArray(content)) return [];
	const rows = content.filter((row): row is string[] => Array.isArray(row) && row.length >= 2);
	const withHeadings = (table?.data as { withHeadings?: boolean }).withHeadings !== false;
	return withHeadings ? rows.slice(1) : rows;
}

/**
 * Picks the case study's key "At a glance" facts for a card: the rows whose English labels are
 * `keys`, read in `locale` (rows keep one order in every language), else the first `limit` rows.
 */
export function keyGlanceFacts(
	description: LocalizedBlockEditorDoc,
	locale: Locale,
	keys: readonly string[] = [],
	limit = 3,
): GlanceFact[] {
	const english = glanceRows(description.en);
	const localized = glanceRows(description[locale] ?? description.en);
	const rows = localized.length === english.length ? localized : english;
	const picked = keys
		.map((key) => english.findIndex((row) => plainText(row[0]!) === key))
		.filter((index) => index >= 0);
	const indexes = picked.length > 0 ? picked : rows.map((_, index) => index);
	return indexes
		.slice(0, limit)
		.map((index) => ({ label: plainText(rows[index]![0]!), value: plainText(rows[index]![1]!) }))
		.filter((fact) => fact.label && fact.value);
}
