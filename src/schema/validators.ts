import type { SchemaFieldOptions } from "./types.js";

export interface ValidationFailure {
	field: string;
	message: string;
	value?: string;
}

export function validateField(
	key: string,
	value: unknown,
	options: SchemaFieldOptions,
): ValidationFailure | null {
	const { kind } = options;

	if (kind === "string" || kind === "url" || kind === "enum") {
		return validateString(key, value as string, options);
	}
	if (kind === "number" || kind === "port") {
		return validateNumber(key, value as number, options);
	}
	if (kind === "boolean") {
		return null;
	}
	if (kind === "array") {
		return validateArray(key, value as string[], options);
	}
	return null;
}

function validateString(
	key: string,
	value: string,
	options: SchemaFieldOptions,
): ValidationFailure | null {
	if (options.kind === "url") {
		try {
			new URL(value);
		} catch {
			return { field: key, message: "must be a valid URL", value };
		}
	}

	if (options.kind === "enum" && options.enumValues) {
		if (!options.enumValues.includes(value)) {
			return {
				field: key,
				message: `must be one of: ${options.enumValues.join(", ")}`,
				value,
			};
		}
	}

	if (options.minLength !== undefined && value.length < options.minLength) {
		return {
			field: key,
			message: `must be at least ${options.minLength} characters`,
			value: options.isSensitive ? "***" : value,
		};
	}

	if (options.maxLength !== undefined && value.length > options.maxLength) {
		return {
			field: key,
			message: `must be at most ${options.maxLength} characters`,
			value: options.isSensitive ? "***" : value,
		};
	}

	if (options.pattern && !options.pattern.test(value)) {
		return {
			field: key,
			message: `must match pattern ${options.pattern}`,
			value: options.isSensitive ? "***" : value,
		};
	}

	return null;
}

function validateNumber(
	key: string,
	value: number,
	options: SchemaFieldOptions,
): ValidationFailure | null {
	if (options.minValue !== undefined && value < options.minValue) {
		return {
			field: key,
			message: `must be at least ${options.minValue}`,
			value: String(value),
		};
	}
	if (options.maxValue !== undefined && value > options.maxValue) {
		return {
			field: key,
			message: `must be at most ${options.maxValue}`,
			value: String(value),
		};
	}
	return null;
}

function validateArray(
	key: string,
	value: string[],
	options: SchemaFieldOptions,
): ValidationFailure | null {
	if (options.minLength !== undefined && value.length < options.minLength) {
		return {
			field: key,
			message: `must have at least ${options.minLength} items`,
		};
	}
	if (options.maxLength !== undefined && value.length > options.maxLength) {
		return {
			field: key,
			message: `must have at most ${options.maxLength} items`,
		};
	}
	return null;
}
