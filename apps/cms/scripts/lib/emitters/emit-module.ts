/**
 * Top-level module-emitter: wraps the value serializer with a generated-file
 * header + imports per the per-module config in `configs.ts`.
 *
 * Output structure:
 *
 *   // <header comment>
 *   import type { ... } from '...';
 *
 *   export const <exportName>: <typeName> = <serialized data>;
 *   export const <other>: ... = ...;
 *
 * Idempotency: input data → output bytes is deterministic. Two runs on
 * unchanged CMS data produce byte-identical output.
 */

import { emitExport } from './format';

export type ExportDecl = {
	name: string;
	typeName: string;
} & (
	| { value: unknown; spread?: never }
	| { spread: readonly [string, ...string[]]; value?: never }
);

export interface ImportDecl {
	/** Symbols to import from `from`. */
	symbols: readonly string[];
	from: string;
	/** When true, emits `import type {...}` instead of `import {...}`. */
	typeOnly?: boolean;
}

export interface ModuleEmitConfig {
	/** Absolute path to the target file under apps/web/src/lib/content/. */
	filePath: string;
	/** Short description for the auto-generated header comment. */
	description: string;
	imports: readonly ImportDecl[];
	exports: readonly ExportDecl[];
}

export function emitModule(config: ModuleEmitConfig): string {
	const headerLines = [
		'// ----------------------------------------------------------------------',
		'// GENERATED FILE - do not edit by hand.',
		'//',
		`// ${config.description}`,
		'//',
		'// Source: shared fixture or live Directus CMS state via `bun run export:fallbacks`',
		'// (apps/cms/scripts/export-fallbacks.ts). Regenerated before web consumers.',
		"// Ephemeral output; commit fixture or CMS source changes instead.",
		'// ----------------------------------------------------------------------',
	];

	const importLines = config.imports.map((imp) => {
		const kw = imp.typeOnly ? 'import type' : 'import';
		const list = imp.symbols.join(', ');
		return `${kw} { ${list} } from '${imp.from}';`;
	});

	const exportLines = config.exports.map((exp) => {
		if (exp.spread === undefined) return emitExport(exp.name, exp.typeName, exp.value);
		// References come from module configuration, never CMS text. Permit only
		// identifiers so this composition cannot become an arbitrary expression.
		if (exp.spread.length === 0 || exp.spread.some((name) => !/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name))) {
			throw new Error('Invalid export spread reference');
		}
		return `export const ${exp.name}: ${exp.typeName} = { ${exp.spread.map((name) => `...${name}`).join(', ')} };`;
	});

	const blocks: string[] = [headerLines.join('\n')];
	if (importLines.length > 0) blocks.push(importLines.join('\n'));
	if (exportLines.length > 0) blocks.push(exportLines.join('\n\n'));

	// Two newlines between blocks (header -> imports -> exports).
	// Single trailing newline at EOF (POSIX convention).
	return blocks.join('\n\n') + '\n';
}
