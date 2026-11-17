import { expect, test } from 'bun:test';
// @ts-expect-error The browser extension is an independently built JS package.
import * as editor from '../extensions/article-editor/src/data.js';
import { BlockEditorDocSchema } from '@repo/shared';
import { trimExportData } from '../scripts/trim-export-fixture';
import { toBlogExport, type DirectusBlogPostRow } from '../scripts/lib/fetchers/blog-posts';

const table = (id: string, withRowHeadings = true) => ({ id, type: 'table', data: {
	withHeadings: true, withRowHeadings, content: [['Project', 'Choice'], ['Site', 'Static']], unknown: { value: 1 },
} });
const doc = { time: 0, version: '2.31.2', blocks: [table('first'), table('second', false)] };

test('stock table saves preserve authored metadata by block id through edits, moves, deletion and copy', () => {
	const stock = (id: string) => ({ id, type: 'table', data: { withHeadings: false, content: [['Edited']] } });
	const saved = editor.roundTrip(doc, { ...doc, blocks: [stock('second'), stock('first')] });
	expect(saved.blocks.map((b: any) => b.data.withRowHeadings)).toEqual([false, true]);
	expect(saved.blocks[1].data.content).toEqual([['Edited']]);
	expect(saved.blocks[1].data.unknown).toEqual({ value: 1 });
	expect(editor.roundTrip(saved, { ...doc, blocks: [stock('first')] }).blocks).toHaveLength(1);
	const copied = editor.pasteBlocks(doc, [doc.blocks[0]], 'second');
	const copy = copied.blocks[2];
	expect(copy.id).not.toBe('first');
	expect(editor.roundTrip(copied, { ...doc, blocks: [stock(copy.id)] }).blocks[0].data.withRowHeadings).toBe(true);
	const changedType = { id: 'first', type: 'image', data: { caption: 'Different block' } };
	expect(editor.roundTrip(doc, { ...doc, blocks: [changedType] }).blocks[0]).toEqual(changedType);
});

test('the row-heading control changes only its selected table, including explicit opt-out', () => {
	const changed = editor.setTableRowHeadings(doc, 'first', false);
	expect(changed.blocks[0].data.withRowHeadings).toBe(false);
	expect(changed.blocks[1]).toEqual(doc.blocks[1]);
	expect(doc.blocks[0]!.data.withRowHeadings).toBe(true);
	expect(editor.setTableRowHeadings(changed, 'second', true).blocks[1].data.withRowHeadings).toBe(true);
	expect(editor.setTableRowHeadings(doc, 'first', 'false').blocks[0].data.withRowHeadings).toBe(false);
});

test('clipboard accepts boolean table metadata and drops it from other blocks or malformed values', () => {
	for (const value of [true, false]) expect(editor.sanitizeClipboardBlocks([table('x', value)])[0].data.withRowHeadings).toBe(value);
	const invalid = { ...table('x'), data: { ...table('x').data, withRowHeadings: 'true' } };
	expect(editor.sanitizeClipboardBlocks([invalid])[0].data).not.toHaveProperty('withRowHeadings');
	expect(editor.sanitizeClipboardBlocks([{ id: 'p', type: 'paragraph', data: { text: 'Prose', withRowHeadings: true } }])[0].data).toEqual({ text: 'Prose' });
});

test('row-header metadata survives validation, blog export and compact fixture trimming', () => {
	const body = BlockEditorDocSchema.parse(doc);
	expect(body.blocks[0]!.data).toHaveProperty('withRowHeadings', true);
	const row = { id: 'comparison', status: 'published', date_published: '2026-01-01T00:00:00Z',
		date_modified: null, sort: 0, category: 'professional', external: false, url: null,
		cover_image: null, svg_illustration: null, animation: 'draw', tags: [],
		translations: [{ languages_code: 'en', show_on_site: true, slug: 'comparison',
			title: 'Comparison', excerpt: 'A comparison.', body, seo_title: null, seo_description: null }],
	} satisfies DirectusBlogPostRow;
	const exported = toBlogExport([row]);
	expect(exported.bodies.comparison).toEqual(body);
	expect(trimExportData({ blogBodies: exported.bodies }).blogBodies?.comparison).toEqual(body);
});
