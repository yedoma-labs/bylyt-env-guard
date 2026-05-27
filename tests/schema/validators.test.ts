import { describe, it, expect } from "vitest";
import { validateField } from "../../src/schema/validators.js";
import type { SchemaFieldOptions } from "../../src/schema/types.js";

const base: SchemaFieldOptions = { kind: "string", isRequired: true, isSensitive: false };

describe("validators", () => {
	it("passes valid string", () => {
		expect(validateField("X", "hello", base)).toBeNull();
	});

	it("fails minLength", () => {
		const result = validateField("X", "ab", { ...base, minLength: 3 });
		expect(result).not.toBeNull();
		expect(result!.message).toContain("at least 3");
	});

	it("fails maxLength", () => {
		const result = validateField("X", "abcdef", { ...base, maxLength: 3 });
		expect(result).not.toBeNull();
	});

	it("fails pattern", () => {
		const result = validateField("X", "123", { ...base, pattern: /^[a-z]+$/ });
		expect(result).not.toBeNull();
		expect(result!.message).toContain("pattern");
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

	it("masks sensitive values", () => {
		const result = validateField("X", "ab", { ...base, isSensitive: true, minLength: 5 });
		expect(result!.value).toBe("***");
	});
});
