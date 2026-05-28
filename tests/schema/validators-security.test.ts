import { describe, expect, it } from "vitest";
import type { SchemaFieldOptions } from "../../src/schema/types.js";
import { validateField } from "../../src/schema/validators.js";

describe("validators security", () => {
	describe("timing-safe enum comparison for sensitive fields", () => {
		it("validates sensitive enum with constant-time comparison", () => {
			const opts: SchemaFieldOptions = {
				kind: "enum",
				isRequired: true,
				isSensitive: true,
				enumValues: ["secret_key_abc", "secret_key_xyz"],
			};

			// Valid value
			const valid = validateField("API_KEY", "secret_key_abc", opts);
			expect(valid).toBeNull();

			// Invalid value - should fail but with constant time
			const invalid = validateField("API_KEY", "secret_key_wrong", opts);
			expect(invalid).not.toBeNull();
			expect(invalid?.code).toBe("INVALID_ENUM");
		});

		it("uses fast path for non-sensitive enums", () => {
			const opts: SchemaFieldOptions = {
				kind: "enum",
				isRequired: true,
				isSensitive: false,
				enumValues: ["dev", "prod", "staging"],
			};

			const valid = validateField("ENV", "prod", opts);
			expect(valid).toBeNull();

			const invalid = validateField("ENV", "test", opts);
			expect(invalid).not.toBeNull();
		});

		it("handles case-insensitive sensitive enums", () => {
			const opts: SchemaFieldOptions = {
				kind: "enum",
				isRequired: true,
				isSensitive: true,
				caseInsensitive: true,
				enumValues: ["SecretA", "SecretB"],
			};

			const valid = validateField("KEY", "secreta", opts);
			expect(valid).toBeNull();

			const invalid = validateField("KEY", "secretc", opts);
			expect(invalid).not.toBeNull();
		});
	});
});
