import type { AboutCta, Locale, LocalizedString } from '#lib/types.ts';
import { resolveLocale } from '#lib/utils/locale.ts';

/**
 * Headings are stored in capitals in the CMS ("FUN FACTS", "CURIOSITY"). Shows an all-capitals
 * value in sentence case; a value already in mixed case is kept as written.
 */
export function sentenceCase(value: string, locale: Locale): string {
	// Only a value with a whole word in capitals and no lower-case letter ("3×5K" stays as written).
	if (value !== value.toLocaleUpperCase(locale) || !/\p{Lu}{2,}/u.test(value)) return value;
	const lower = value.toLocaleLowerCase(locale);
	return lower.charAt(0).toLocaleUpperCase(locale) + lower.slice(1);
}

/** Terminal lines the owner removed (filler, with "AI" as a selling word), matched on their English text. */
const RETIRED_CTA_LINES = new Set(['ai-accelerated, human-owned']);

export type AboutContactLine =
	| { kind: 'text'; text: string }
	| { kind: 'link'; label: string; href: string; display: string[]; external: boolean };

type CtaLine = AboutCta['lines'][number];

const stripPrompt = (text: string) => text.replace(/^\s*>\s*/, '').trim();

function lineText(line: CtaLine, locale: Locale): string {
	return typeof line.text === 'string' ? line.text : resolveLocale(line.text, locale);
}

function englishText(line: CtaLine): string {
	return stripPrompt(typeof line.text === 'string' ? line.text : (line.text.en ?? '')).toLowerCase();
}

/**
 * The closing card's lines without the console costume: no "> " prompts, the retired filler
 * dropped, and an email or web address after its label made a real link. A web address shows
 * short ("github.com/mgkdante"), split after each slash so it never breaks inside a word.
 */
export function contactLines(lines: AboutCta['lines'], locale: Locale): AboutContactLine[] {
	return lines
		.filter((line) => !RETIRED_CTA_LINES.has(englishText(line)))
		.map((line): AboutContactLine => {
			const text = stripPrompt(lineText(line, locale));
			const match = /^(.*?:)\s*(\S+@\S+\.\S+|https?:\/\/\S+)$/u.exec(text);
			if (!match) return { kind: 'text', text };
			const [, label, target] = match;
			if (!/^https?:\/\//u.test(target)) {
				return { kind: 'link', label: label.trim(), href: `mailto:${target}`, display: [target], external: false };
			}
			const short = target.replace(/^https?:\/\/(www\.)?/u, '').replace(/\/+$/u, '');
			const parts = short.split('/');
			return {
				kind: 'link',
				label: label.trim(),
				href: target,
				display: parts.map((part, i) => (i < parts.length - 1 ? `${part}/` : part)),
				external: true,
			};
		});
}
