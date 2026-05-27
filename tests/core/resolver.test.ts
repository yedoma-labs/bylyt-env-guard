import { describe, expect, it } from "vitest";
import { eg } from "../../src";
import { resolveSources } from "../../src/core/resolver.js";

describe("resolveSources", () => {
	const schema = {
		FOO: eg.string(),
		BAR: eg.number(),
	};

	it("merges multiple sources (later wins)", () => {
		const result = resolveSources(schema, [{ FOO: "first", BAR: "1" }, { FOO: "second" }]);
		expect(result.raw.FOO).toBe("second");
		expect(result.raw.BAR).toBe("1");
	});

	it("only picks keys from schema", () => {
		const result = resolveSources(schema, [{ FOO: "x", BAR: "1", EXTRA: "y" }]);
		expect(result.raw).toEqual({ FOO: "x", BAR: "1" });
		expect("EXTRA" in result.raw).toBe(false);
	});

	it("returns undefined for missing keys", () => {
		const result = resolveSources(schema, [{ FOO: "x" }]);
		expect(result.raw.BAR).toBeUndefined();
	});
});

describe("aliases", () => {
	it("resolves from alias when primary key is missing", () => {
		const schema = {
			PORT: eg.number().aliases("APP_PORT", "HTTP_PORT"),
		};
		const result = resolveSources(schema, [{ APP_PORT: "8080" }]);
		expect(result.raw.PORT).toBe("8080");
	});

	it("uses first available alias when multiple exist", () => {
		const schema = {
			PORT: eg.number().aliases("APP_PORT", "HTTP_PORT"),
		};
		const result = resolveSources(schema, [{ HTTP_PORT: "3000" }]);
		expect(result.raw.PORT).toBe("3000");
	});

	it("prefers first alias when multiple are present", () => {
		const schema = {
			PORT: eg.number().aliases("APP_PORT", "HTTP_PORT"),
		};
		const result = resolveSources(schema, [{ APP_PORT: "8080", HTTP_PORT: "3000" }]);
		expect(result.raw.PORT).toBe("8080");
	});

	it("primary key takes precedence over aliases", () => {
		const schema = {
			PORT: eg.number().aliases("APP_PORT", "HTTP_PORT"),
		};
		const result = resolveSources(schema, [{ PORT: "9000", APP_PORT: "8080" }]);
		expect(result.raw.PORT).toBe("9000");
	});
});
