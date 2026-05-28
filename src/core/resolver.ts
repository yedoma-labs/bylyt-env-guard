import type { SchemaDefinition } from "../schema/types.js";
import type { EnvSource } from "./parser.js";
import { parseSource } from "./parser.js";

export interface ResolvedValues {
	raw: Record<string, string | undefined>;
	merged: Record<string, string>;
}

export function resolveSources(
	schema: SchemaDefinition,
	sources: EnvSource[],
	options?: { prefix?: string; strict?: boolean },
): ResolvedValues {
	const prefix = options?.prefix ?? "";

	const merged: Record<string, string> = {};
	for (const source of sources) {
		Object.assign(merged, parseSource(source));
	}

	if (options?.strict && prefix) {
		const knownPrefixedKeys = new Set<string>();
		for (const [key, field] of Object.entries(schema)) {
			knownPrefixedKeys.add(prefix + key);
			for (const alias of field._options.aliases ?? []) {
				knownPrefixedKeys.add(prefix + alias);
			}
		}
		for (const k of Object.keys(merged)) {
			if (k.startsWith(prefix) && !knownPrefixedKeys.has(k)) {
				console.warn(`[env-guard] Unknown environment variable: "${k}"`);
			}
		}
	}

	const raw: Record<string, string | undefined> = {};
	for (const [key, field] of Object.entries(schema)) {
		const lookupKey = prefix ? prefix + key : key;
		const aliases = field._options.aliases ?? [];

		const found =
			merged[lookupKey] ??
			(aliases.length > 0
				? aliases.map((a) => merged[prefix ? prefix + a : a]).find((v) => v !== undefined)
				: undefined);

		raw[key] = found;
	}

	return { raw, merged };
}
