import { describe, expect, it } from "vitest";
import { CoercionError, coerce } from "../../src/utils/coerce.js";

describe("coerce", () => {
	it("passes through strings", () => {
		expect(coerce("hello", "string")).toBe("hello");
		expect(coerce("http://x.com", "url")).toBe("http://x.com");
		expect(coerce("dev", "enum")).toBe("dev");
	});

	it("coerces numbers", () => {
		expect(coerce("42", "number")).toBe(42);
		expect(coerce("3.14", "number")).toBe(3.14);
	});

	it("throws on invalid number", () => {
		expect(() => coerce("abc", "number")).toThrow(CoercionError);
	});

	it("coerces port as integer", () => {
		expect(coerce("8080", "port")).toBe(8080);
	});

	it("throws on non-integer port", () => {
		expect(() => coerce("abc", "port")).toThrow(CoercionError);
	});

	it("coerces booleans", () => {
		for (const v of ["true", "1", "yes", "on", "TRUE", "Yes"]) {
			expect(coerce(v, "boolean")).toBe(true);
		}
		for (const v of ["false", "0", "no", "off", "FALSE", "No"]) {
			expect(coerce(v, "boolean")).toBe(false);
		}
	});

	it("throws on invalid boolean", () => {
		expect(() => coerce("maybe", "boolean")).toThrow(CoercionError);
	});

	it("coerces arrays", () => {
		expect(coerce("a,b,c", "array")).toEqual(["a", "b", "c"]);
		expect(coerce("a , b , c", "array")).toEqual(["a", "b", "c"]);
	});

	it("coerces arrays with custom separator", () => {
		expect(coerce("a|b|c", "array", "|")).toEqual(["a", "b", "c"]);
	});

	it("returns raw for unknown kind", () => {
		// biome-ignore lint/suspicious/noExplicitAny: testing fallthrough
		expect(coerce("val", "unknown" as any)).toBe("val");
	});

	it("filters empty entries", () => {
		expect(coerce("a,,b,", "array")).toEqual(["a", "b"]);
	});

	it("passes through email", () => {
		expect(coerce("test@example.com", "email")).toBe("test@example.com");
	});

	it("coerces json", () => {
		const result = coerce('{"key":"val"}', "json");
		expect(result).toEqual({ key: "val" });
	});

	it("throws on invalid json", () => {
		expect(() => coerce("not-json", "json")).toThrow(CoercionError);
	});

	it("coerces date", () => {
		const result = coerce("2024-01-15", "date");
		expect(result).toBeInstanceOf(Date);
		expect((result as Date).toISOString()).toContain("2024-01-15");
	});

	it("throws on invalid date", () => {
		expect(() => coerce("not-a-date-at-all-xyz", "date")).toThrow(CoercionError);
	});

	it("coerces integer", () => {
		expect(coerce("42", "integer")).toBe(42);
	});

	it("coerces integer from decimal (truncates)", () => {
		expect(coerce("42.5", "integer")).toBe(42);
	});

	it("throws on non-numeric integer", () => {
		expect(() => coerce("abc", "integer")).toThrow(CoercionError);
	});

	it("coerces port from decimal (truncates)", () => {
		expect(coerce("8080.5", "port")).toBe(8080);
	});

	it("coerces array of numbers", () => {
		const result = coerce("1,2,3", "array", ",", "number");
		expect(result).toEqual([1, 2, 3]);
	});

	it("coerces array of integers", () => {
		const result = coerce("1,2,3", "array", ",", "integer");
		expect(result).toEqual([1, 2, 3]);
	});

	it("coerces array of booleans", () => {
		const result = coerce("true,false,yes", "array", ",", "boolean");
		expect(result).toEqual([true, false, true]);
	});

	it("throws on invalid array item", () => {
		expect(() => coerce("1,abc,3", "array", ",", "number")).toThrow(CoercionError);
	});
});
