import { EnvValidationError } from "../errors/validation-error.js";
import type { SchemaDefinition, SchemaFieldOptions } from "../schema/types.js";
import type { ValidationFailure } from "../schema/validators.js";
import { validateField } from "../schema/validators.js";
import { CoercionError, coerce } from "../utils/coerce.js";
import type { ResolvedValues } from "./resolver.js";

function runTransformWithTimeout(
	transform: (value: unknown) => unknown,
	value: unknown,
	timeout: number,
	fieldName: string,
): unknown {
	// Note: Cannot truly abort synchronous transforms in JavaScript.
	// This measures elapsed time and warns if timeout exceeded.
	const start = Date.now();
	try {
		const result = transform(value);
		const elapsed = Date.now() - start;
		if (elapsed > timeout) {
			console.warn(
				`⚠️  [env-guard] Transform for "${fieldName}" took ${elapsed}ms (timeout: ${timeout}ms). Keep transforms fast and pure.`,
			);
		}
		return result;
	} catch (err) {
		throw new Error(`Transform failed for field "${fieldName}": ${String(err)}`);
	}
}

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

		// Handle array-of-groups fields
		if (opts.kind === "array-of-groups" && opts.subSchema) {
			const sep = opts.groupSeparator ?? "_";
			const envPrefix = key.toUpperCase() + sep;
			const items: unknown[] = [];
			const MAX_INDEX = 100;
			let index = 0;
			let consecutiveEmpty = 0;

			while (index <= MAX_INDEX) {
				const indexPrefix = envPrefix + index + sep;
				// Check if any subfield exists for this index
				const hasAnyKey = Object.keys(opts.subSchema).some(
					(sk) => resolved.merged[indexPrefix + sk] !== undefined,
				);
				if (!hasAnyKey) {
					consecutiveEmpty++;
					if (consecutiveEmpty >= 2) break; // stop after 2 consecutive missing indices
					index++;
					continue;
				}
				consecutiveEmpty = 0;

				const subRaw: Record<string, string | undefined> = {};
				for (const sk of Object.keys(opts.subSchema)) {
					subRaw[sk] = resolved.merged[indexPrefix + sk];
				}
				const subResolved: ResolvedValues = { raw: subRaw, merged: resolved.merged };
				const sub = processSchema(opts.subSchema, subResolved);
				for (const f of sub.failures) {
					failures.push({ ...f, field: `${key}[${index}].${f.field}` });
				}
				if (sub.failures.length === 0) {
					items.push(sub.result);
				}
				index++;
			}

			result[key] = items;
			continue;
		}

		// Handle record fields
		if (opts.kind === "record") {
			if (opts.recordPrefix === undefined && opts.recordPattern === undefined) {
				console.warn(
					`[env-guard] record field "${key}" has no prefix or pattern — returning empty object`,
				);
				result[key] = {};
				continue;
			}
			const captured: Record<string, string> = {};
			for (const [k, v] of Object.entries(resolved.merged)) {
				if (opts.recordPrefix !== undefined) {
					if (k.startsWith(opts.recordPrefix)) {
						captured[k.slice(opts.recordPrefix.length)] = v;
					}
				} else if (opts.recordPattern?.test(k)) {
					captured[k] = v;
				}
			}
			result[key] = captured;
			continue;
		}

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
			result[key] = sub.failures.length === 0 ? sub.result : undefined;
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
			try {
				coerced = runTransformWithTimeout(
					opts.transform,
					coerced,
					opts.transformTimeout ?? 5000,
					key,
				);
			} catch (err) {
				failures.push({
					field: key,
					message: String(err),
					code: "TRANSFORM_ERROR",
				});
				continue;
			}
		}

		result[key] = coerced;
	}

	return { result, failures };
}

function maskValue(value: string, opts: SchemaFieldOptions): string {
	return opts.isSensitive ? "***" : value;
}
