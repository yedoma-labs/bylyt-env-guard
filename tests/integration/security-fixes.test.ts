import { describe, expect, it, vi } from "vitest";
import { createEnv, eg } from "../../src";

describe("Security fixes integration", () => {
	it("blocks ReDoS patterns at schema definition", () => {
		// Previously accepted, now rejected
		expect(() => {
			createEnv({
				schema: {
					PATTERN: eg.string().pattern(/(a+)+b/),
				},
				sources: [{ PATTERN: "aaab" }],
			});
		}).toThrow(/Unsafe regex pattern.*Nested quantifiers/);
	});

	it("accepts safe patterns", () => {
		expect(() => {
			const env = createEnv({
				schema: {
					API_KEY: eg.string().pattern(/^[A-Za-z0-9_-]{32}$/),
					USERNAME: eg.string().pattern(/^[a-z][a-z0-9_-]+$/),
				},
				sources: [
					{
						API_KEY: "abcd1234efgh5678ijkl9012mnop3456",
						USERNAME: "admin_user",
					},
				],
			});
			expect(env.API_KEY).toBe("abcd1234efgh5678ijkl9012mnop3456");
			expect(env.USERNAME).toBe("admin_user");
		}).not.toThrow();
	});

	it("monitors slow transforms", () => {
		const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

		const env = createEnv({
			schema: {
				PORT: eg.number().transform(
					(n) => {
						// Simulate slow transform
						const start = Date.now();
						while (Date.now() - start < 100) {
							// busy wait
						}
						return n;
					},
					{ timeout: 50 },
				),
			},
			sources: [{ PORT: "3000" }],
		});

		expect(env.PORT).toBe(3000);
		expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Transform for"));
		expect(consoleSpy).toHaveBeenCalledWith(
			expect.stringContaining("Keep transforms fast and pure"),
		);

		consoleSpy.mockRestore();
	});

	it("transform timeout is configurable", () => {
		const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

		// With a high timeout, fast transforms shouldn't warn
		const env = createEnv({
			schema: {
				PORT: eg.number().transform((n) => n * 2, { timeout: 10000 }),
			},
			sources: [{ PORT: "3000" }],
		});

		expect(env.PORT).toBe(6000);
		expect(consoleSpy).not.toHaveBeenCalled();

		consoleSpy.mockRestore();
	});

	it("provides helpful ReDoS error messages", () => {
		try {
			createEnv({
				schema: {
					CRON: eg.string().pattern(/(a|ab)+/),
				},
				sources: [{ CRON: "* * * * *" }],
			});
			expect.fail("Should have thrown");
		} catch (err) {
			const message = (err as Error).message;
			expect(message).toContain("Unsafe regex pattern");
			expect(message).toContain("Alternation with quantifiers");
			expect(message).toContain("owasp.org");
		}
	});
});
