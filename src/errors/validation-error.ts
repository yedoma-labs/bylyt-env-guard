import type { ValidationFailure } from "../schema/validators.js";

export class EnvValidationError extends Error {
	readonly failures: readonly ValidationFailure[];

	constructor(failures: ValidationFailure[]) {
		const message = formatFailures(failures);
		super(message);
		this.name = "EnvValidationError";
		this.failures = failures;
	}
}

function formatFailures(failures: ValidationFailure[]): string {
	const lines = ["", "❌ Environment validation failed:", ""];
	for (const f of failures) {
		const valueHint = f.value !== undefined ? ` (got: ${f.value})` : "";
		lines.push(`  • ${f.field}: ${f.message}${valueHint}`);
	}
	lines.push("");
	return lines.join("\n");
}
