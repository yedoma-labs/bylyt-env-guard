# @yedoma-labs/bylyt-env-guard

[![CI](https://github.com/yedoma-labs/bylyt-env-guard/actions/workflows/ci.yml/badge.svg)](https://github.com/yedoma-labs/bylyt-env-guard/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@yedoma-labs/bylyt-env-guard)](https://www.npmjs.com/package/@yedoma-labs/bylyt-env-guard)
[![npm downloads](https://img.shields.io/npm/dm/@yedoma-labs/bylyt-env-guard)](https://www.npmjs.com/package/@yedoma-labs/bylyt-env-guard)

Type-safe, zero-dependency environment variable validation for Node.js. Fail fast with clear error messages.

## Features

- 🔒 **Type-safe** - Full TypeScript inference from schema definition
- 📦 **Zero dependencies** - Built-in `.env` parser, no `dotenv` needed
- 💥 **Fail-fast** - Throws all validation errors at once on startup
- 🎭 **Sensitive masking** - Mark secrets to hide values in error output
- 🔄 **Auto-coercion** - Strings to numbers, booleans, arrays automatically
- 📁 **Multi-source** - `.env` files + `process.env` with configurable priority
- 🌍 **Environment profiles** - Profile-based defaults (dev, test, prod)
- 🏗️ **Nested variables** - Group related vars with `eg.group()`
- 📊 **Array of objects** - Read indexed vars like `DB_0_HOST`, `DB_1_HOST` as typed arrays
- 🗂️ **Record fields** - Capture all vars matching a prefix/pattern
- 🏷️ **Prefix support** - Strip common prefixes like `APP_` or `NEXT_PUBLIC_`
- 🔍 **Strict mode** - Warn about unknown environment variables
- 📝 **Generate .env.example** - Auto-generate example files from schema
- 📄 **Markdown docs** - Generate documentation tables from schema
- 👀 **Watch mode** - Re-validate automatically when .env files change
- ❓ **Conditional required** - Make fields required based on other fields
- 🔐 **Immutable result** - Returned env object is deeply frozen

## Install

```bash
npm install @yedoma-labs/bylyt-env-guard
# or
bun add @yedoma-labs/bylyt-env-guard
# or
pnpm add @yedoma-labs/bylyt-env-guard
```

## Usage

```typescript
import { createEnv, eg } from "@yedoma-labs/bylyt-env-guard";

const env = createEnv({
  schema: {
    NODE_ENV: eg.enum(["development", "staging", "production"]),
    PORT: eg.port().default(3000),
    DATABASE_URL: eg.url().required(),
    API_KEY: eg.string().minLength(16).sensitive(),
    DEBUG: eg.boolean().default(false),
    ALLOWED_ORIGINS: eg.array().separator(",").optional(),
    RETRY_COUNT: eg.number().min(0).max(10).default(3),
  },
});

// `env` is fully typed:
// {
//   NODE_ENV: "development" | "staging" | "production"
//   PORT: number
//   DATABASE_URL: string
//   API_KEY: string
//   DEBUG: boolean
//   ALLOWED_ORIGINS: string[] | undefined
//   RETRY_COUNT: number
// }
```

## Schema Types

| Builder | Coerces to | Description |
|---|---|---|
| `eg.string()` | `string` | Any string value |
| `eg.number()` | `number` | Parsed via `Number()` |
| `eg.integer()` | `number` | Integer value |
| `eg.boolean()` | `boolean` | `true/1/yes/on` → `true`, `false/0/no/off` → `false` |
| `eg.enum([...])` | union type | Must be one of the specified values |
| `eg.url()` | `string` | Validated via `new URL()` |
| `eg.port()` | `number` | Integer between 1–65535 |
| `eg.email()` | `string` | Validated email address |
| `eg.json()` | `T` | Parsed JSON with type inference |
| `eg.date()` | `Date` | Parsed date string |
| `eg.array()` | `string[]` | Split by separator (default: `,`) |
| `eg.group({...})` | `object` | Nested group of fields |
| `eg.arrayOfGroups({...})` | `object[]` | Indexed array of nested objects |
| `eg.record(prefix)` | `Record<string, string>` | Capture all vars matching a prefix or pattern |

## Field Modifiers

```typescript
// Status & defaults
eg.string().required()              // Required (default)
eg.string().optional()              // May be undefined
eg.string().default("val")          // Default value, implies optional
eg.string().default(() => "val")    // Default factory function
eg.string().sensitive()             // Mask value in error output

// Documentation
eg.string().describe("API key")     // Description for .env.example
eg.string().example("sk_live_123")  // Example value for docs

// Aliases & deprecation
eg.string().aliases("OLD_NAME")     // Alternative env var names
eg.string().deprecated("use X")     // Mark as deprecated with message

// Conditional
eg.url().requiredIf((raw) => raw.USE_DB === "true") // Conditionally required

// Custom logic
eg.string().validate((v) => v.startsWith("sk_") ? null : "must start with sk_")
eg.string().transform((v) => v.toUpperCase())

// String-specific
eg.string().minLength(3)
eg.string().maxLength(100)
eg.string().pattern(/^[A-Z]+$/)

// Number-specific
eg.number().min(0)
eg.number().max(100)

// Array-specific
eg.array().separator("|")
eg.array().of("number")           // Typed array items
eg.array().minLength(1)           // Min items
eg.array().maxLength(10)          // Max items

// URL-specific
eg.url().protocols("https", "wss")

// Enum-specific
eg.enum([...]).caseInsensitive()
```

## Custom Sources

By default, `env-guard` reads from `process.env`. Override with custom sources - later sources take priority:

```typescript
const env = createEnv({
  schema: { /* ... */ },
  sources: [
    ".env",              // .env file (silently skipped if missing)
    ".env.local",        // local overrides
    process.env,         // process.env wins
  ],
});
```

## Error Output

When validation fails, all errors are reported at once:

```
❌ Environment validation failed:

  • DATABASE_URL: is required but missing
  • PORT: must be at least 1 (got: 0)
  • API_KEY: must be at least 16 characters (got: ***)
```

## Environment Profiles

Define profile-based defaults for different environments:

```typescript
const env = createEnv({
  schema: {
    LOG_LEVEL: eg.enum(["debug", "info", "warn", "error"]),
    DATABASE_URL: eg.url(),
  },
  profiles: {
    development: {
      LOG_LEVEL: "debug",
      DATABASE_URL: "postgres://localhost/myapp_dev",
    },
    test: {
      LOG_LEVEL: "warn",
      DATABASE_URL: "postgres://localhost/myapp_test",
    },
    production: {
      LOG_LEVEL: "error",
    },
  },
  activeProfile: "development", // Or omit to use process.env.NODE_ENV
});
```

Profiles have the **lowest priority** — any value in `sources` will override the profile default.

## Nested Variables with Groups

Group related environment variables with `eg.group()`:

```typescript
const env = createEnv({
  schema: {
    db: eg.group({
      HOST: eg.string().default("localhost"),
      PORT: eg.port().default(5432),
      NAME: eg.string(),
      USER: eg.string(),
      PASSWORD: eg.string().sensitive(),
    }),
    redis: eg.group(
      {
        HOST: eg.string(),
        PORT: eg.port(),
      },
      { separator: "_" }, // Custom separator (default: "__")
    ),
  },
  sources: [{
    DB__HOST: "mydb.example.com",
    DB__PORT: "5433",
    DB__NAME: "production",
    DB__USER: "admin",
    DB__PASSWORD: "secret",
    REDIS_HOST: "cache.example.com",
    REDIS_PORT: "6379",
  }],
});

// Fully typed nested access:
env.db.HOST       // "mydb.example.com"
env.db.PORT       // 5433
env.redis.HOST    // "cache.example.com"
```

Group fields use the pattern `{GROUP_NAME}{SEPARATOR}{FIELD_NAME}` in environment variables.

## Array of Objects

Read indexed environment variables as an array of typed objects with `eg.arrayOfGroups()`:

```typescript
const env = createEnv({
  schema: {
    servers: eg.arrayOfGroups({
      HOST: eg.string(),
      PORT: eg.port(),
      MAX_CONNECTIONS: eg.integer().default(100),
    }),
  },
  sources: [{
    SERVERS_0_HOST: "api1.example.com",
    SERVERS_0_PORT: "8080",
    SERVERS_1_HOST: "api2.example.com",
    SERVERS_1_PORT: "8081",
    SERVERS_1_MAX_CONNECTIONS: "200",
    SERVERS_2_HOST: "api3.example.com",
    SERVERS_2_PORT: "8082",
  }],
});

// env.servers is typed as:
// Array<{ HOST: string; PORT: number; MAX_CONNECTIONS: number }>

env.servers[0].HOST        // "api1.example.com"
env.servers[1].PORT        // 8081
env.servers[2].MAX_CONNECTIONS  // 100 (default)
```

The pattern is `{FIELD_NAME}_{INDEX}_{SUBFIELD_NAME}`. Parsing stops when no subfields exist for the next index.

**Custom separator:**

```typescript
eg.arrayOfGroups(
  { HOST: eg.string(), PORT: eg.port() },
  { separator: "__" },
)
// Reads: SERVERS__0__HOST, SERVERS__0__PORT, etc.
```

**Note:** `arrayOfGroups` defaults to a single underscore `_` separator, unlike `group` which defaults to double underscore `__`.

## Record Fields

Capture all environment variables matching a prefix or pattern as a `Record<string, string>`:

```typescript
const env = createEnv({
  schema: {
    headers: eg.record("HTTP_HEADER_"),
    flags: eg.record(/^FEATURE_FLAG_/),
  },
  sources: [{
    HTTP_HEADER_ACCEPT: "application/json",
    HTTP_HEADER_AUTHORIZATION: "Bearer token123",
    HTTP_HEADER_USER_AGENT: "MyApp/1.0",
    FEATURE_FLAG_NEW_UI: "true",
    FEATURE_FLAG_BETA_API: "false",
    OTHER_VAR: "ignored",
  }],
});

// Prefix is stripped from keys in the result:
env.headers  // { ACCEPT: "application/json", AUTHORIZATION: "Bearer token123", USER_AGENT: "MyApp/1.0" }

// Regex pattern: keys are not modified
env.flags    // { FEATURE_FLAG_NEW_UI: "true", FEATURE_FLAG_BETA_API: "false" }
```

**Variants:**

- `eg.record("PREFIX_")` — Matches vars starting with prefix, strips prefix from keys
- `eg.record(/pattern/)` — Matches vars matching regex, keeps full keys
- `eg.record()` — Captures all vars (usually not useful)

## Watch Mode

Watch `.env` file sources for changes and re-validate automatically:

```typescript
import { watchEnv, eg } from "@yedoma-labs/bylyt-env-guard";

const handle = watchEnv(
  {
    schema: {
      PORT: eg.port().default(3000),
      DATABASE_URL: eg.url(),
    },
    sources: [".env", ".env.local"],
  },
  (update) => {
    if (update.error) {
      console.error("Validation failed:", update.error.failures);
    } else {
      console.log("Env updated:", update.env);
      // Restart server, update config, etc.
    }
  },
);

// Stop watching when done
handle.stop();
```

**Options:**

- `debounceMs` — Delay before re-evaluating after file change (default: `100`ms)
- All `createEnv` options: `prefix`, `strict`, `profiles`, `activeProfile`

**Callback signature:**

```typescript
type WatchCallback<T> = (update:
  | { env: Readonly<InferEnv<T>>; error: null }
  | { env: null; error: EnvValidationError }
) => void;
```

The callback is invoked **immediately** with the initial state, then again whenever watched files change.

**Note:** Only file sources (string paths) are watched. Object sources and `process.env` are not monitored.

## Generate Markdown Docs

Generate a Markdown table documenting your environment schema:

```typescript
import { generateMarkdownDocs, eg } from "@yedoma-labs/bylyt-env-guard";
import { writeFileSync } from "fs";

const schema = {
  NODE_ENV: eg.enum(["development", "production"] as const).default("development"),
  PORT: eg.port().default(3000).describe("HTTP server port"),
  DATABASE_URL: eg.url().protocols("postgres").describe("PostgreSQL connection string"),
  WORKERS: eg.integer().min(1).max(16).default(4),
  DEBUG: eg.boolean().default(false),
};

const markdown = generateMarkdownDocs(schema, {
  title: "Configuration Reference",
  includeConstraints: true,
});

writeFileSync("docs/config.md", markdown);
```

Produces:

```markdown
## Configuration Reference

| Variable | Type | Required | Default | Constraints | Description |
| --- | --- | --- | --- | --- | --- |
| `NODE_ENV` | enum | — | `development` | `development`, `production` | — |
| `PORT` | port | — | `3000` | min: 1, max: 65535 | HTTP server port |
| `DATABASE_URL` | url | ✅ | — | protocols: postgres | PostgreSQL connection string |
| `WORKERS` | integer | — | `4` | min: 1, max: 16 | — |
| `DEBUG` | boolean | — | `false` | — | — |
```

**Options:**

- `title` — Heading text (default: `"Environment Variables"`)
- `includeConstraints` — Show constraints column (default: `true`)

**Group expansion:**

Group and `arrayOfGroups` fields are automatically expanded:

```typescript
const schema = {
  db: eg.group({ HOST: eg.string(), PORT: eg.port() }),
  servers: eg.arrayOfGroups({ HOST: eg.string() }),
};

// Generates rows for:
// DB__HOST, DB__PORT, SERVERS_N_HOST (N = index placeholder)
```

## Prefix Support

Strip a common prefix from all environment variables:

```typescript
const env = createEnv({
  schema: {
    PORT: eg.port(),
    API_KEY: eg.string(),
  },
  sources: [{
    APP_PORT: "3000",
    APP_API_KEY: "secret",
  }],
  prefix: "APP_",
});

env.PORT     // 3000 (read from APP_PORT)
env.API_KEY  // "secret" (read from APP_API_KEY)
```

Useful for frameworks like Next.js (`NEXT_PUBLIC_`) or scoping variables to your app.

## Strict Mode

Warn about unknown environment variables when a prefix is set:

```typescript
const env = createEnv({
  schema: { PORT: eg.port() },
  sources: [{ APP_PORT: "3000", APP_UNKNOWN: "value" }],
  prefix: "APP_",
  strict: true,
});
// Console warning: [env-guard] Unknown environment variable: "APP_UNKNOWN"
```

Helps catch typos and unused variables.

## Generate .env.example

Auto-generate documentation from your schema:

```typescript
import { generateEnvExample, eg } from "@yedoma-labs/bylyt-env-guard";
import { writeFileSync } from "fs";

const schema = {
  NODE_ENV: eg.enum(["development", "production"]).default("development"),
  PORT: eg.port().default(3000).describe("HTTP server port"),
  API_KEY: eg.string().sensitive().describe("Third-party API key").example("sk_live_abc123"),
  DATABASE_URL: eg.url().protocols("postgres", "postgresql"),
};

const example = generateEnvExample(schema);
writeFileSync(".env.example", example);
```

Produces:

```bash
# NODE_ENV
# Type: enum | Optional
# Default: development
# Constraints: values: development, production
NODE_ENV=development

# PORT
# Type: port | Optional
# Default: 3000
# Constraints: min: 1 | max: 65535
# HTTP server port
PORT=3000

# API_KEY
# Type: string | Required | Sensitive
# Third-party API key
API_KEY=sk_live_abc123

# DATABASE_URL
# Type: url | Required
# Constraints: protocols: postgres, postgresql
DATABASE_URL=
```

## Conditional Required Fields

Make fields required only when certain conditions are met:

```typescript
const env = createEnv({
  schema: {
    USE_EXTERNAL_API: eg.boolean().default(false),
    EXTERNAL_API_KEY: eg
      .string()
      .requiredIf((raw) => raw.USE_EXTERNAL_API === "true"),
    EXTERNAL_API_URL: eg
      .url()
      .requiredIf((raw) => raw.USE_EXTERNAL_API === "true"),
  },
});
```

If `USE_EXTERNAL_API=true`, both `EXTERNAL_API_KEY` and `EXTERNAL_API_URL` become required.

## Error Handling

```typescript
import { createEnv, eg, EnvValidationError } from "@yedoma-labs/bylyt-env-guard";

try {
  const env = createEnv({ schema: { /* ... */ } });
} catch (err) {
  if (err instanceof EnvValidationError) {
    console.error(err.failures); // ValidationFailure[]
  }
}
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
