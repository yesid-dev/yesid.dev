import { it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/svelte';
import AboutCta from './AboutCta.svelte';
import { aboutPageContent } from '#lib/content/about-page.ts';
import { resolveLocale } from '#lib/utils/locale.ts';

const context = (locale: string) => new Map([[Symbol.for('@yesid/ui/locale'), () => locale]]);

it.each(['en', 'fr', 'es'] as const)('renders the kept lines without prompts and the contact destination in %s', (locale) => {
	render(AboutCta, { props: { cta: aboutPageContent.cta, heading: 'Get in touch' }, context: context(locale) });
	expect(screen.getByTestId('about-cta-button')).toHaveAttribute('href', `${locale === 'en' ? '' : `/${locale}`}/contact`);
	const lines = screen.getByTestId('about-contact-lines');
	const first = aboutPageContent.cta.lines[0].text;
	expect(lines).toHaveTextContent((typeof first === 'string' ? first : resolveLocale(first, locale)).replace(/^>\s*/, ''));
	// The owner removed the pretend command, the ">" prompts and the filler line (D-M6).
	expect(screen.getByTestId('about-cta')).not.toHaveTextContent(aboutPageContent.cta.command);
	expect(lines.textContent).not.toMatch(/(^|\s)>\s/);
	expect(lines).not.toHaveTextContent(/AI-accelerated|assisté par l'IA|Con ayuda de IA/);
});

it.each(['en', 'fr', 'es'] as const)('makes the email, GitHub and LinkedIn real links in %s', (locale) => {
	render(AboutCta, { props: { cta: aboutPageContent.cta, heading: 'Get in touch' }, context: context(locale) });
	const links = within(screen.getByTestId('about-contact-lines')).getAllByRole('link');
	expect(links.map((link) => link.getAttribute('href'))).toEqual([
		'mailto:contact@yesid.dev',
		'https://github.com/mgkdante',
		'https://www.linkedin.com/in/otaloray/',
	]);
	expect(links[0]).not.toHaveAttribute('target');
	for (const link of links.slice(1)) {
		expect(link).toHaveAttribute('target', '_blank');
		expect(link).toHaveAttribute('rel', 'noopener noreferrer');
		expect(link.querySelector('.sr-only')?.textContent?.trim()).toMatch(/^\(.+\)$/);
	}
	// Short addresses, split only after a slash.
	expect(links[1].textContent).toContain('github.com/mgkdante');
	expect(links[2].textContent).toContain('linkedin.com/in/otaloray');
	expect(links[2].querySelectorAll('wbr')).toHaveLength(2);
});

it.each(['en', 'fr', 'es'] as const)('keeps old cached string lines, without the prompt, in %s', (locale) => {
	const cta = { ...aboutPageContent.cta, lines: [{ text: '> Original shared line', color: 'muted' as const }] };
	render(AboutCta, { props: { cta, heading: 'Get in touch' }, context: context(locale) });
	expect(screen.getByText('Original shared line')).toBeInTheDocument();
});

it('names the card with its heading and marks it as the kit interactive card', () => {
	render(AboutCta, { props: { cta: aboutPageContent.cta, heading: 'Get in touch' }, context: context('en') });
	expect(screen.getByRole('heading', { level: 2, name: 'Get in touch' })).toBeInTheDocument();
	expect(screen.getByTestId('about-cta')).toHaveAttribute('data-interactive', 'true');
});
