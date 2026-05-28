# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.3.x   | :white_check_mark: |
| < 0.3   | :x:                |

## Security Model

`@yedoma-labs/bylyt-env-guard` is a **developer tool** for environment variable validation at application startup. The security model assumes:

- **Schema definitions** are written by trusted developers (not user input)
- **Environment variables** may come from untrusted `.env` files or external sources
- **Validation runs at startup** or on file changes in watch mode (not per-request)

## Security Features

### ✅ Implemented Protections

1. **Prototype Pollution Prevention**
   - Blocks `__proto__`, `constructor`, `prototype` keys in `.env` files
   - Uses `Object.create(null)` for merged environment objects
   - Prevents pollution of `Object.prototype` via malicious env files

2. **JSON Bomb Protection**
   - 1MB size limit on JSON field values
   - 50-level depth limit to prevent stack overflow
   - Rejects deeply nested or exponentially expanding JSON structures

3. **Integer Precision Protection**
   - Rejects integers beyond `Number.MAX_SAFE_INTEGER` (±2^53-1)
   - Prevents silent precision loss bypassing `min`/`max` constraints
   - Ensures numeric constraints work correctly for large values

4. **Timing Attack Mitigation**
   - Constant-time comparison for sensitive enum values
   - Prevents leaking enum values via timing side channels
   - Uses bitwise operations to avoid short-circuit evaluation

5. **Resource Exhaustion Protection**
   - MAX_MULTILINE_LINES (100) limit in dotenv parser
   - Prevents memory exhaustion via unclosed quotes consuming entire file
   - MAX_INDEX (100) limit for `arrayOfGroups` fields

6. **Deep Freeze Protection**
   - Circular reference tracking via `WeakSet`
   - Prevents stack overflow when freezing JSON with cycles
   - Returns immutable, deeply frozen config objects

7. **Error Safety in Watch Mode**
   - All errors caught and wrapped in `EnvValidationError`
   - Non-validation exceptions don't crash process
   - File watch failures logged with warning

8. **Array Separator Validation**
   - Rejects empty string separators
   - Warns on whitespace-only separators
   - Prevents unexpected parsing behavior

## Known Limitations

### ⚠️ Not Protected Against

1. **Transform Function Resource Exhaustion**
   - User-supplied `.transform()` functions run without timeout
   - Infinite loops or expensive operations will hang validation
   - **Mitigation:** Keep transforms pure, fast (<10ms), and thoroughly tested

2. **Default Factory Side Effects**
   - Factory functions (`.default(() => ...)`) execute on every validation
   - In watch mode, called on every file change
   - **Mitigation:** Use only pure, idempotent factories with no I/O

3. **User-Supplied Regex ReDoS**
   - `.pattern()` accepts arbitrary regex without validation
   - Catastrophic backtracking patterns can cause DoS
   - **Mitigation:** Test regex patterns thoroughly, avoid nested quantifiers

4. **TOCTOU in Watch Mode**
   - File can be modified between watch event and read operation
   - 100ms debounce window allows race conditions
   - **Mitigation:** Only acceptable risk in developer workflows, not production

5. **Path Traversal in File Sources**
   - `sources: ["../../etc/passwd"]` reads arbitrary files
   - **Not a vulnerability:** Sources array is developer-controlled code
   - **Mitigation:** Never construct sources from user input

## Reporting Vulnerabilities

If you discover a security vulnerability in `@yedoma-labs/bylyt-env-guard`, please email:

**security@yedoma-labs.com**

Please include:

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We aim to respond within 48 hours and will coordinate disclosure.

## Security Best Practices

### For Library Users

1. **Never pass user input to schema definitions**
   ```ts
   // ❌ BAD
   const pattern = new RegExp(userInput);
   eg.string().pattern(pattern);
   
   // ✅ GOOD
   eg.string().pattern(/^[a-z0-9]+$/);
   ```

2. **Keep transform functions pure and fast**
   ```ts
   // ❌ BAD
   .transform((v) => {
     fs.readFileSync('/etc/passwd'); // side effect
     return v;
   })
   
   // ✅ GOOD
   .transform((v) => v.toUpperCase())
   ```

3. **Use `.sensitive()` for secrets**
   ```ts
   API_KEY: eg.string().minLength(32).sensitive()
   // Masks value in error messages
   ```

4. **Validate `.env` file sources**
   ```ts
   // ❌ BAD: accepts any file path
   sources: [process.env.ENV_FILE]
   
   // ✅ GOOD: validate path is relative to project
   sources: [".env", ".env.local"]
   ```

5. **Freeze config objects (automatic since v0.2.0)**
   ```ts
   const env = createEnv({ schema });
   env.PORT = 9999; // TypeError: Cannot assign to read only property
   ```

### For Library Developers

- All user-supplied data (env var values, `.env` files) is untrusted
- Schema definitions and options are trusted (developer code)
- Add size/depth/time limits for unbounded operations
- Use constant-time comparisons for sensitive data
- Test with malicious inputs (fuzzing, property-based testing)

## Dependency Security

Run `npm audit` regularly. This library has **zero runtime dependencies** to minimize supply chain risk.

## Security Changelog

### v0.3.0 (2026-05-28)
- Added JSON bomb protection (size + depth limits)
- Added integer precision protection (MAX_SAFE_INTEGER)
- Added timing-safe enum comparison for sensitive fields
- Added multiline quote DoS protection
- Added deep freeze circular reference protection
- Added prototype pollution prevention

### v0.2.0 (2026-05-28)
- Implemented deep freeze for immutable results
- Added sensitive field masking in errors

## License

MIT - See [LICENSE](LICENSE) for details.
