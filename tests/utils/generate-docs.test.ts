import { describe, expect, it } from "vitest";
import { eg } from "../../src";
import { generateMarkdownDocs } from "../../src/utils/generate-docs.js";

describe("generateMarkdownDocs", () => {
	it("generates markdown table with headers", () => {
		const out = generateMarkdownDocs({ PORT: eg.port().default(3000) });
		expect(out).toContain("## Environment Variables");
		expect(out).toContain("| Variable |");
		expect(out).toContain("| Type |");
		expect(out).toContain("| Required |");
		expect(out).toContain("| Default |");
	});

	it("marks required fields with checkmark", () => {
		const out = generateMarkdownDocs({ SECRET: eg.string() });
		expect(out).toContain("✅");
	});

	it("shows default value", () => {
		const out = generateMarkdownDocs({ PORT: eg.port().default(3000) });
		expect(out).toContain("`3000`");
	});

	it("includes description", () => {
		const out = generateMarkdownDocs({
			PORT: eg.port().describe("HTTP server port"),
		});
		expect(out).toContain("HTTP server port");
	});

	it("shows enum constraints", () => {
		const out = generateMarkdownDocs({
			ENV: eg.enum(["dev", "prod"] as const),
		});
		expect(out).toContain("`dev`");
		expect(out).toContain("`prod`");
	});

	it("shows min/max constraints for numbers", () => {
		const out = generateMarkdownDocs({ WORKERS: eg.number().min(1).max(16) });
		expect(out).toContain("min: 1");
		expect(out).toContain("max: 16");
	});

	it("supports custom title", () => {
		const out = generateMarkdownDocs({ X: eg.string() }, { title: "Config Reference" });
		expect(out).toContain("## Config Reference");
	});

	it("expands group fields with prefix", () => {
		const out = generateMarkdownDocs({
			db: eg.group({ HOST: eg.string(), PORT: eg.port() }),
		});
		expect(out).toContain("`DB__HOST`");
		expect(out).toContain("`DB__PORT`");
	});

	it("expands arrayOfGroups with N placeholder", () => {
		const out = generateMarkdownDocs({
			servers: eg.arrayOfGroups({ HOST: eg.string() }),
		});
		expect(out).toContain("SERVERS_N_HOST");
	});

	it("can disable constraints column", () => {
		const out = generateMarkdownDocs(
			{ PORT: eg.port().default(3000) },
			{ includeConstraints: false },
		);
		expect(out).not.toContain("Constraints");
	});
});
