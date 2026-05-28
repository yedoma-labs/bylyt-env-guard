import { describe, expect, it } from "vitest";
import { eg } from "../../src";
import { generateEnvExample } from "../../src/utils/generate-example.js";

describe("generateEnvExample", () => {
	it("generates example for required string field", () => {
		const out = generateEnvExample({ NAME: eg.string() });
		expect(out).toContain("# NAME");
		expect(out).toContain("Required");
		expect(out).toContain("NAME=");
	});

	it("shows default value", () => {
		const out = generateEnvExample({ PORT: eg.port().default(3000) });
		expect(out).toContain("Optional");
		expect(out).toContain("Default: 3000");
		expect(out).toContain("PORT=3000");
	});

	it("shows description and example", () => {
		const out = generateEnvExample({
			API_KEY: eg.string().describe("Third-party API key").example("sk_live_abc123"),
		});
		expect(out).toContain("Third-party API key");
		expect(out).toContain("API_KEY=sk_live_abc123");
	});

	it("shows enum values", () => {
		const out = generateEnvExample({ ENV: eg.enum(["dev", "prod"] as const) });
		expect(out).toContain("values: dev, prod");
	});

	it("shows sensitive marker", () => {
		const out = generateEnvExample({ SECRET: eg.string().sensitive() });
		expect(out).toContain("Sensitive");
	});

	it("shows min/max constraints for number", () => {
		const out = generateEnvExample({ WORKERS: eg.number().min(1).max(32) });
		expect(out).toContain("min: 1");
		expect(out).toContain("max: 32");
	});

	it("generates multiple fields separated by blank lines", () => {
		const out = generateEnvExample({
			A: eg.string(),
			B: eg.number(),
		});
		expect(out).toContain("# A");
		expect(out).toContain("# B");
		// blank line between fields
		expect(out.split("\n").filter((l) => l === "").length).toBeGreaterThan(0);
	});

	it("handles group fields by expanding with prefix", () => {
		const out = generateEnvExample({
			db: eg.group({ HOST: eg.string().default("localhost"), PORT: eg.port().default(5432) }),
		});
		expect(out).toContain("DB__HOST");
		expect(out).toContain("DB__PORT");
	});

	it("shows url allowed protocols", () => {
		const out = generateEnvExample({ API_URL: eg.url().protocols("https") });
		expect(out).toContain("protocols: https");
	});

	it("handles defaultFactory by showing runtime note", () => {
		const out = generateEnvExample({ TS: eg.string().default(() => "now") });
		expect(out).toContain("generated at runtime");
	});

	it("handles arrayOfGroups fields", () => {
		const out = generateEnvExample({
			servers: eg.arrayOfGroups({ HOST: eg.string(), PORT: eg.port() }),
		});
		expect(out).toContain("SERVERS_0_HOST");
		expect(out).toContain("SERVERS_0_PORT");
	});

	it("handles record fields", () => {
		const out = generateEnvExample({
			headers: eg.record("HTTP_HEADER_"),
		});
		expect(out).toContain("HTTP_HEADER_");
		expect(out).toContain("headers");
	});
});
