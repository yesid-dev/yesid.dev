import { describe, expect, it } from 'bun:test';
import { BlockEditorDocSchema, type BlockEditorDoc } from '../types/blocks';
import { serializeBlocksToHtml } from './blocks';

const document = (withHeadings: boolean, withRowHeadings?: boolean): BlockEditorDoc => ({
	time: 0, version: '2.31.2', blocks: [{ id: 'comparison', type: 'table', data: {
		withHeadings, withRowHeadings,
		content: [['Project', 'Choice'], ['<b>Site</b>', 'Static']],
	} }],
});

describe('authored table row headings', () => {
	it.each([true, false])('preserves row-heading metadata with column headings %s', withHeadings => {
		const parsed = BlockEditorDocSchema.parse(document(withHeadings, true));
		expect(parsed).toEqual(document(withHeadings, true));
		const html = serializeBlocksToHtml(parsed);
		expect(html).toContain('<th scope="row"><b>Site</b></th><td>Static</td>');
		if (withHeadings) expect(html).toContain('<thead><tr><th scope="col">Project</th>');
		else expect(html).toContain('<tbody><tr><th scope="row">Project</th><td>Choice</td>');
	});
	it.each([undefined, false])('keeps ordinary first-column data when the option is %s', flag => {
		expect(serializeBlocksToHtml(BlockEditorDocSchema.parse(document(true, flag))))
			.toContain('<tbody><tr><td><b>Site</b></td><td>Static</td>');
	});
	it.each(['true', 1, null])('rejects non-boolean row-heading metadata %s', value => {
		const doc = document(true);
		expect(BlockEditorDocSchema.safeParse({ ...doc, blocks: [{ ...doc.blocks[0], data: {
			...doc.blocks[0].data, withRowHeadings: value,
		} }] }).success).toBe(false);
	});
	it('sanitizes row-header content through the existing inline allowlist', () => {
		const doc = document(false, true);
		const block = doc.blocks[0];
		if (block.type !== 'table') throw new Error('Missing table seed');
		block.data.content[0][0] = '<script>bad()</script><b onclick="bad()">Safe</b><a href="javascript:bad()">Link</a>';
		expect(serializeBlocksToHtml(doc)).toContain('<th scope="row"><b>Safe</b><a>Link</a></th>');
	});
});
