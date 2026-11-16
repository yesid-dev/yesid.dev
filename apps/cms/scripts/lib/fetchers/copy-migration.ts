import values from '../../../fixtures/content/copy-migration.json';
import type { LocalizedString } from '@repo/shared';

/** Value of one CMS column on a translation row, without widening the row types. */
function columnValue(row: object, field: string): unknown {
	return Reflect.get(row, field);
}

/** Preserve the approved fixture copy per locale while new production columns are empty. */
export function migrationCopy<C extends keyof typeof values, Row extends { languages_code: string }>(
	rows: ReadonlyArray<Row>,
	collection: C,
	field: keyof (typeof values)[C],
): LocalizedString {
	const fallback = values[collection][field] as LocalizedString;
	const result = { ...fallback };
	for (const locale of ['en', 'fr', 'es'] as const) {
		const row = rows.find((candidate) => candidate.languages_code === locale);
		const value = row ? columnValue(row, String(field)) : undefined;
		if (typeof value === 'string' && value.trim()) result[locale] = value;
	}
	return result;
}

/**
 * The row-scoped sibling of migrationCopy: copy that belongs to one CMS row (a
 * project's card line, one section's summary) falls back to its own approved
 * words instead of a collection-wide value. Nonblank CMS cells still win.
 */
export function migrationCopyFor<Row extends { languages_code: string }>(
	rows: ReadonlyArray<Row>,
	field: string,
	fallback: LocalizedString,
): LocalizedString {
	const result = { ...fallback };
	for (const locale of ['en', 'fr', 'es'] as const) {
		const row = rows.find((candidate) => candidate.languages_code === locale);
		const value = row ? columnValue(row, field) : undefined;
		if (typeof value === 'string' && value.trim()) result[locale] = value;
	}
	return result;
}

/**
 * Replace the exact legacy value a pre-DEV-28 frontend override used to win
 * with. Anything else a CMS author writes wins untouched, per locale.
 */
export function migrateLegacyExact(
	value: LocalizedString,
	legacy: LocalizedString,
	target: LocalizedString,
): LocalizedString {
	const result = { ...value };
	for (const locale of ['en', 'fr', 'es'] as const) {
		if (value[locale] !== undefined && value[locale] === legacy[locale] && target[locale]) {
			result[locale] = target[locale];
		}
	}
	return result;
}
