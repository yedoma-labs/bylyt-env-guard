import { describe, expect, it } from "vitest";
import { eg } from "../../src";

describe("FieldBuilder ReDoS protection", () => {
	it("rejects nested quantifier patterns", () => {
		expect(() => {
			eg.string().pattern(/(a+)+b/);
		}).toThrow(/Unsafe regex pattern.*Nested quantifiers/);
	});

	it("rejects alternation with quantifiers", () => {
		expect(() => {
			eg.string().pattern(/(a|ab)+/);
		}).toThrow(/Unsafe regex pattern.*Alternation with quantifiers/);
	});

	it("rejects exponential patterns", () => {
		expect(() => {
			eg.string().pattern(/(.+)+b/);
		}).toThrow(/Unsafe regex pattern.*Nested quantifiers/);
	});

	// Note: Can't test invalid regex syntax like /a**b/ as JS engine rejects it before we can check

	it("accepts safe patterns", () => {
		expect(() => {
			eg.string().pattern(/^[a-z0-9]+$/);
		}).not.toThrow();

		expect(() => {
			eg.string().pattern(/^\d{1,5}$/);
		}).not.toThrow();

		expect(() => {
			eg.string().pattern(/^[A-Z_][A-Z0-9_]*$/);
		}).not.toThrow();
	});

	it("provides helpful error message with OWASP link", () => {
		expect(() => {
			eg.string().pattern(/(a+)+/);
		}).toThrow(/owasp.org/);
	});
});
