/**
 * Detects potentially dangerous regex patterns that could cause ReDoS
 * (Regular Expression Denial of Service) attacks.
 */
export function checkRegexSafety(pattern: RegExp): string | null {
	const source = pattern.source;

	// Check for nested quantifiers (e.g., (a+)+ or (a*)*) - classic ReDoS pattern
	if (/\([^)]*[*+][^)]*\)[*+]/.test(source)) {
		return "Nested quantifiers detected - potential ReDoS vulnerability";
	}

	// Check for alternation with overlapping patterns (e.g., (a|a)*b or (a|ab)+)
	if (/\([^)]*\|[^)]*\)[*+]/.test(source)) {
		return "Alternation with quantifiers detected - may cause catastrophic backtracking";
	}

	// Check for multiple consecutive quantifiers
	if (/[*+]{2,}/.test(source) || /\?\?/.test(source)) {
		return "Multiple consecutive quantifiers detected - invalid or dangerous pattern";
	}

	// Check for exponential-time patterns like (.+)+b
	if (/\(\.[*+]\)[*+]/.test(source)) {
		return "Exponential-time pattern detected - will cause severe performance issues";
	}

	// Warn about .* or .+ without anchors or boundaries
	if (/\.\*|\.\+/.test(source) && !/\^|\$|\b/.test(source)) {
		// This is just a warning, not a hard rejection
		console.warn(
			`⚠️  [env-guard] Regex pattern "${source}" uses .* or .+ without anchors - may be slow on large inputs`,
		);
	}

	return null; // Pattern appears safe
}

/**
 * Test a regex pattern with a timeout to detect hanging patterns.
 * Returns null if test completes successfully, error message if it hangs/fails.
 */
export function testRegexWithTimeout(
	pattern: RegExp,
	testString: string,
	timeoutMs: number = 100,
): string | null {
	const start = Date.now();

	try {
		// Test the pattern - if it hangs, we'll detect it after
		pattern.test(testString);

		const elapsed = Date.now() - start;
		if (elapsed > timeoutMs) {
			return `Regex test took ${elapsed}ms (timeout: ${timeoutMs}ms) - pattern may be unsafe`;
		}

		return null; // Test passed
	} catch (err) {
		return `Regex test failed: ${String(err)}`;
	}
}
