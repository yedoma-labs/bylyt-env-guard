import type { InferEnv, SchemaDefinition } from "./schema/types.js";
import type { EnvSource } from "./core/parser.js";
import { resolveSources } from "./core/resolver.js";
import { validateAndCoerce } from "./core/validator.js";

export { eg } from "./schema/builder.js";
export { EnvValidationError } from "./errors/validation-error.js";
export type { SchemaField, SchemaDefinition, InferEnv } from "./schema/types.js";
export type { ValidationFailure } from "./schema/validators.js";

export interface CreateEnvOptions<T extends SchemaDefinition> {
	schema: T;
	sources?: EnvSource[];
}

export function createEnv<T extends SchemaDefinition>(
	options: CreateEnvOptions<T>,
): InferEnv<T> {
	const sources = options.sources ?? [process.env];
	const resolved = resolveSources(options.schema, sources);
	const result = validateAndCoerce(options.schema, resolved);
	return result as InferEnv<T>;
}
