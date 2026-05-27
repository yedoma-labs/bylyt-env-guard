import { describe, it, expect } from "vitest";
import { validateAndCoerce } from "../../src/core/validator.js";
import { eg } from "../../src/schema/builder.js";
import { EnvValidationError } from "../../src/errors/validation-error.js";

describe("validateAndCoerce", () => {
	it("coerces and returns valid values", () => {
		const schema = {
			PORT: eg.number(),
			DEBUG: eg.boolean(),
		};
		const result = validateAndCoerce(schema, { raw: { PORT: "3000", DEBUG: "true" } });
		expect(result).toEqual({ PORT: 3000, DEBUG: true });
	});

	it("applies defaults for missing values", () => {
		const schema = { PORT: eg.number().default(3000) };
		const result = validateAndCoerce(schema, { raw: { PORT: undefined } });
		expect(result).toEqual({ PORT: 3000 });
	});

	it("throws for missing required values", () => {
		const schema = { SECRET: eg.string().required() };
		expect(() => validateAndCoerce(schema, { raw: { SECRET: undefined } }))
			.toThrow(EnvValidationError);
	});

	it("allows undefined for optional values", () => {
		const schema = { OPT: eg.string().optional() };
		const result = validateAndCoerce(schema, { raw: { OPT: undefined } });
		expect(result).toEqual({ OPT: undefined });
	});

	it("collects all failures at once", () => {
		const schema = {
			A: eg.string().required(),
			B: eg.number().required(),
		};
		try {
			validateAndCoerce(schema, { raw: { A: undefined, B: undefined } });
			expect.unreachable();
		} catch (err) {
			expect(err).toBeInstanceOf(EnvValidationError);
			expect((err as EnvValidationError).failures).toHaveLength(2);
		}
	});

	it("masks sensitive values in errors", () => {
		const schema = { KEY: eg.string().sensitive().minLength(20) };
		try {
			validateAndCoerce(schema, { raw: { KEY: "short" } });
			expect.unreachable();
		} catch (err) {
			const failure = (err as EnvValidationError).failures[0]!;
			expect(failure.value).toBe("***");
		}
	});
});
