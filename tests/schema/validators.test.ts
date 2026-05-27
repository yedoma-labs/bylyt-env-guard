import { describe, expect, it } from "vitest";
import type { SchemaFieldOptions } from "../../src/schema/types.js";
import { validateField } from "../../src/schema/validators.js";

const base: SchemaFieldOptions = { kind: "string", isRequired: true, isSensitive: false };

describe("validators", () => {
	it("passes valid string", () => {
		expect(validateField("X", "hello", base)).toBeNull();
	});

	it("fails minLength", () => {
		const result = validateField("X", "ab", { ...base, minLength: 3 });
		expect(result).not.toBeNull();
		expect(result?.message).toContain("at least 3");
	});

	it("fails maxLength", () => {
		const result = validateField("X", "abcdef", { ...base, maxLength: 3 });
		expect(result).not.toBeNull();
	});

	it("fails pattern", () => {
		const result = validateField("X", "123", { ...base, pattern: /^[a-z]+$/ });
		expect(result).not.toBeNull();
		expect(result?.message).toContain("pattern");
	});

	it("validates url", () => {
		expect(validateField("X", "https://example.com", { ...base, kind: "url" })).toBeNull();
		expect(validateField("X", "not-a-url", { ...base, kind: "url" })).not.toBeNull();
	});

	it("validates enum", () => {
		const opts: SchemaFieldOptions = { ...base, kind: "enum", enumValues: ["a", "b"] };
		expect(validateField("X", "a", opts)).toBeNull();
		expect(validateField("X", "c", opts)).not.toBeNull();
	});

	it("validates number min/max", () => {
		const opts: SchemaFieldOptions = { ...base, kind: "number", minValue: 0, maxValue: 10 };
		expect(validateField("X", 5, opts)).toBeNull();
		expect(validateField("X", -1, opts)).not.toBeNull();
		expect(validateField("X", 11, opts)).not.toBeNull();
	});

	it("validates port range", () => {
		const opts: SchemaFieldOptions = { ...base, kind: "port", minValue: 1, maxValue: 65535 };
		expect(validateField("X", 0, opts)).not.toBeNull();
		expect(validateField("X", 70000, opts)).not.toBeNull();
		expect(validateField("X", 8080, opts)).toBeNull();
	});

	it("passes boolean", () => {
		expect(validateField("X", true, { ...base, kind: "boolean" })).toBeNull();
	});

	it("validates array min/max items", () => {
		const opts: SchemaFieldOptions = { ...base, kind: "array", minLength: 2, maxLength: 4 };
		expect(validateField("X", ["a", "b", "c"], opts)).toBeNull();
		expect(validateField("X", ["a"], opts)).not.toBeNull();
		expect(validateField("X", ["a"], opts)?.message).toContain("at least 2");
		expect(validateField("X", ["a", "b", "c", "d", "e"], opts)).not.toBeNull();
		expect(validateField("X", ["a", "b", "c", "d", "e"], opts)?.message).toContain("at most 4");
	});

	it("masks sensitive values", () => {
		const result = validateField("X", "ab", { ...base, isSensitive: true, minLength: 5 });
		expect(result?.value).toBe("***");
	});
});

describe("new validators", () => {
	it("validates email - valid", () => {
		const result = validateField("X", "user@example.com", { ...base, kind: "email" });
		expect(result).toBeNull();
	});

	it("validates email - invalid", () => {
		const result = validateField("X", "not-an-email", { ...base, kind: "email" });
		expect(result).not.toBeNull();
		expect(result?.code).toBe("INVALID_EMAIL");
	});

	it("validates url with allowed protocols - valid", () => {
		const opts: SchemaFieldOptions = { ...base, kind: "url", allowedProtocols: ["https"] };
		const result = validateField("X", "https://x.com", opts);
		expect(result).toBeNull();
	});

	it("validates url with allowed protocols - invalid", () => {
		const opts: SchemaFieldOptions = { ...base, kind: "url", allowedProtocols: ["https"] };
		const result = validateField("X", "http://x.com", opts);
		expect(result).not.toBeNull();
		expect(result?.code).toBe("INVALID_PROTOCOL");
	});

	it("validates enum case-insensitive - match", () => {
		const opts: SchemaFieldOptions = {
			...base,
			kind: "enum",
			enumValues: ["prod", "dev"],
			caseInsensitive: true,
		};
		const result = validateField("X", "PROD", opts);
		expect(result).toBeNull();
	});

	it("validates enum case-insensitive - fail", () => {
		const opts: SchemaFieldOptions = {
			...base,
			kind: "enum",
			enumValues: ["prod", "dev"],
			caseInsensitive: true,
		};
		const result = validateField("X", "staging", opts);
		expect(result).not.toBeNull();
		expect(result?.code).toBe("INVALID_ENUM");
	});

	it("custom validator - pass", () => {
		const opts: SchemaFieldOptions = { ...base, customValidator: () => null };
		const result = validateField("X", "hello", opts);
		expect(result).toBeNull();
	});

	it("custom validator - fail", () => {
		const opts: SchemaFieldOptions = { ...base, customValidator: () => "bad value" };
		const result = validateField("X", "hello", opts);
		expect(result).not.toBeNull();
		expect(result?.message).toBe("bad value");
		expect(result?.code).toBe("CUSTOM");
	});

	it("validates date - valid", () => {
		const opts: SchemaFieldOptions = { ...base, kind: "date" };
		const result = validateField("X", new Date("2024-01-15"), opts);
		expect(result).toBeNull();
	});

	it("validates integer min value", () => {
		const opts: SchemaFieldOptions = { ...base, kind: "integer", minValue: 10 };
		const result = validateField("X", 5, opts);
		expect(result).not.toBeNull();
		expect(result?.code).toBe("MIN_VALUE");
	});

	it("validates integer max value", () => {
		const opts: SchemaFieldOptions = { ...base, kind: "integer", maxValue: 10 };
		const result = validateField("X", 15, opts);
		expect(result).not.toBeNull();
		expect(result?.code).toBe("MAX_VALUE");
	});

	it("has correct error codes for minLength", () => {
		const result = validateField("X", "ab", { ...base, minLength: 5 });
		expect(result?.code).toBe("MIN_LENGTH");
	});

	it("has correct error codes for maxLength", () => {
		const result = validateField("X", "abcdef", { ...base, maxLength: 3 });
		expect(result?.code).toBe("MAX_LENGTH");
	});

	it("has correct error codes for pattern", () => {
		const result = validateField("X", "123", { ...base, pattern: /^[a-z]+$/ });
		expect(result?.code).toBe("PATTERN");
	});

	it("has correct error codes for invalid url", () => {
		const result = validateField("X", "not-a-url", { ...base, kind: "url" });
		expect(result?.code).toBe("INVALID_URL");
	});

	it("has correct error codes for invalid enum", () => {
		const opts: SchemaFieldOptions = { ...base, kind: "enum", enumValues: ["a", "b"] };
		const result = validateField("X", "c", opts);
		expect(result?.code).toBe("INVALID_ENUM");
	});
});
