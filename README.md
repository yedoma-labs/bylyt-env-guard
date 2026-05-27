# @yedoma-labs/bylyt-env-guard

Type-safe, zero-dependency environment variable validation for Node.js. Fail fast with clear error messages.

## Features

- 🔒 **Type-safe** - Full TypeScript inference from schema definition
- 📦 **Zero dependencies** - Built-in `.env` parser, no `dotenv` needed
- 💥 **Fail-fast** - Throws all validation errors at once on startup
- 🎭 **Sensitive masking** - Mark secrets to hide values in error output
- 🔄 **Auto-coercion** - Strings to numbers, booleans, arrays automatically
- 📁 **Multi-source** - `.env` files + `process.env` with configurable priority

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
| `eg.boolean()` | `boolean` | `true/1/yes/on` → `true`, `false/0/no/off` → `false` |
| `eg.enum([...])` | union type | Must be one of the specified values |
| `eg.url()` | `string` | Validated via `new URL()` |
| `eg.port()` | `number` | Integer between 1–65535 |
| `eg.array()` | `string[]` | Split by separator (default: `,`) |

## Field Modifiers

```typescript
eg.string().required()       // Required (default)
eg.string().optional()       // May be undefined
eg.string().default("val")   // Default value, implies optional
eg.string().sensitive()      // Mask value in error output

// String-specific
eg.string().minLength(3)
eg.string().maxLength(100)
eg.string().pattern(/^[A-Z]+$/)

// Number-specific
eg.number().min(0)
eg.number().max(100)

// Array-specific
eg.array().separator("|")
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
cd env-guard
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
