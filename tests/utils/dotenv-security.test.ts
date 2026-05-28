import { describe, expect, it } from "vitest";
import { parseDotenv } from "../../src/utils/dotenv.js";

describe("dotenv security", () => {
	it("rejects multiline value exceeding MAX_MULTILINE_LINES", () => {
		const lines = ['SECRET="start'];
		for (let i = 0; i < 101; i++) {
			lines.push(`line${i}`);
		}
		const content = lines.join("\n");
		expect(() => parseDotenv(content)).toThrow("exceeds 100 lines");
	});

	it("accepts multiline value within limit", () => {
		const lines = ['SECRET="start'];
		for (let i = 0; i < 50; i++) {
			lines.push(`line${i}`);
		}
		lines.push('end"');
		const content = lines.join("\n");
		const result = parseDotenv(content);
		expect(result.SECRET).toBeDefined();
		expect(result.SECRET.split("\n").length).toBe(52);
	});

	it("handles properly closed multiline values", () => {
		const content = 'KEY="line1\nline2\nline3"';
		// Note: this test uses literal \n in the string, which parseDotenv doesn't handle
		// Real multiline is multiple lines in the file
		const result = parseDotenv(content);
		expect(result.KEY).toBe("line1\nline2\nline3");
	});
});
