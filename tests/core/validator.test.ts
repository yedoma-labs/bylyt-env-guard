import { beforeEach, describe, expect, it, vi } from "vitest";
import { EnvValidationError, eg } from "../../src";
import { validateAndCoerce } from "../../src/core/validator.js";

describe("validateAndCoerce", () => {
	it("coerces and returns valid values", () => {
		const schema = {
			PORT: eg.number(),
			DEBUG: eg.boolean(),
		};
		const result = validateAndCoerce(schema, {
			raw: { PORT: "3000", DEBUG: "true" },
			merged: {},
		});
		expect(result).toEqual({ PORT: 3000, DEBUG: true });
	});

	it("applies defaults for missing values", () => {
		const schema = { PORT: eg.number().default(3000) };
		const result = validateAndCoerce(schema, { raw: { PORT: undefined }, merged: {} });
		expect(result).toEqual({ PORT: 3000 });
	});

	it("throws for missing required values", () => {
		const schema = { SECRET: eg.string().required() };
		expect(() => validateAndCoerce(schema, { raw: { SECRET: undefined }, merged: {} })).toThrow(
			EnvValidationError,
		);
	});

	it("allows undefined for optional values", () => {
		const schema = { OPT: eg.string().optional() };
		const result = validateAndCoerce(schema, { raw: { OPT: undefined }, merged: {} });
		expect(result).toEqual({ OPT: undefined });
	});

	it("collects all failures at once", () => {
		const schema = {
			A: eg.string().required(),
			B: eg.number().required(),
		};
		try {
			validateAndCoerce(schema, { raw: { A: undefined, B: undefined }, merged: {} });
			expect.unreachable();
		} catch (err) {
			expect(err).toBeInstanceOf(EnvValidationError);
			expect((err as EnvValidationError).failures).toHaveLength(2);
		}
	});

	it("collects coercion errors as failures", () => {
		const schema = { PORT: eg.number().required() };
		try {
			validateAndCoerce(schema, { raw: { PORT: "not-a-number" }, merged: {} });
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
			validateAndCoerce(schema, { raw: { TOKEN: "secret" }, merged: {} });
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
			validateAndCoerce(schema, { raw: { KEY: "short" }, merged: {} });
			expect.unreachable();
		} catch (err) {
			const failure = (err as EnvValidationError).failures[0];
			if (!failure) throw new Error("No failure");
			expect(failure.value).toBe("***");
		}
	});
});

describe("new features", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it("uses defaultFactory when value is undefined", () => {
		const schema = { PORT: eg.number().default(() => 9000) };
		const result = validateAndCoerce(schema, { raw: { PORT: undefined }, merged: {} });
		expect(result.PORT).toBe(9000);
	});

	it("applies transform function", () => {
		const schema = { NAME: eg.string().transform((v) => v.toUpperCase()) };
		const result = validateAndCoerce(schema, { raw: { NAME: "hello" }, merged: {} });
		expect(result.NAME).toBe("HELLO");
	});

	it("warns when deprecated field is provided", () => {
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
		const schema = { OLD_VAR: eg.string().deprecated("use NEW_VAR") };
		validateAndCoerce(schema, { raw: { OLD_VAR: "value" }, merged: {} });
		expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('"OLD_VAR" is deprecated'));
		expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("use NEW_VAR"));
	});

	it("does not warn when deprecated field is missing", () => {
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
		const schema = { OLD_VAR: eg.string().deprecated("use NEW_VAR").optional() };
		validateAndCoerce(schema, { raw: { OLD_VAR: undefined }, merged: {} });
		expect(warnSpy).not.toHaveBeenCalled();
	});

	it("validates with custom validator - pass", () => {
		const schema = {
			VAL: eg
				.string()
				.validate((v) => (v.startsWith("prefix-") ? null : "must start with prefix-")),
		};
		const result = validateAndCoerce(schema, { raw: { VAL: "prefix-test" }, merged: {} });
		expect(result.VAL).toBe("prefix-test");
	});

	it("validates with custom validator - fail", () => {
		const schema = {
			VAL: eg
				.string()
				.validate((v) => (v.startsWith("prefix-") ? null : "must start with prefix-")),
		};
		try {
			validateAndCoerce(schema, { raw: { VAL: "test" }, merged: {} });
			expect.unreachable();
		} catch (err) {
			const failure = (err as EnvValidationError).failures[0];
			if (!failure) throw new Error("No failure");
			expect(failure.code).toBe("CUSTOM");
			expect(failure.message).toBe("must start with prefix-");
		}
	});

	it("coerces integer type", () => {
		const schema = { COUNT: eg.integer() };
		const result = validateAndCoerce(schema, { raw: { COUNT: "42" }, merged: {} });
		expect(result.COUNT).toBe(42);
	});

	it("coerces email type", () => {
		const schema = { EMAIL: eg.email() };
		const result = validateAndCoerce(schema, { raw: { EMAIL: "x@x.com" }, merged: {} });
		expect(result.EMAIL).toBe("x@x.com");
	});

	it("coerces json type", () => {
		const schema = { CONFIG: eg.json() };
		const result = validateAndCoerce(schema, { raw: { CONFIG: '{"a":1}' }, merged: {} });
		expect(result.CONFIG).toEqual({ a: 1 });
	});

	it("coerces date type", () => {
		const schema = { START_DATE: eg.date() };
		const result = validateAndCoerce(schema, { raw: { START_DATE: "2024-01-01" }, merged: {} });
		expect(result.START_DATE).toBeInstanceOf(Date);
	});
});

describe("requiredIf", () => {
	it("requires field when condition is true", () => {
		const schema = {
			USE_DB: eg.string().optional(),
			DB_URL: eg.url().requiredIf((raw) => raw.USE_DB === "true"),
		};
		expect(() =>
			validateAndCoerce(schema, {
				raw: { USE_DB: "true", DB_URL: undefined },
				merged: { USE_DB: "true" },
			}),
		).toThrow(EnvValidationError);
	});

	it("does not require field when condition is false", () => {
		const schema = {
			USE_DB: eg.string().optional(),
			DB_URL: eg.url().requiredIf((raw) => raw.USE_DB === "true"),
		};
		const result = validateAndCoerce(schema, {
			raw: { USE_DB: "false", DB_URL: undefined },
			merged: { USE_DB: "false" },
		});
		expect(result.DB_URL).toBeUndefined();
	});
});

describe("group fields", () => {
	it("resolves nested group from merged map", () => {
		const schema = {
			db: eg.group({ HOST: eg.string(), PORT: eg.port() }),
		};
		const result = validateAndCoerce(schema, {
			raw: {},
			merged: { DB__HOST: "localhost", DB__PORT: "5432" },
		});
		expect((result.db as Record<string, unknown>).HOST).toBe("localhost");
		expect((result.db as Record<string, unknown>).PORT).toBe(5432);
	});

	it("prefixes field names in group failures", () => {
		const schema = {
			db: eg.group({ HOST: eg.string() }),
		};
		try {
			validateAndCoerce(schema, { raw: {}, merged: {} });
			expect.unreachable();
		} catch (err) {
			expect(err).toBeInstanceOf(EnvValidationError);
			const f = (err as EnvValidationError).failures[0];
			expect(f?.field).toBe("db.HOST");
		}
	});
});
