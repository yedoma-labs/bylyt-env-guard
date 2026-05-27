import type { SchemaDefinition } from "../schema/types.js";
import type { EnvSource } from "./parser.js";
import { parseSource } from "./parser.js";

export interface ResolvedValues {
	raw: Record<string, string | undefined>;
}

export function resolveSources(
	schema: SchemaDefinition,
	sources: EnvSource[],
): ResolvedValues {
	// Later sources override earlier ones
	const merged: Record<string, string> = {};
	for (const source of sources) {
		const parsed = parseSource(source);
		Object.assign(merged, parsed);
	}

	// Only pick keys defined in schema
	const raw: Record<string, string | undefined> = {};
	for (const key of Object.keys(schema)) {
		raw[key] = merged[key];
	}

	return { raw };
}
