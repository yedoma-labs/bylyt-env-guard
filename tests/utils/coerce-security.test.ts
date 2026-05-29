import { describe, expect, it } from "vitest";
import { coerce } from "../../src/utils/coerce.js";

describe("coerce security", () => {
	describe("JSON bomb protection", () => {
		it("rejects JSON exceeding 1MB size limit", () => {
			const large = JSON.stringify({ data: "x".repeat(1024 * 1024 + 1) });
			expect(() => coerce(large, "json")).toThrow("size limit exceeded");
		});

		it("rejects deeply nested JSON exceeding depth limit", () => {
			let nested = "{}";
			for (let i = 0; i < 60; i++) {
				nested = `{"a":${nested}}`;
			}
			expect(() => coerce(nested, "json")).toThrow("depth limit exceeded");
		});

		it("accepts valid JSON within limits", () => {
			const valid = JSON.stringify({ a: { b: { c: 1 } } });
			expect(() => coerce(valid, "json")).not.toThrow();
		});
	});

	describe("integer precision protection", () => {
		it("rejects integer exceeding MAX_SAFE_INTEGER", () => {
			const tooLarge = String(Number.MAX_SAFE_INTEGER + 1);
			expect(() => coerce(tooLarge, "integer")).toThrow("safe integer range");
		});

		it("rejects integer below MIN_SAFE_INTEGER", () => {
			const tooSmall = String(Number.MIN_SAFE_INTEGER - 1);
			expect(() => coerce(tooSmall, "integer")).toThrow("safe integer range");
		});

		it("accepts integer at MAX_SAFE_INTEGER boundary", () => {
			const atMax = String(Number.MAX_SAFE_INTEGER);
			expect(coerce(atMax, "integer")).toBe(Number.MAX_SAFE_INTEGER);
		});

		it("rejects port exceeding MAX_SAFE_INTEGER", () => {
			const tooLarge = String(Number.MAX_SAFE_INTEGER + 1);
			expect(() => coerce(tooLarge, "port")).toThrow("safe integer range");
		});
	});

	describe("array separator validation", () => {
		it("processes normal separators correctly", () => {
			expect(coerce("a,b,c", "array", ",")).toEqual(["a", "b", "c"]);
			expect(coerce("a|b|c", "array", "|")).toEqual(["a", "b", "c"]);
		});
	});
});
