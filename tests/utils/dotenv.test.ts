import { describe, expect, it } from "vitest";
import { parseDotenv } from "../../src/utils/dotenv.js";

describe("prototype pollution prevention", () => {
	it("ignores __proto__ keys", () => {
		// biome-ignore lint/suspicious/noExplicitAny: testing prototype pollution guard
		const before = (Object.prototype as any).polluted;
		parseDotenv("__proto__[polluted]=true\nNORMAL=value");
		// biome-ignore lint/suspicious/noExplicitAny: testing prototype pollution guard
		expect((Object.prototype as any).polluted).toBe(before);
	});

	it("ignores constructor keys", () => {
		parseDotenv("constructor[prototype][x]=hacked\nNORMAL=value");
		// biome-ignore lint/suspicious/noExplicitAny: testing prototype pollution guard
		expect((Object.prototype as any).x).toBeUndefined();
	});

	it("still parses normal keys when blocked keys are present", () => {
		// Only exact keys __proto__, constructor, prototype are blocked
		// Flat keys like "__proto__[bad]" are harmless and pass through
		const result = parseDotenv("__proto__=evil\nPORT=3000\nconstructor=y\nHOST=localhost");
		expect(result.PORT).toBe("3000");
		expect(result.HOST).toBe("localhost");
		expect(Object.hasOwn(result, "__proto__")).toBe(false);
		expect(Object.hasOwn(result, "constructor")).toBe(false);
	});
});

describe("parseDotenv", () => {
	it("parses simple key=value", () => {
		expect(parseDotenv("FOO=bar")).toEqual({ FOO: "bar" });
	});

	it("ignores comments and empty lines", () => {
		const input = `
# comment
FOO=bar

# another comment
BAZ=qux
`;
		expect(parseDotenv(input)).toEqual({ FOO: "bar", BAZ: "qux" });
	});

	it("handles export prefix", () => {
		expect(parseDotenv("export FOO=bar")).toEqual({ FOO: "bar" });
	});

	it("strips double quotes", () => {
		expect(parseDotenv('FOO="bar baz"')).toEqual({ FOO: "bar baz" });
	});

	it("strips single quotes", () => {
		expect(parseDotenv("FOO='bar baz'")).toEqual({ FOO: "bar baz" });
	});

	it("strips backtick quotes", () => {
		expect(parseDotenv("FOO=`bar baz`")).toEqual({ FOO: "bar baz" });
	});

	it("handles inline comments", () => {
		expect(parseDotenv("FOO=bar # comment")).toEqual({ FOO: "bar" });
	});

	it("preserves inline # in quotes", () => {
		expect(parseDotenv('FOO="bar # not a comment"')).toEqual({ FOO: "bar # not a comment" });
	});

	it("handles multiline values", () => {
		const input = `FOO="line1
line2
line3"`;
		expect(parseDotenv(input)).toEqual({ FOO: "line1\nline2\nline3" });
	});

	it("skips lines without =", () => {
		expect(parseDotenv("INVALID\nFOO=bar")).toEqual({ FOO: "bar" });
	});

	it("handles empty values", () => {
		expect(parseDotenv("FOO=")).toEqual({ FOO: "" });
	});
});
