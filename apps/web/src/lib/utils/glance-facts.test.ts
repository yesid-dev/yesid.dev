import { describe, expect, it } from 'vitest';
import type { LocalizedBlockEditorDoc } from '@repo/shared';
import { keyGlanceFacts } from './glance-facts.ts';

const table = (rows: string[][]) => ({
	time: 0,
	version: '2',
	blocks: [
		{ id: 'p', type: 'paragraph', data: { text: 'Intro.' } },
		{ id: 't', type: 'table', data: { withHeadings: true, content: rows } },
	],
});

const description = {
	en: table([
		['At a glance', ''],
		['Business', 'A family &amp; its coffee'],
		['Languages', 'French at <a href="https://example.com">example.com</a>'],
		['Who runs it', 'The family'],
		['Status', 'Complete'],
	]),
	fr: table([
		['En bref', ''],
		['Entreprise', 'Une famille'],
		['Langues', 'Français à <a href="https://example.com">example.com</a>'],
		['Qui le gère', 'La famille'],
		['Statut', 'Terminé'],
	]),
} as unknown as LocalizedBlockEditorDoc;

describe('keyGlanceFacts', () => {
	it('picks the key rows by their English labels and reads them in the page language', () => {
		expect(keyGlanceFacts(description, 'fr', ['Business', 'Who runs it'])).toEqual([
			{ label: 'Entreprise', value: 'Une famille' },
			{ label: 'Qui le gère', value: 'La famille' },
		]);
	});

	it('keeps the words of inline links and entities, never their markup', () => {
		expect(keyGlanceFacts(description, 'en', ['Business', 'Languages'])).toEqual([
			{ label: 'Business', value: 'A family & its coffee' },
			{ label: 'Languages', value: 'French at example.com' },
		]);
	});

	it('falls back to the first rows, at most three, and to English for a missing language', () => {
		expect(keyGlanceFacts(description, 'es').map((fact) => fact.label)).toEqual(['Business', 'Languages', 'Who runs it']);
	});

	it('returns nothing when the case study has no table', () => {
		expect(keyGlanceFacts({ en: { time: 0, version: '2', blocks: [] } } as unknown as LocalizedBlockEditorDoc, 'en')).toEqual([]);
	});
});

describe('glance fact text parsing', () => {
	it('reads quoted attributes and entities as text, discarding scripts and styles', () => {
		const doc = { en: table([
			['At a glance', ''],
			['<b title="a > b">Business</b>', '<script>alert(1)</script><style>p{}</style><a title="a > b">Coffee &eacute; &#x1f600;</a>'],
		]) } as unknown as LocalizedBlockEditorDoc;
		expect(keyGlanceFacts(doc, 'en')).toEqual([{ label: 'Business', value: 'Coffee é 😀' }]);
	});

	it('handles malformed nested tags without leaving tag fragments', () => {
		const doc = { en: table([
			['At a glance', ''],
			['Business', 'Safe <scr<script>ipt>alert(1)</scr</script>ipt> words'],
		]) } as unknown as LocalizedBlockEditorDoc;
		const [fact] = keyGlanceFacts(doc, 'en');
		expect(fact.value).not.toContain('<script');
	});
});
