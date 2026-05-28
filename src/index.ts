import type { EnvSource } from "./core/parser.js";
import { resolveSources } from "./core/resolver.js";
import { validateAndCoerce } from "./core/validator.js";
import type { InferEnv, SchemaDefinition } from "./schema/types.js";

export type { WatchCallback, WatchHandle, WatchOptions } from "./core/watcher.js";
export { watchEnv } from "./core/watcher.js";
export { EnvValidationError } from "./errors/validation-error.js";
export { eg } from "./schema/builder.js";
export type { ArrayItemKind, InferEnv, SchemaDefinition, SchemaField } from "./schema/types.js";
export type { ValidationFailure } from "./schema/validators.js";
export type { GenerateMarkdownDocsOptions } from "./utils/generate-docs.js";
export { generateMarkdownDocs } from "./utils/generate-docs.js";
export { generateEnvExample } from "./utils/generate-example.js";

export interface CreateEnvOptions<T extends SchemaDefinition> {
	schema: T;
	sources?: EnvSource[];
	prefix?: string;
	strict?: boolean;
	profiles?: Record<string, Record<string, string>>;
	activeProfile?: string;
}

function deepFreeze<T>(obj: T, seen = new WeakSet()): T {
	if (obj === null || typeof obj !== "object") return obj;
	if (seen.has(obj as object)) return obj;
	seen.add(obj as object);
	Object.freeze(obj);
	for (const value of Object.values(obj as object)) {
		deepFreeze(value, seen);
	}
	return obj;
}

export function createEnv<T extends SchemaDefinition>(options: CreateEnvOptions<T>): InferEnv<T> {
	const { schema, prefix, strict, profiles, activeProfile } = options;

	// Apply profile as lowest-priority source
	const profileName = activeProfile ?? process.env.NODE_ENV;
	const profileSource = profileName && profiles?.[profileName] ? profiles[profileName] : {};
	const sources = [profileSource, ...(options.sources ?? [process.env])];

	const resolved = resolveSources(schema, sources, { prefix, strict });
	const result = validateAndCoerce(schema, resolved);
	return deepFreeze(result) as InferEnv<T>;
}
