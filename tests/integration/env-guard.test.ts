import { unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createEnv, EnvValidationError, eg } from "../../src";

describe("createEnv (integration)", () => {
	it("validates and returns typed env from object source", () => {
		const env = createEnv({
			schema: {
				NODE_ENV: eg.enum(["development", "production"] as const),
				PORT: eg.port().default(3000),
				DEBUG: eg.boolean().default(false),
				API_KEY: eg.string().minLength(8).sensitive(),
				DATABASE_URL: eg.url(),
				TAGS: eg.array().separator(","),
			},
			sources: [
				{
					NODE_ENV: "production",
					PORT: "8080",
					API_KEY: "super-secret-key-123",
					DATABASE_URL: "https://db.example.com",
					TAGS: "web,api,v2",
				},
			],
		});

		expect(env.NODE_ENV).toBe("production");
		expect(env.PORT).toBe(8080);
		expect(env.DEBUG).toBe(false);
		expect(env.API_KEY).toBe("super-secret-key-123");
		expect(env.DATABASE_URL).toBe("https://db.example.com");
		expect(env.TAGS).toEqual(["web", "api", "v2"]);
	});

	it("reads from .env file", () => {
		const envPath = join(tmpdir(), `.env-guard-test-${Date.now()}`);
		writeFileSync(envPath, 'APP_NAME="my-app"\nPORT=9090\n');

		try {
			const env = createEnv({
				schema: {
					APP_NAME: eg.string(),
					PORT: eg.port(),
				},
				sources: [envPath],
			});

			expect(env.APP_NAME).toBe("my-app");
			expect(env.PORT).toBe(9090);
		} finally {
			unlinkSync(envPath);
		}
	});

	it("later sources override earlier ones", () => {
		const env = createEnv({
			schema: { FOO: eg.string() },
			sources: [{ FOO: "first" }, { FOO: "second" }],
		});
		expect(env.FOO).toBe("second");
	});

	it("throws with all failures at once", () => {
		try {
			createEnv({
				schema: {
					REQUIRED_A: eg.string(),
					REQUIRED_B: eg.number(),
					INVALID_PORT: eg.port(),
				},
				sources: [{ INVALID_PORT: "99999" }],
			});
			expect.unreachable();
		} catch (err) {
			expect(err).toBeInstanceOf(EnvValidationError);
			const failures = (err as EnvValidationError).failures;
			expect(failures.length).toBeGreaterThanOrEqual(3);
		}
	});

	it("defaults to process.env when no sources given", () => {
		const original = process.env.ENV_GUARD_TEST_VAR;
		process.env.ENV_GUARD_TEST_VAR = "from-process";

		try {
			const env = createEnv({
				schema: { ENV_GUARD_TEST_VAR: eg.string() },
			});
			expect(env.ENV_GUARD_TEST_VAR).toBe("from-process");
		} finally {
			if (original === undefined) {
				delete process.env.ENV_GUARD_TEST_VAR;
			} else {
				process.env.ENV_GUARD_TEST_VAR = original;
			}
		}
	});
});

describe("new features integration", () => {
	it("integer type coerces and validates", () => {
		const env = createEnv({
			schema: { COUNT: eg.integer() },
			sources: [{ COUNT: "42" }],
		});
		expect(env.COUNT).toBe(42);
	});

	it("email type validates valid email", () => {
		const env = createEnv({
			schema: { EMAIL: eg.email() },
			sources: [{ EMAIL: "user@example.com" }],
		});
		expect(env.EMAIL).toBe("user@example.com");
	});

	it("email type rejects invalid email", () => {
		try {
			createEnv({
				schema: { EMAIL: eg.email() },
				sources: [{ EMAIL: "not-an-email" }],
			});
			expect.unreachable();
		} catch (err) {
			expect(err).toBeInstanceOf(EnvValidationError);
			const failure = (err as EnvValidationError).failures[0];
			expect(failure?.code).toBe("INVALID_EMAIL");
		}
	});

	it("json type parses JSON strings", () => {
		const env = createEnv({
			schema: { CONFIG: eg.json<{ port: number }>() },
			sources: [{ CONFIG: '{"port":3000}' }],
		});
		expect(env.CONFIG).toEqual({ port: 3000 });
	});

	it("date type parses date strings", () => {
		const env = createEnv({
			schema: { START_DATE: eg.date() },
			sources: [{ START_DATE: "2024-01-15" }],
		});
		expect(env.START_DATE).toBeInstanceOf(Date);
		expect(env.START_DATE.toISOString()).toContain("2024-01-15");
	});

	it("resolves from alias when primary is missing", () => {
		const env = createEnv({
			schema: { PORT: eg.number().aliases("APP_PORT") },
			sources: [{ APP_PORT: "8080" }],
		});
		expect(env.PORT).toBe(8080);
	});

	it("transform function is applied", () => {
		const env = createEnv({
			schema: { NAME: eg.string().transform((v) => v.toUpperCase()) },
			sources: [{ NAME: "hello" }],
		});
		expect(env.NAME).toBe("HELLO");
	});

	it("url protocols restriction works", () => {
		try {
			createEnv({
				schema: { API_URL: eg.url().protocols("https") },
				sources: [{ API_URL: "http://insecure.com" }],
			});
			expect.unreachable();
		} catch (err) {
			expect(err).toBeInstanceOf(EnvValidationError);
			const failure = (err as EnvValidationError).failures[0];
			expect(failure?.code).toBe("INVALID_PROTOCOL");
		}
	});

	it("array of numbers is coerced correctly", () => {
		const env = createEnv({
			schema: { PORTS: eg.array().of("number") },
			sources: [{ PORTS: "1,2,3" }],
		});
		expect(env.PORTS).toEqual([1, 2, 3]);
	});

	it("missing required field has MISSING error code", () => {
		try {
			createEnv({
				schema: { REQUIRED_VAR: eg.string() },
				sources: [{}],
			});
			expect.unreachable();
		} catch (err) {
			expect(err).toBeInstanceOf(EnvValidationError);
			const failure = (err as EnvValidationError).failures[0];
			expect(failure?.code).toBe("MISSING");
		}
	});

	it("case-insensitive enum matches", () => {
		const env = createEnv({
			schema: { ENV: eg.enum(["prod", "dev"] as const).caseInsensitive() },
			sources: [{ ENV: "PROD" }],
		});
		expect(env.ENV).toBe("PROD");
	});

	it("defaultFactory is called when value is missing", () => {
		let callCount = 0;
		const env = createEnv({
			schema: {
				PORT: eg.number().default(() => {
					callCount++;
					return 9000;
				}),
			},
			sources: [{}],
		});
		expect(env.PORT).toBe(9000);
		expect(callCount).toBe(1);
	});
});
