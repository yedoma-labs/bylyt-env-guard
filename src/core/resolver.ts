import type { SchemaDefinition } from "../schema/types.js";
import type { EnvSource } from "./parser.js";
import { parseSource } from "./parser.js";

export interface ResolvedValues {
	raw: Record<string, string | undefined>;
}

export function resolveSources(schema: SchemaDefinition, sources: EnvSource[]): ResolvedValues {
	// Later sources override earlier ones
	const merged: Record<string, string> = {};
	for (const source of sources) {
		const parsed = parseSource(source);
		Object.assign(merged, parsed);
	}

	// Pick keys defined in schema; fall back to aliases if primary key is absent
	const raw: Record<string, string | undefined> = {};
	for (const [key, field] of Object.entries(schema)) {
		if (merged[key] !== undefined) {
			raw[key] = merged[key];
		} else if (field._options.aliases && field._options.aliases.length > 0) {
			const alias = field._options.aliases.find((a) => merged[a] !== undefined);
			raw[key] = alias !== undefined ? merged[alias] : undefined;
		} else {
			raw[key] = undefined;
		}
	}

	return { raw };
}
