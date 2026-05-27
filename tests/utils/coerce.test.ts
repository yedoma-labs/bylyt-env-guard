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

	it("filters empty entries", () => {
		expect(coerce("a,,b,", "array")).toEqual(["a", "b"]);
	});
});
