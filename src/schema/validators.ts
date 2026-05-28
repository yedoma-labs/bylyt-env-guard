import type { SchemaFieldOptions } from "./types.js";

export interface ValidationFailure {
	field: string;
	message: string;
	value?: string;
	code?: string;
}

export function validateField(
	key: string,
	value: unknown,
	options: SchemaFieldOptions,
): ValidationFailure | null {
	const { kind } = options;

	if (kind === "string" || kind === "email") {
		return validateString(key, value as string, options);
	}
	if (kind === "url") {
		return validateUrl(key, value as string, options);
	}
	if (kind === "enum") {
		return validateEnum(key, value as string, options);
	}
	if (kind === "number" || kind === "port" || kind === "integer") {
		return validateNumber(key, value as number, options);
	}
	if (kind === "boolean") {
		return runCustomValidator(key, value, options);
	}
	if (kind === "array") {
		return validateArray(key, value as unknown[], options);
	}
	if (kind === "json") {
		return runCustomValidator(key, value, options);
	}
	if (kind === "date") {
		return validateDate(key, value as Date, options);
	}
	if (kind === "group") {
		return null;
	}
	if (kind === "array-of-groups") {
		return null;
	}
	if (kind === "record") {
		return null;
	}
	return null;
}

function maskVal(value: string | undefined, sensitive: boolean): string | undefined {
	if (value === undefined) return undefined;
	return sensitive ? "***" : value;
}

function runCustomValidator(
	key: string,
	value: unknown,
	options: SchemaFieldOptions,
): ValidationFailure | null {
	if (options.customValidator) {
		const msg = options.customValidator(value);
		if (msg !== null) {
			return {
				field: key,
				message: msg,
				value: maskVal(String(value), options.isSensitive),
				code: "CUSTOM",
			};
		}
	}
	return null;
}

function validateString(
	key: string,
	value: string,
	options: SchemaFieldOptions,
): ValidationFailure | null {
	if (options.kind === "email") {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(value)) {
			return {
				field: key,
				message: "must be a valid email address",
				value: maskVal(value, options.isSensitive),
				code: "INVALID_EMAIL",
			};
		}
	}

	if (options.minLength !== undefined && value.length < options.minLength) {
		return {
			field: key,
			message: `must be at least ${options.minLength} characters`,
			value: maskVal(value, options.isSensitive),
			code: "MIN_LENGTH",
		};
	}

	if (options.maxLength !== undefined && value.length > options.maxLength) {
		return {
			field: key,
			message: `must be at most ${options.maxLength} characters`,
			value: maskVal(value, options.isSensitive),
			code: "MAX_LENGTH",
		};
	}

	if (options.pattern && !options.pattern.test(value)) {
		return {
			field: key,
			message: `must match pattern ${options.pattern}`,
			value: maskVal(value, options.isSensitive),
			code: "PATTERN",
		};
	}

	return runCustomValidator(key, value, options);
}

function validateUrl(
	key: string,
	value: string,
	options: SchemaFieldOptions,
): ValidationFailure | null {
	let parsed: URL;
	try {
		parsed = new URL(value);
	} catch {
		return {
			field: key,
			message: "must be a valid URL",
			value: maskVal(value, options.isSensitive),
			code: "INVALID_URL",
		};
	}

	if (options.allowedProtocols && options.allowedProtocols.length > 0) {
		const proto = parsed.protocol.replace(/:$/, "");
		if (!options.allowedProtocols.includes(proto)) {
			return {
				field: key,
				message: `must use one of these protocols: ${options.allowedProtocols.join(", ")}`,
				value: maskVal(value, options.isSensitive),
				code: "INVALID_PROTOCOL",
			};
		}
	}

	return runCustomValidator(key, value, options);
}

function validateEnum(
	key: string,
	value: string,
	options: SchemaFieldOptions,
): ValidationFailure | null {
	if (options.enumValues) {
		const compare = options.caseInsensitive ? value.toLowerCase() : value;
		const match = options.enumValues.some((v) =>
			options.caseInsensitive ? v.toLowerCase() === compare : v === compare,
		);
		if (!match) {
			return {
				field: key,
				message: `must be one of: ${options.enumValues.join(", ")}`,
				value: maskVal(value, options.isSensitive),
				code: "INVALID_ENUM",
			};
		}
	}

	return runCustomValidator(key, value, options);
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
			value: maskVal(String(value), options.isSensitive),
			code: "MIN_VALUE",
		};
	}
	if (options.maxValue !== undefined && value > options.maxValue) {
		return {
			field: key,
			message: `must be at most ${options.maxValue}`,
			value: maskVal(String(value), options.isSensitive),
			code: "MAX_VALUE",
		};
	}
	return runCustomValidator(key, value, options);
}

function validateDate(
	key: string,
	value: Date,
	options: SchemaFieldOptions,
): ValidationFailure | null {
	if (Number.isNaN(value.getTime())) {
		return {
			field: key,
			message: "must be a valid date",
			value: maskVal(String(value), options.isSensitive),
			code: "INVALID_DATE",
		};
	}
	return runCustomValidator(key, value, options);
}

function validateArray(
	key: string,
	value: unknown[],
	options: SchemaFieldOptions,
): ValidationFailure | null {
	if (options.minLength !== undefined && value.length < options.minLength) {
		return {
			field: key,
			message: `must have at least ${options.minLength} items`,
			code: "MIN_LENGTH",
		};
	}
	if (options.maxLength !== undefined && value.length > options.maxLength) {
		return {
			field: key,
			message: `must have at most ${options.maxLength} items`,
			code: "MAX_LENGTH",
		};
	}
	return runCustomValidator(key, value, options);
}
