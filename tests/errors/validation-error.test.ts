import { describe, it, expect } from "vitest";
import { EnvValidationError } from "../../src/errors/validation-error.js";

describe("EnvValidationError", () => {
	it("formats multiple failures", () => {
		const err = new EnvValidationError([
			{ field: "PORT", message: "is required but missing" },
			{ field: "URL", message: "must be a valid URL", value: "bad" },
		]);
		expect(err.name).toBe("EnvValidationError");
		expect(err.failures).toHaveLength(2);
		expect(err.message).toContain("PORT");
		expect(err.message).toContain("URL");
		expect(err.message).toContain("got: bad");
	});

	it("omits value hint when no value", () => {
		const err = new EnvValidationError([
			{ field: "X", message: "is required but missing" },
		]);
		expect(err.message).not.toContain("got:");
	});
});
