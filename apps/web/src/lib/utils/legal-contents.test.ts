import { describe, expect, it } from 'vitest';
import type { BlockEditorBlock, BlockEditorDoc } from '@repo/shared';
import { legalContents } from './legal-contents';

const heading = (id: string, text: string): BlockEditorBlock => ({ id, type: 'header', data: { text, level: 2 } });
const document = (blocks: BlockEditorBlock[]): BlockEditorDoc => ({ time: 0, version: '2.31.2', blocks });

describe('legal contents', () => {
	it('uses the same section key for translated editor IDs', () => {
		const en = legalContents(document([heading('legal-privacy-en-003', 'Who I am')]));
		const fr = legalContents(document([heading('legal-privacy-fr-003', 'Qui je suis')]));
		expect(en.sections[0].id).toBe('legal-privacy-003');
		expect(fr.sections[0].id).toBe(en.sections[0].id);
		expect(fr.sections[0].title).toBe('Qui je suis');
	});

	it('keeps repeated heading text addressable through distinct editor keys', () => {
		const result = legalContents(document([heading('first', 'Contact'), heading('second', 'Contact')]));
		expect(result.sections.map(section => section.id)).toEqual(['first', 'second']);
	});

	it('resolves normalized-key collisions without duplicate fragment destinations', () => {
		const result = legalContents(document([heading('a_b', 'One'), heading('ab', 'Two'), heading('ab-2', 'Three')]));
		expect(result.sections.map(section => section.id)).toEqual(['ab', 'ab-2', 'ab-2-2']);
	});

	it('keeps Unicode labels with a stable ASCII fallback for non-slug editor keys', () => {
		const result = legalContents(document([heading('🚉', 'こんにちは')]));
		expect(result.sections).toEqual([{ id: 'section-1', title: 'こんにちは' }]);
	});

	it('uses plain labels, skips empty headings and preserves the source document', () => {
		const doc = document([heading('one', '<b>Cookies &amp; choices</b>'), heading('two', '<b></b>')]);
		const before = JSON.stringify(doc);
		expect(legalContents(doc).sections).toEqual([{ id: 'one', title: 'Cookies & choices' }]);
		expect(JSON.stringify(doc)).toBe(before);
	});

	it('treats prototype-like editor keys as ordinary own keys', () => {
		const result = legalContents(document([heading('__proto__', 'Contact')]));
		expect(Object.getPrototypeOf(result.headingIds)).toBeNull();
		expect(result.headingIds['__proto__']).toBe('proto');
	});

	it('preserves old fragment names once while reserving them from new keys', () => {
		const result = legalContents(document([heading('contact', 'Privacy'), heading('two', 'Contact'), heading('three', 'Contact')]));
		expect(result.sections[0].id).toBe('contact-2');
		expect(Object.values(result.headingAliases)).toEqual(['privacy', 'contact']);
		expect(new Set([...result.sections.map(section => section.id), ...Object.values(result.headingAliases)]).size).toBe(5);
	});
});
