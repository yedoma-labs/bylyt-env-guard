import { describe, expect, it } from "vitest";
import { eg, safeCreateEnv } from "../../src";

describe("safeCreateEnv", () => {
	it("returns the typed env on success", () => {
		const result = safeCreateEnv({
			schema: { PORT: eg.port().default(3000), DEBUG: eg.boolean().default(false) },
			sources: [{ PORT: "8080" }],
		});

		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.env.PORT).toBe(8080);
		expect(result.env.DEBUG).toBe(false);
		expect(result.failures).toEqual([]);
	});

	it("reports all failures instead of throwing", () => {
		const result = safeCreateEnv({
			schema: {
				REQUIRED_A: eg.string(),
				REQUIRED_B: eg.number(),
				INVALID_PORT: eg.port(),
			},
			sources: [{ INVALID_PORT: "99999" }],
		});

		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.env).toBeUndefined();
		expect(result.failures.map((f) => [f.field, f.code])).toEqual([
			["REQUIRED_A", "MISSING"],
			["REQUIRED_B", "MISSING"],
			["INVALID_PORT", "MAX_VALUE"],
		]);
	});

	it("returns the same failure list that createEnv throws", () => {
		const options = {
			schema: { API_KEY: eg.string().minLength(32).sensitive() },
			sources: [{ API_KEY: "short" }],
		};
		const result = safeCreateEnv(options);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.failures[0]).toMatchObject({ field: "API_KEY", code: "MIN_LENGTH" });
		expect(result.failures[0]?.value).toBe("***");
	});

	it("still throws errors that are not validation failures", () => {
		expect(() =>
			safeCreateEnv({
				schema: {
					PORT: eg.port().validate(() => {
						throw new Error("validator crashed");
					}),
				},
				sources: [{ PORT: "8080" }],
			}),
		).toThrow("validator crashed");
	});
});

describe("eg.duration (integration)", () => {
	it("converts duration strings to milliseconds", () => {
		const result = safeCreateEnv({
			schema: {
				SHORT: eg.duration(),
				TTL: eg.duration().default(0),
				TIMEOUT: eg.duration(),
				HOURS: eg.duration(),
				DAYS: eg.duration(),
			},
			sources: [{ SHORT: "500ms", TTL: "1.5s", TIMEOUT: "30s", HOURS: "2h", DAYS: "7d" }],
		});

		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.env.SHORT).toBe(500);
		expect(result.env.TTL).toBe(1500);
		expect(result.env.TIMEOUT).toBe(30_000);
		expect(result.env.HOURS).toBe(7_200_000);
		expect(result.env.DAYS).toBe(604_800_000);
	});

	it("enforces min and max in milliseconds", () => {
		const result = safeCreateEnv({
			schema: {
				TIMEOUT: eg.duration().min(1_000).max(60_000),
			},
			sources: [{ TIMEOUT: "2m" }],
		});

		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.failures[0]).toMatchObject({ field: "TIMEOUT", code: "MAX_VALUE" });
	});

	it("reports invalid duration strings as INVALID_TYPE with the expected format", () => {
		const result = safeCreateEnv({
			schema: { TTL: eg.duration() },
			sources: [{ TTL: "5 minutes" }],
		});

		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.failures[0]).toMatchObject({ field: "TTL", code: "INVALID_TYPE" });
		expect(result.failures[0]?.message).toContain("500ms, 30s, 5m, 2h, 7d");
	});
});
