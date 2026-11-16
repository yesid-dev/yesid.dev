import { describe, expect, it } from 'vitest';
import { forDevelopersSummaries, isForDevelopersSection } from './editorial-copy.ts';

describe('editorial copy', () => {
	it('finds the "For developers" section by its English CMS title in any locale', () => {
		expect(isForDevelopersSection({ en: 'For developers', fr: 'Pour les développeurs', es: 'Para desarrolladores' })).toBe(true);
		expect(isForDevelopersSection({ en: '  for Developers ' })).toBe(true);
		expect(isForDevelopersSection({ en: 'Links', fr: 'For developers' })).toBe(false);
	});

	it('gives each summarised case study its line in English, French and Spanish', () => {
		for (const summary of Object.values(forDevelopersSummaries)) {
			for (const locale of ['en', 'fr', 'es'] as const) {
				expect(summary[locale]?.trim()).toBeTruthy();
				expect(summary[locale]).not.toContain('\u2014');
			}
		}
		expect(Object.keys(forDevelopersSummaries)).toEqual(['transit-data-pipeline', 'cafe-arona']);
	});
});
