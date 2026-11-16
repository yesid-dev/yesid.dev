import { describe, expect, it } from 'vitest';
import { contactLines, sentenceCase } from './about-copy.ts';

describe('sentenceCase', () => {
	it.each([
		['FUN FACTS', 'en', 'Fun facts'],
		['CORE BELIEFS', 'en', 'Core beliefs'],
		['INTÉRÊTS', 'fr', 'Intérêts'],
		['DATOS CURIOSOS', 'es', 'Datos curiosos'],
	] as const)('shows %s as %s', (value, locale, expected) => {
		expect(sentenceCase(value, locale)).toBe(expected);
	});

	it('keeps a value already written in mixed case', () => {
		expect(sentenceCase('Get in touch', 'en')).toBe('Get in touch');
		expect(sentenceCase('MTL Food', 'en')).toBe('MTL Food');
		expect(sentenceCase('3×5K', 'en')).toBe('3×5K');
	});
});

describe('contactLines', () => {
	const lines = [
		{ text: { en: '> Ready for new projects', fr: '> Prêt pour de nouveaux projets', es: '> Listo para nuevos proyectos' }, color: 'orange' as const },
		{ text: { en: '> AI-accelerated, human-owned', fr: "> Développement assisté par l'IA, sous contrôle humain", es: '> Con ayuda de IA, bajo control humano' }, color: 'muted' as const },
		{ text: { en: '> Email: contact@yesid.dev', fr: '> Courriel : contact@yesid.dev', es: '> Correo: contact@yesid.dev' }, color: 'muted' as const },
		{ text: '> LinkedIn: https://www.linkedin.com/in/otaloray/', color: 'muted' as const },
	];

	it('drops the prompts and the retired filler, and makes addresses links', () => {
		expect(contactLines(lines, 'fr')).toEqual([
			{ kind: 'text', text: 'Prêt pour de nouveaux projets' },
			{ kind: 'link', label: 'Courriel :', href: 'mailto:contact@yesid.dev', display: ['contact@yesid.dev'], external: false },
			{ kind: 'link', label: 'LinkedIn:', href: 'https://www.linkedin.com/in/otaloray/', display: ['linkedin.com/', 'in/', 'otaloray'], external: true },
		]);
	});

	it('keeps any other supplied line', () => {
		expect(contactLines([{ text: 'Supplied terminal output', color: 'muted' }], 'en')).toEqual([{ kind: 'text', text: 'Supplied terminal output' }]);
	});

	it.each(['http-support@example.com', 'https-team@example.com'])('keeps %s as an email address', (address) => {
		expect(contactLines([{ text: `Email: ${address}`, color: 'muted' }], 'en')).toEqual([
			{ kind: 'link', label: 'Email:', href: `mailto:${address}`, display: [address], external: false },
		]);
	});
});
