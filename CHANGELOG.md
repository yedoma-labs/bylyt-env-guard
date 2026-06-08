# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- Migrated from Bun to pnpm for package management
- Updated pnpm to v11.5.2 and added `packageManager` field to package.json

### Fixed
- CI/CD workflows now use pnpm v11 to match lockfile format
- Replaced `any` type with proper `EnvValidationError` type in security test

### Documentation
- Added npm, Node.js, TypeScript, and bundle size badges to README
- Reordered badges for cleaner visual hierarchy
- Added header image to documentation

## [0.3.5] - 2024-05-29

### Fixed
- Prevent git hooks installation when installed as dependency
- Suppress console.warn noise in regex safety tests

### Changed
- Remove prepare script, add manual git hooks setup to docs

### Documentation
- Updated security hints and best practices

## [0.3.4] - 2024-05-29

### Security
- Add ReDoS (Regular Expression Denial of Service) protection
- Improve transform timeout monitoring and warnings

## [0.3.3] - 2024-05-29

### Changed
- Version bump (no functional changes)

## [0.3.2] - 2024-05-29

### Security
- Add transform timeout protection to prevent hanging operations
- Fix watcher TOCTOU (Time-Of-Check Time-Of-Use) race condition

### Changed
- Migrate build system from tsup to tsdown

## [0.3.1] - 2024-05-29

### Security
- Additional protections against DoS and resource exhaustion
- Fix prototype pollution vulnerabilities
- Add deep freeze for circular reference protection
- Improve watcher error safety

### Documentation
- Add comprehensive security policy and best practices

## [0.3.0] - 2024-05-29

Initial public release with security-hardened environment validation.

### Added
- Type-safe environment variable validation
- Zero-dependency core implementation
- Support for string, number, boolean, enum, url, and email types
- Optional values with `.optional()` modifier
- Custom transformations with `.transform()`
- Default values with `.default()`
- File-based environment loading with `.env` support
- Hot-reload watching with `.watch()`
- Fail-fast validation semantics
- Comprehensive error messages
- TypeScript support with full type inference
- Security hardening against common vulnerabilities

[Unreleased]: https://github.com/yedoma-labs/bylyt-env-guard/compare/v0.3.5...HEAD
[0.3.5]: https://github.com/yedoma-labs/bylyt-env-guard/compare/v0.3.4...v0.3.5
[0.3.4]: https://github.com/yedoma-labs/bylyt-env-guard/compare/v0.3.3...v0.3.4
[0.3.3]: https://github.com/yedoma-labs/bylyt-env-guard/compare/v0.3.2...v0.3.3
[0.3.2]: https://github.com/yedoma-labs/bylyt-env-guard/compare/v0.3.1...v0.3.2
[0.3.1]: https://github.com/yedoma-labs/bylyt-env-guard/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/yedoma-labs/bylyt-env-guard/releases/tag/v0.3.0
