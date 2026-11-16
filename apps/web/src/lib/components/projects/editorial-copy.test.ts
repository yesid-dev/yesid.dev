import { describe, expect, it } from 'vitest';
import { isForDevelopersSection } from './editorial-copy.ts';

describe('editorial copy', () => {
	it('finds the "For developers" section by its English CMS title in any locale', () => {
		expect(isForDevelopersSection({ en: 'For developers', fr: 'Pour les développeurs', es: 'Para desarrolladores' })).toBe(true);
		expect(isForDevelopersSection({ en: '  for Developers ' })).toBe(true);
		expect(isForDevelopersSection({ en: 'Links', fr: 'For developers' })).toBe(false);
	});
});
