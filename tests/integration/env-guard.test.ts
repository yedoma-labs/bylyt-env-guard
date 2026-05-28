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

describe("advanced features", () => {
	it("prefix: reads APP_PORT when prefix is APP_", () => {
		const env = createEnv({
			schema: { PORT: eg.port() },
			sources: [{ APP_PORT: "9000" }],
			prefix: "APP_",
		});
		expect(env.PORT).toBe(9000);
	});

	it("profiles: applies profile defaults", () => {
		const env = createEnv({
			schema: { LOG_LEVEL: eg.enum(["debug", "info", "warn"] as const) },
			sources: [{}],
			profiles: { test: { LOG_LEVEL: "debug" } },
			activeProfile: "test",
		});
		expect(env.LOG_LEVEL).toBe("debug");
	});

	it("profiles: source overrides profile default", () => {
		const env = createEnv({
			schema: { LOG_LEVEL: eg.enum(["debug", "info", "warn"] as const) },
			sources: [{ LOG_LEVEL: "warn" }],
			profiles: { test: { LOG_LEVEL: "debug" } },
			activeProfile: "test",
		});
		expect(env.LOG_LEVEL).toBe("warn");
	});

	it("requiredIf: field required when condition true", () => {
		expect(() =>
			createEnv({
				schema: {
					USE_DB: eg.enum(["true", "false"] as const).default("true"),
					DB_URL: eg.url().requiredIf((raw) => raw.USE_DB === "true"),
				},
				sources: [{ USE_DB: "true" }],
			}),
		).toThrow(EnvValidationError);
	});

	it("requiredIf: field not required when condition false", () => {
		const env = createEnv({
			schema: {
				USE_DB: eg.enum(["true", "false"] as const),
				DB_URL: eg.url().requiredIf((raw) => raw.USE_DB === "true"),
			},
			sources: [{ USE_DB: "false" }],
		});
		expect(env.DB_URL).toBeUndefined();
	});

	it("group: resolves nested env vars", () => {
		const env = createEnv({
			schema: {
				db: eg.group({
					HOST: eg.string().default("localhost"),
					PORT: eg.port().default(5432),
				}),
			},
			sources: [{ DB__HOST: "mydb.example.com", DB__PORT: "5433" }],
		});
		expect(env.db.HOST).toBe("mydb.example.com");
		expect(env.db.PORT).toBe(5433);
	});

	it("group: uses subfield defaults when env vars absent", () => {
		const env = createEnv({
			schema: {
				db: eg.group({
					HOST: eg.string().default("localhost"),
					PORT: eg.port().default(5432),
				}),
			},
			sources: [{}],
		});
		expect(env.db.HOST).toBe("localhost");
		expect(env.db.PORT).toBe(5432);
	});

	it("group: custom separator", () => {
		const env = createEnv({
			schema: {
				db: eg.group({ HOST: eg.string() }, { separator: "_" }),
			},
			sources: [{ DB_HOST: "customdb" }],
		});
		expect(env.db.HOST).toBe("customdb");
	});

	it("result is frozen (immutable)", () => {
		const env = createEnv({
			schema: { PORT: eg.port().default(3000) },
			sources: [{}],
		});
		expect(Object.isFrozen(env)).toBe(true);
	});

	it("describe and example are stored in options", () => {
		const field = eg.string().describe("My description").example("my-value");
		expect(field._options.description).toBe("My description");
		expect(field._options.example).toBe("my-value");
	});
});
