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
	const { result, failures } = processSchema(schema, resolved);
	if (failures.length > 0) throw new EnvValidationError(failures);
	return result;
}

function processSchema(
	schema: SchemaDefinition,
	resolved: ResolvedValues,
): { result: Record<string, unknown>; failures: ValidationFailure[] } {
	const failures: ValidationFailure[] = [];
	const result: Record<string, unknown> = {};

	for (const [key, field] of Object.entries(schema)) {
		const opts = field._options;

		// Handle group fields
		if (opts.kind === "group" && opts.subSchema) {
			const separator = opts.groupSeparator ?? "__";
			const envPrefix = key.toUpperCase() + separator;

			// Build sub-resolved from the parent's merged map
			const subRaw: Record<string, string | undefined> = {};
			for (const subKey of Object.keys(opts.subSchema)) {
				subRaw[subKey] = resolved.merged[envPrefix + subKey];
			}
			const subResolved: ResolvedValues = { raw: subRaw, merged: resolved.merged };

			const sub = processSchema(opts.subSchema, subResolved);
			for (const f of sub.failures) {
				failures.push({ ...f, field: `${key}.${f.field}` });
			}
			if (sub.failures.length === 0) {
				result[key] = sub.result;
			}
			continue;
		}

		const raw = resolved.raw[key];

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
			const isRequired = opts.requiredIf ? opts.requiredIf(resolved.raw) : opts.isRequired;
			if (isRequired) {
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

	return { result, failures };
}

function maskValue(value: string, opts: SchemaFieldOptions): string {
	return opts.isSensitive ? "***" : value;
}
