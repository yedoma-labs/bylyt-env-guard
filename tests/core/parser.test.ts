import { describe, expect, it } from "vitest";
import { parseSource } from "../../src/core/parser.js";

describe("parseSource", () => {
	it("parses object source, filtering undefined", () => {
		const result = parseSource({ FOO: "bar", BAZ: undefined, QUX: "123" });
		expect(result).toEqual({ FOO: "bar", QUX: "123" });
	});

	it("returns empty for non-existent file", () => {
		expect(parseSource("/tmp/__nonexistent__.env")).toEqual({});
	});
});
