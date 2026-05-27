import { describe, it, expect } from "vitest";
import { parseDotenv } from "../../src/utils/dotenv.js";

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
