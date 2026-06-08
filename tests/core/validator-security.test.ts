import { describe, expect, it, vi } from "vitest";
import { eg } from "../../src";
import { validateAndCoerce } from "../../src/core/validator.js";
import { EnvValidationError } from "../../src/errors/validation-error.js";

describe("validator security", () => {
	describe("transform timeout detection", () => {
		it("warns when transform exceeds timeout", () => {
			const warns: string[] = [];
			const spy = vi.spyOn(console, "warn").mockImplementation((msg) => warns.push(msg));

			const schema = {
				SLOW: eg.string().transform(
					(v) => {
						// Simulate slow transform
						const start = Date.now();
						while (Date.now() - start < 100) {
							// busy wait
						}
						return v.toUpperCase();
					},
					{ timeout: 50 },
				),
			};

			validateAndCoerce(schema, { raw: { SLOW: "test" }, merged: {} });

			spy.mockRestore();
			expect(warns.some((w) => w.includes("took") && w.includes("ms"))).toBe(true);
		});

		it("catches and reports transform errors", () => {
			const schema = {
				BAD: eg.string().transform(() => {
					throw new Error("Transform failed");
				}),
			};

			try {
				validateAndCoerce(schema, { raw: { BAD: "test" }, merged: {} });
				expect.unreachable();
			} catch (err) {
				expect(err).toBeInstanceOf(EnvValidationError);
				const failures = (err as EnvValidationError).failures;
				expect(failures).toBeDefined();
				expect(failures[0]?.code).toBe("TRANSFORM_ERROR");
			}
		});

		it("uses default timeout when not specified", () => {
			const schema = {
				FIELD: eg.string().transform((v) => v.toUpperCase()),
			};

			const result = validateAndCoerce(schema, { raw: { FIELD: "test" }, merged: {} });
			expect(result.FIELD).toBe("TEST");
		});
	});
});
