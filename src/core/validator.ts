import { EnvValidationError } from "../errors/validation-error.js";
import type { SchemaDefinition, SchemaFieldOptions } from "../schema/types.js";
import type { ValidationFailure } from "../schema/validators.js";
import { validateField } from "../schema/validators.js";
import { CoercionError, coerce } from "../utils/coerce.js";
import type { ResolvedValues } from "./resolver.js";

export function validateAndCoerce(
	schema: SchemaDefinition,
	resolved: ResolvedValues,
): Record<string, unknown> {
	const failures: ValidationFailure[] = [];
	const result: Record<string, unknown> = {};

	for (const [key, field] of Object.entries(schema)) {
		const raw = resolved.raw[key];
		const opts = field._options;

		// Handle missing values
		if (raw === undefined) {
			if (opts.defaultFactory !== undefined) {
				result[key] = opts.defaultFactory();
				continue;
			}
			if (opts.defaultValue !== undefined) {
				result[key] = opts.defaultValue;
				continue;
			}
			if (opts.isRequired) {
				failures.push({ field: key, message: "is required but missing", code: "MISSING" });
				continue;
			}
			result[key] = undefined;
			continue;
		}

		// Warn about deprecated fields
		if (opts.deprecated) {
			console.warn(`[env-guard] Warning: "${key}" is deprecated. ${opts.deprecated}`);
		}

		// Coerce
		let coerced: unknown;
		try {
			coerced = coerce(raw, opts.kind, opts.separator, opts.arrayItemKind);
		} catch (err) {
			if (err instanceof CoercionError) {
				failures.push({
					field: key,
					message: err.message,
					value: maskValue(raw, opts),
					code: "INVALID_TYPE",
				});
				continue;
			}
			throw err;
		}

		// Validate
		const failure = validateField(key, coerced, opts);
		if (failure) {
			failures.push(failure);
			continue;
		}

		// Apply transform
		if (opts.transform) {
			coerced = opts.transform(coerced);
		}

		result[key] = coerced;
	}

	if (failures.length > 0) {
		throw new EnvValidationError(failures);
	}

	return result;
}

function maskValue(value: string, opts: SchemaFieldOptions): string {
	return opts.isSensitive ? "***" : value;
}
