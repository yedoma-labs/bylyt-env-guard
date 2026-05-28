# @yedoma-labs/bylyt-env-guard

[![CI](https://github.com/yedoma-labs/bylyt-env-guard/actions/workflows/ci.yml/badge.svg)](https://github.com/yedoma-labs/bylyt-env-guard/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@yedoma-labs/bylyt-env-guard)](https://www.npmjs.com/package/@yedoma-labs/bylyt-env-guard)
[![npm downloads](https://img.shields.io/npm/dm/@yedoma-labs/bylyt-env-guard)](https://www.npmjs.com/package/@yedoma-labs/bylyt-env-guard)

Type-safe, zero-dependency environment variable validation for Node.js. Fail fast with clear, collected error messages.

## Features

- 🔒 **Type-safe** — Full TypeScript inference, result is `Readonly<...>` and deep-frozen
- 📦 **Zero dependencies** — Built-in `.env` parser, no dotenv needed
- 💥 **Fail-fast** — All validation errors collected and thrown at once
- 🔄 **Auto-coercion** — Strings to numbers, booleans, dates, JSON, arrays automatically
- 🎭 **Sensitive masking** — Mark secrets to hide values in error output
- 📁 **Multi-source** — `.env` files + `process.env` with configurable priority
- 🏗️ **Nested variables** — Group related vars (`DB__HOST`, `DB__PORT`) into typed objects
- 🔁 **Watch mode** — Re-validate automatically when `.env` files change
- 📝 **Auto-documentation** — Generate `.env.example` and markdown docs from schema

## Install

```bash
npm install @yedoma-labs/bylyt-env-guard
bun add @yedoma-labs/bylyt-env-guard
pnpm add @yedoma-labs/bylyt-env-guard
```

## Quick Start

```typescript
import { createEnv, eg } from "@yedoma-labs/bylyt-env-guard";

export const env = createEnv({
  schema: {
    NODE_ENV: eg.enum(["development", "staging", "production"] as const),
    PORT: eg.port().default(3000),
    DATABASE_URL: eg.url().sensitive(),
    API_KEY: eg.string().minLength(32).sensitive(),
    DEBUG: eg.boolean().default(false),
  },
});

// env is fully typed and immutable:
// {
//   NODE_ENV: "development" | "staging" | "production"
//   PORT: number
//   DATABASE_URL: string
//   API_KEY: string
//   DEBUG: boolean
// }
```

## Real-World Examples

### Express / Fastify API Server

A complete example for a typical Node.js API. Create `src/env.ts`:

```typescript
import { createEnv, eg } from "@yedoma-labs/bylyt-env-guard";

export const env = createEnv({
  schema: {
    // Server
    NODE_ENV: eg.enum(["development", "production", "test"] as const),
    PORT: eg.port().default(3000).describe("HTTP port the API server listens on"),
    HOST: eg.string().default("0.0.0.0").describe("Bind address"),

    // Database
    DATABASE_URL: eg.url()
      .protocols("postgres", "postgresql")
      .sensitive()
      .describe("PostgreSQL connection string"),
    DATABASE_POOL_MIN: eg.integer().min(1).max(20).default(2),
    DATABASE_POOL_MAX: eg.integer().min(1).max(100).default(10),

    // Auth
    JWT_SECRET: eg.string().minLength(32).sensitive(),
    JWT_EXPIRES_IN: eg.string().default("7d").describe("e.g. 60, 2d, 10h, 7d"),

    // External APIs
    STRIPE_SECRET_KEY: eg.string().sensitive().requiredIf((raw) => raw.NODE_ENV === "production"),
    STRIPE_WEBHOOK_SECRET: eg.string().sensitive().optional(),

    // Feature flags
    FEATURE_NEW_DASHBOARD: eg.boolean().default(false),
    RATE_LIMIT_RPM: eg.integer().min(10).max(10000).default(100),

    // Logging
    LOG_LEVEL: eg.enum(["debug", "info", "warn", "error"] as const).default("info"),
    LOG_FORMAT: eg.enum(["json", "pretty"] as const).default("json"),
  },
  profiles: {
    development: { LOG_LEVEL: "debug", LOG_FORMAT: "pretty", DATABASE_POOL_MIN: "1" },
    test:        { LOG_LEVEL: "error", DATABASE_POOL_MAX: "2" },
  },
});

// Usage: import { env } from "./env"
// env.PORT         → number
// env.DATABASE_URL → string
// env.NODE_ENV     → "development" | "production" | "test"
```

This file is the single source of truth for all configuration. Import `env` anywhere in your app — TypeScript will catch any typos.

---

### Next.js Application

Next.js has server-side and client-side env vars. Use two separate schemas:

```typescript
// lib/env/server.ts — only imported in server components / API routes
import { createEnv, eg } from "@yedoma-labs/bylyt-env-guard";

export const serverEnv = createEnv({
  schema: {
    DATABASE_URL: eg.url().sensitive(),
    NEXTAUTH_SECRET: eg.string().minLength(32).sensitive(),
    NEXTAUTH_URL: eg.url(),
    RESEND_API_KEY: eg.string().sensitive(),
    STRIPE_SECRET_KEY: eg.string().sensitive(),
  },
  sources: [process.env],
});

// lib/env/client.ts — safe for browser bundles
import { createEnv, eg } from "@yedoma-labs/bylyt-env-guard";

export const clientEnv = createEnv({
  schema: {
    NEXT_PUBLIC_APP_URL: eg.url(),
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: eg.string(),
    NEXT_PUBLIC_POSTHOG_KEY: eg.string().optional(),
  },
  sources: [process.env],
  prefix: "NEXT_PUBLIC_",  // reads NEXT_PUBLIC_APP_URL as APP_URL etc. — optional
});
```

---

### Multi-Service Monorepo (Database + Redis + S3)

Group related variables with `eg.group()`:

```typescript
import { createEnv, eg } from "@yedoma-labs/bylyt-env-guard";

export const env = createEnv({
  schema: {
    NODE_ENV: eg.enum(["development", "production"] as const),

    // Reads DB__HOST, DB__PORT, DB__NAME, DB__USER, DB__PASSWORD
    db: eg.group({
      HOST: eg.string().default("localhost"),
      PORT: eg.port().default(5432),
      NAME: eg.string().default("myapp"),
      USER: eg.string().default("postgres"),
      PASSWORD: eg.string().sensitive(),
    }),

    // Reads REDIS__HOST, REDIS__PORT, REDIS__PASSWORD
    redis: eg.group({
      HOST: eg.string().default("localhost"),
      PORT: eg.port().default(6379),
      PASSWORD: eg.string().sensitive().optional(),
    }),

    // Reads S3__BUCKET, S3__REGION, S3__ACCESS_KEY_ID, S3__SECRET_ACCESS_KEY
    s3: eg.group({
      BUCKET: eg.string(),
      REGION: eg.string().default("eu-central-1"),
      ACCESS_KEY_ID: eg.string().sensitive(),
      SECRET_ACCESS_KEY: eg.string().sensitive(),
    }),
  },
});

// env.db.HOST     → string
// env.db.PORT     → number
// env.redis.HOST  → string
// env.s3.BUCKET   → string
```

Your `.env` file for this schema:

```env
DB__HOST=localhost
DB__PORT=5432
DB__NAME=myapp
DB__USER=postgres
DB__PASSWORD=supersecret

REDIS__HOST=localhost
REDIS__PORT=6379

S3__BUCKET=my-bucket
S3__REGION=eu-central-1
S3__ACCESS_KEY_ID=AKIA...
S3__SECRET_ACCESS_KEY=secret
```

---

### Multiple Server Instances (Array of Objects)

When you have a dynamic list of servers or upstreams:

```typescript
import { createEnv, eg } from "@yedoma-labs/bylyt-env-guard";

export const env = createEnv({
  schema: {
    // Reads UPSTREAM_0_HOST, UPSTREAM_0_PORT, UPSTREAM_1_HOST, UPSTREAM_1_PORT, ...
    upstreams: eg.arrayOfGroups({
      HOST: eg.string(),
      PORT: eg.port(),
      WEIGHT: eg.integer().min(1).max(100).default(1),
    }),
  },
  sources: [{
    UPSTREAM_0_HOST: "server1.internal",
    UPSTREAM_0_PORT: "8080",
    UPSTREAM_1_HOST: "server2.internal",
    UPSTREAM_1_PORT: "8081",
    UPSTREAM_1_WEIGHT: "2",
  }],
});

// env.upstreams → [
//   { HOST: "server1.internal", PORT: 8080, WEIGHT: 1 },
//   { HOST: "server2.internal", PORT: 8081, WEIGHT: 2 },
// ]
```

---

### Capturing Dynamic Keys (`eg.record`)

Capture all env vars matching a pattern — useful for HTTP headers, feature flags, or plugin configs:

```typescript
import { createEnv, eg } from "@yedoma-labs/bylyt-env-guard";

export const env = createEnv({
  schema: {
    PORT: eg.port().default(3000),

    // Captures HTTP_HEADER_ACCEPT, HTTP_HEADER_X_API_VERSION, etc.
    // Returns { ACCEPT: "json", X_API_VERSION: "v2" } (prefix stripped)
    defaultHeaders: eg.record("HTTP_HEADER_"),

    // Captures all FEATURE_* vars as-is
    features: eg.record(/^FEATURE_/),
  },
  sources: [{
    PORT: "3000",
    HTTP_HEADER_ACCEPT: "application/json",
    HTTP_HEADER_X_API_VERSION: "v2",
    FEATURE_DARK_MODE: "true",
    FEATURE_BETA_DASHBOARD: "false",
  }],
});

// env.defaultHeaders → { ACCEPT: "application/json", X_API_VERSION: "v2" }
// env.features       → { FEATURE_DARK_MODE: "true", FEATURE_BETA_DASHBOARD: "false" }
```

---

### Conditional Required Fields

Some fields only make sense depending on other settings:

```typescript
import { createEnv, eg } from "@yedoma-labs/bylyt-env-guard";

export const env = createEnv({
  schema: {
    QUEUE_BACKEND: eg.enum(["memory", "redis", "sqs"] as const).default("memory"),

    // Only required when QUEUE_BACKEND=redis
    REDIS_URL: eg.url()
      .sensitive()
      .requiredIf((raw) => raw.QUEUE_BACKEND === "redis"),

    // Only required when QUEUE_BACKEND=sqs
    AWS_SQS_QUEUE_URL: eg.url()
      .requiredIf((raw) => raw.QUEUE_BACKEND === "sqs"),
    AWS_ACCESS_KEY_ID: eg.string()
      .sensitive()
      .requiredIf((raw) => raw.QUEUE_BACKEND === "sqs"),
    AWS_SECRET_ACCESS_KEY: eg.string()
      .sensitive()
      .requiredIf((raw) => raw.QUEUE_BACKEND === "sqs"),
  },
});
```

---

### Environment Profiles

Provide sensible defaults per environment without `.env` file duplication:

```typescript
import { createEnv, eg } from "@yedoma-labs/bylyt-env-guard";

export const env = createEnv({
  schema: {
    LOG_LEVEL: eg.enum(["debug", "info", "warn", "error"] as const),
    DB_POOL_SIZE: eg.integer().min(1).max(50),
    CACHE_TTL_SECONDS: eg.integer().min(0),
    ENABLE_QUERY_LOGGING: eg.boolean(),
  },
  profiles: {
    development: {
      LOG_LEVEL: "debug",
      DB_POOL_SIZE: "2",
      CACHE_TTL_SECONDS: "0",
      ENABLE_QUERY_LOGGING: "true",
    },
    production: {
      LOG_LEVEL: "warn",
      DB_POOL_SIZE: "20",
      CACHE_TTL_SECONDS: "300",
      ENABLE_QUERY_LOGGING: "false",
    },
    test: {
      LOG_LEVEL: "error",
      DB_POOL_SIZE: "1",
      CACHE_TTL_SECONDS: "0",
      ENABLE_QUERY_LOGGING: "false",
    },
  },
  // Reads NODE_ENV automatically; can be overridden with activeProfile: "production"
});
```

Values from actual env vars always override profile defaults.

---

### Watch Mode (Hot Reload)

Re-validate and reload config when `.env` files change — ideal for long-running services:

```typescript
import { watchEnv, eg } from "@yedoma-labs/bylyt-env-guard";

const handle = watchEnv(
  {
    schema: {
      LOG_LEVEL: eg.enum(["debug", "info", "warn", "error"] as const).default("info"),
      FEATURE_FLAG_X: eg.boolean().default(false),
    },
    sources: [".env", ".env.local"],
  },
  ({ env, error }) => {
    if (error) {
      console.error("Config reload failed:", error.message);
      return; // keep running with last valid config
    }
    // Apply new config — env is fully typed
    updateLogLevel(env.LOG_LEVEL);
    console.log("Config reloaded:", { LOG_LEVEL: env.LOG_LEVEL });
  },
);

// Later, e.g. on SIGTERM:
process.on("SIGTERM", () => {
  handle.stop();
  process.exit(0);
});
```

---

### Generate `.env.example`

Auto-generate a `.env.example` file from your schema — always in sync with the code:

```typescript
import { generateEnvExample, eg } from "@yedoma-labs/bylyt-env-guard";

const schema = {
  NODE_ENV: eg.enum(["development", "production"] as const)
    .describe("Application environment"),
  PORT: eg.port().default(3000)
    .describe("HTTP port")
    .example(8080),
  DATABASE_URL: eg.url().sensitive()
    .describe("PostgreSQL connection string")
    .example("postgres://user:pass@localhost:5432/mydb"),
  API_KEY: eg.string().minLength(32).sensitive()
    .describe("Third-party API key"),
};

console.log(generateEnvExample(schema));
```

Output:
```env
# NODE_ENV
# Type: enum | Required
# Constraints: values: development, production
# Application environment
NODE_ENV=

# PORT
# Type: port | Optional
# Default: 3000
# HTTP port
PORT=8080

# DATABASE_URL
# Type: url | Optional | Sensitive
# PostgreSQL connection string
DATABASE_URL=postgres://user:pass@localhost:5432/mydb

# API_KEY
# Type: string | Required | Sensitive
# Constraints: minLength: 32
# Third-party API key
API_KEY=
```

Add a build script to keep it updated:
```json
// package.json
{
  "scripts": {
    "gen:env": "tsx scripts/gen-env-example.ts"
  }
}
```

---

### Generate Markdown Docs

Generate a markdown reference table for your README or internal docs:

```typescript
import { generateMarkdownDocs, eg } from "@yedoma-labs/bylyt-env-guard";

const schema = {
  PORT: eg.port().default(3000).describe("HTTP port"),
  DATABASE_URL: eg.url().sensitive().describe("PostgreSQL connection URL"),
  LOG_LEVEL: eg.enum(["debug", "info", "warn", "error"] as const).default("info"),
  API_KEY: eg.string().minLength(32).sensitive().describe("Third-party API key"),
};

console.log(generateMarkdownDocs(schema, { title: "Configuration Reference" }));
```

Output:
```markdown
## Configuration Reference

| Variable | Type | Required | Default | Constraints | Description |
| --- | --- | --- | --- | --- | --- |
| `PORT` | port | — | `3000` | min: 1, max: 65535 | HTTP port |
| `DATABASE_URL` | url | ✅ | — | — | PostgreSQL connection URL |
| `LOG_LEVEL` | enum | — | `info` | `debug`, `info`, `warn`, `error` | — |
| `API_KEY` | string | ✅ | — | minLen: 32 | Third-party API key |
```

---

### Custom Validation & Transforms

```typescript
import { createEnv, eg } from "@yedoma-labs/bylyt-env-guard";

export const env = createEnv({
  schema: {
    // Custom validator
    CRON_EXPRESSION: eg.string()
      .validate((val) => {
        const parts = val.trim().split(/\s+/);
        return parts.length === 5 ? null : "must be a valid 5-part cron expression (e.g. '0 * * * *')";
      }),

    // Transform: parse comma-separated allowed origins into a Set
    CORS_ORIGINS: eg.array()
      .separator(",")
      .transform((origins) => new Set(origins)),

    // Transform: uppercase the region
    AWS_REGION: eg.string()
      .default("eu-central-1")
      .transform((r) => r.toLowerCase()),

    // JSON field with typed result
    RATE_LIMIT_CONFIG: eg.json<{ windowMs: number; max: number }>()
      .optional(),
  },
});

// env.CORS_ORIGINS        → Set<string>
// env.RATE_LIMIT_CONFIG   → { windowMs: number; max: number } | undefined
```

---

### Layered Sources

Sources are merged left to right — later sources win:

```typescript
import { createEnv, eg } from "@yedoma-labs/bylyt-env-guard";

export const env = createEnv({
  schema: {
    DATABASE_URL: eg.url(),
    PORT: eg.port().default(3000),
  },
  sources: [
    ".env",            // base config (committed defaults)
    ".env.local",      // local overrides (gitignored)
    ".env.production", // production overrides (loaded via CI)
    process.env,       // runtime env vars win over everything
  ],
});
```

---

### Error Handling

```typescript
import { createEnv, EnvValidationError, eg } from "@yedoma-labs/bylyt-env-guard";

try {
  const env = createEnv({ schema: { /* ... */ } });
} catch (err) {
  if (err instanceof EnvValidationError) {
    // failures is an array — ALL errors reported at once
    for (const failure of err.failures) {
      console.error(`${failure.field}: ${failure.message} [${failure.code}]`);
    }
    // failure.code is one of: MISSING | INVALID_TYPE | INVALID_URL | INVALID_EMAIL |
    // INVALID_ENUM | INVALID_JSON | INVALID_DATE | INVALID_PROTOCOL |
    // MIN_VALUE | MAX_VALUE | MIN_LENGTH | MAX_LENGTH | PATTERN | CUSTOM
    process.exit(1);
  }
  throw err;
}
```

Console output when validation fails:
```
❌ Environment validation failed:

  • DATABASE_URL: is required but missing
  • PORT: must be at most 65535 (got: 99999)
  • API_KEY: must be at least 32 characters (got: ***)
```

---

## Schema Types Reference

| Builder | Returns | Description |
|---|---|---|
| `eg.string()` | `string` | Any string value |
| `eg.number()` | `number` | Parsed via `Number()`, rejects `Infinity` |
| `eg.integer()` | `number` | Integer only — rejects decimals and `Infinity` |
| `eg.boolean()` | `boolean` | `true/1/yes/on` → `true`, `false/0/no/off` → `false` |
| `eg.enum([...])` | union type | Must be one of the specified string values |
| `eg.url()` | `string` | Validated via `new URL()` |
| `eg.port()` | `number` | Integer between 1–65535 |
| `eg.email()` | `string` | Validated email address format |
| `eg.json<T>()` | `T` (default: `unknown`) | Parses JSON string |
| `eg.date()` | `Date` | Parses date string to `Date` object |
| `eg.array()` | `string[]` | Split by separator (default: `,`) |
| `eg.group({...})` | `object` | Reads `KEY__SUBKEY` env vars as nested object |
| `eg.arrayOfGroups({...})` | `object[]` | Reads `KEY_0_SUBKEY`, `KEY_1_SUBKEY`, … as array |
| `eg.record("PREFIX_")` | `Record<string, string>` | Captures all matching env vars |

## Field Modifiers Reference

### Universal (all types)
| Method | Description |
|---|---|
| `.required()` | Mark field as required (default) |
| `.optional()` | Allow `undefined` value |
| `.default(value)` | Static default; implies optional |
| `.default(() => value)` | Factory default, evaluated at startup |
| `.sensitive()` | Mask value in error messages |
| `.aliases("OTHER_NAME")` | Fallback env var names |
| `.describe("text")` | Description for docs/example generation |
| `.example(value)` | Example value for `.env.example` |
| `.validate(fn)` | Custom validator — return `null` on pass, error string on fail |
| `.transform(fn)` | Transform value after validation |
| `.deprecated("msg")` | Log warning when variable is set |
| `.requiredIf(fn)` | Conditionally required based on other raw values |

### Type-specific
| Method | Types | Description |
|---|---|---|
| `.min(n)` | `number`, `integer` | Minimum value |
| `.max(n)` | `number`, `integer` | Maximum value |
| `.minLength(n)` | `string`, `email`, `array` | Min length / min item count |
| `.maxLength(n)` | `string`, `email`, `array` | Max length / max item count |
| `.pattern(re)` | `string` | Must match regex |
| `.protocols("https", "wss")` | `url` | Restrict allowed URL protocols |
| `.caseInsensitive()` | `enum` | Case-insensitive value matching |
| `.separator(str)` | `array` | Item separator (default: `,`) |
| `.of("number")` | `array` | Typed array items: `"string"` \| `"number"` \| `"integer"` \| `"boolean"` |

## `createEnv` Options

```typescript
createEnv({
  schema: { ... },              // required
  sources: [...],               // default: [process.env]
  prefix: "APP_",               // strip prefix from all schema keys
  strict: true,                 // warn on unknown prefixed vars
  profiles: { dev: { ... } },   // per-environment defaults
  activeProfile: "production",  // default: process.env.NODE_ENV
})
```

## Contributing

### Prerequisites

- [Bun](https://bun.sh/) v1.1+
- Node.js 20 or 22

### Setup

```bash
git clone https://github.com/yedoma-labs/bylyt-env-guard.git
cd bylyt-env-guard
bun install
```

### Development Commands

```bash
# Run tests
bun run test

# Run tests in watch mode
bun run test:watch

# Run tests with coverage
bun run test:coverage

# Type-check without emitting
bun run typecheck

# Lint & format check
bun run lint

# Auto-fix lint & format issues
bun run lint:fix

# Build (ESM + CJS + type declarations)
bun run build
```

### Project Structure

```
src/
├── schema/          # Schema builder, types, validators
├── core/            # Env parser, source resolver, validation orchestrator
├── errors/          # Structured error types
└── utils/           # String coercion, .env file parser
tests/
├── schema/          # Unit tests for schema layer
├── core/            # Unit tests for core layer
├── errors/          # Unit tests for error formatting
├── utils/           # Unit tests for coercion & dotenv parser
└── integration/     # End-to-end tests
```

### Build Output

`bun run build` produces the following in `dist/`:

| File | Format | Purpose |
|---|---|---|
| `index.js` | ESM | Modern `import` usage |
| `index.cjs` | CJS | Legacy `require()` usage |
| `index.d.ts` | TypeScript | Type declarations (ESM) |
| `index.d.cts` | TypeScript | Type declarations (CJS) |
| `*.map` | Sourcemap | Debugging |

### Release

Releases are automated via GitHub Actions. To publish a new version:

```bash
bun version patch   # or minor / major
git push --follow-tags
```

The `release.yml` workflow publishes to npm when a `v*` tag is pushed.

## License

MIT
