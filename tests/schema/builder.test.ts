import { describe, expect, it } from "vitest";
import { eg } from "../../src";

describe("schema builder", () => {
	it("creates string field with defaults", () => {
		const field = eg.string();
		expect(field._options.kind).toBe("string");
		expect(field._options.isRequired).toBe(true);
		expect(field._options.isSensitive).toBe(false);
	});

	it("chains required/optional/sensitive", () => {
		const field = eg.string().optional().sensitive();
		expect(field._options.isRequired).toBe(false);
		expect(field._options.isSensitive).toBe(true);
	});

	it("sets default and marks optional", () => {
		const field = eg.string().default("hello");
		expect(field._options.defaultValue).toBe("hello");
		expect(field._options.isRequired).toBe(false);
	});

	it("creates number with min/max", () => {
		const field = eg.number().min(0).max(100);
		expect(field._options.kind).toBe("number");
		expect(field._options.minValue).toBe(0);
		expect(field._options.maxValue).toBe(100);
	});

	it("creates boolean field", () => {
		const field = eg.boolean();
		expect(field._options.kind).toBe("boolean");
	});

	it("creates enum with values", () => {
		const field = eg.enum(["a", "b", "c"] as const);
		expect(field._options.kind).toBe("enum");
		expect(field._options.enumValues).toEqual(["a", "b", "c"]);
	});

	it("creates url field", () => {
		expect(eg.url()._options.kind).toBe("url");
	});

	it("creates port field with range", () => {
		const field = eg.port();
		expect(field._options.kind).toBe("port");
		expect(field._options.minValue).toBe(1);
		expect(field._options.maxValue).toBe(65535);
	});

	it("creates array field with custom separator", () => {
		const field = eg.array().separator("|");
		expect(field._options.kind).toBe("array");
		expect(field._options.separator).toBe("|");
	});

	it("string with minLength/maxLength/pattern", () => {
		const field = eg
			.string()
			.minLength(3)
			.maxLength(10)
			.pattern(/^[a-z]+$/);
		expect(field._options.minLength).toBe(3);
		expect(field._options.maxLength).toBe(10);
		expect(field._options.pattern).toEqual(/^[a-z]+$/);
	});
});
