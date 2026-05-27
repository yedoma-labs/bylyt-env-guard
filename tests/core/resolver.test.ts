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
