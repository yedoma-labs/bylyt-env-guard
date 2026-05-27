import { describe, expect, it } from "vitest";
import { EnvValidationError, eg } from "../../src";
import { validateAndCoerce } from "../../src/core/validator.js";

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
		expect(() => validateAndCoerce(schema, { raw: { SECRET: undefined } })).toThrow(
			EnvValidationError,
		);
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

	it("collects coercion errors as failures", () => {
		const schema = { PORT: eg.number().required() };
		try {
			validateAndCoerce(schema, { raw: { PORT: "not-a-number" } });
			expect.unreachable();
		} catch (err) {
			expect(err).toBeInstanceOf(EnvValidationError);
			const failure = (err as EnvValidationError).failures[0];
			if (!failure) throw new Error("No failure");
			expect(failure.field).toBe("PORT");
			expect(failure.value).toBe("not-a-number");
		}
	});

	it("masks sensitive coercion errors", () => {
		const schema = { TOKEN: eg.number().required().sensitive() };
		try {
			validateAndCoerce(schema, { raw: { TOKEN: "secret" } });
			expect.unreachable();
		} catch (err) {
			const failure = (err as EnvValidationError).failures[0];
			if (!failure) throw new Error("No failure");
			expect(failure.value).toBe("***");
		}
	});

	it("masks sensitive values in errors", () => {
		const schema = { KEY: eg.string().sensitive().minLength(20) };
		try {
			validateAndCoerce(schema, { raw: { KEY: "short" } });
			expect.unreachable();
		} catch (err) {
			const failure = (err as EnvValidationError).failures[0];
			if (!failure) throw new Error("No failure");
			expect(failure.value).toBe("***");
		}
	});
});
