import type { SchemaDefinition, SchemaFieldOptions } from "../schema/types.js";

export function generateEnvExample(schema: SchemaDefinition): string {
	const lines: string[] = [];

	for (const [key, field] of Object.entries(schema)) {
		const opts = field._options;

		// Handle array-of-groups fields
		if (opts.kind === "array-of-groups" && opts.subSchema) {
			const sep = opts.groupSeparator ?? "_";
			const envPrefix = key.toUpperCase() + sep;
			lines.push(`# ${key} (array of objects, indexed with ${sep}0${sep}, ${sep}1${sep}, ...)`);
			for (const subKey of Object.keys(opts.subSchema)) {
				const subOpts = opts.subSchema[subKey]!._options;
				lines.push(
					`${envPrefix}0${sep}${subKey}=${
						subOpts.example !== undefined
							? String(subOpts.example)
							: subOpts.defaultValue !== undefined
								? String(subOpts.defaultValue)
								: ""
					}`,
				);
			}
			lines.push(`# ${envPrefix}1${sep}... (add more items as needed)`);
			lines.push("");
			continue;
		}

		// Handle record fields
		if (opts.kind === "record") {
			const pattern = opts.recordPrefix
				? `${opts.recordPrefix}*`
				: opts.recordPattern
					? String(opts.recordPattern)
					: "*";
			lines.push(`# ${key} (captures all env vars matching: ${pattern})`);
			if (opts.description) lines.push(`# ${opts.description}`);
			if (opts.recordPrefix) {
				lines.push(`# Example: ${opts.recordPrefix}MYKEY=value`);
			}
			lines.push("");
			continue;
		}

		// Skip group fields — handled separately
		if (opts.kind === "group" && opts.subSchema) {
			const prefix = key.toUpperCase() + (opts.groupSeparator ?? "__");
			lines.push(...generateGroupLines(prefix, opts.subSchema));
			continue;
		}

		lines.push(...generateFieldLines(key, opts));
	}

	return `${lines.join("\n")}\n`;
}

function generateFieldLines(key: string, opts: SchemaFieldOptions): string[] {
	const lines: string[] = [];

	lines.push(`# ${key}`);

	// Type line
	const typeParts: string[] = [formatKind(opts)];
	if (opts.isRequired && opts.defaultValue === undefined && opts.defaultFactory === undefined) {
		typeParts.push("Required");
	} else {
		typeParts.push("Optional");
	}
	if (opts.isSensitive) typeParts.push("Sensitive");
	lines.push(`# Type: ${typeParts.join(" | ")}`);

	// Default
	if (opts.defaultValue !== undefined) {
		lines.push(`# Default: ${String(opts.defaultValue)}`);
	} else if (opts.defaultFactory !== undefined) {
		lines.push("# Default: (generated at runtime)");
	}

	// Constraints
	const constraints: string[] = [];
	if (opts.minValue !== undefined) constraints.push(`min: ${opts.minValue}`);
	if (opts.maxValue !== undefined) constraints.push(`max: ${opts.maxValue}`);
	if (opts.minLength !== undefined) constraints.push(`minLength: ${opts.minLength}`);
	if (opts.maxLength !== undefined) constraints.push(`maxLength: ${opts.maxLength}`);
	if (opts.pattern) constraints.push(`pattern: ${opts.pattern}`);
	if (opts.enumValues) constraints.push(`values: ${opts.enumValues.join(", ")}`);
	if (opts.allowedProtocols) constraints.push(`protocols: ${opts.allowedProtocols.join(", ")}`);
	if (constraints.length > 0) lines.push(`# Constraints: ${constraints.join(" | ")}`);

	// Description
	if (opts.description) lines.push(`# ${opts.description}`);

	// Example value or default value
	const exampleValue =
		opts.example !== undefined
			? String(opts.example)
			: opts.defaultValue !== undefined
				? String(opts.defaultValue)
				: "";
	lines.push(`${key}=${exampleValue}`);
	lines.push("");

	return lines;
}

function generateGroupLines(prefix: string, subSchema: SchemaDefinition): string[] {
	const lines: string[] = [];
	for (const [subKey, subField] of Object.entries(subSchema)) {
		lines.push(...generateFieldLines(`${prefix}${subKey}`, subField._options));
	}
	return lines;
}

function formatKind(opts: SchemaFieldOptions): string {
	switch (opts.kind) {
		case "enum":
			return `enum`;
		case "array":
			return opts.arrayItemKind ? `array<${opts.arrayItemKind}>` : "array";
		case "array-of-groups":
			return "array<object>";
		case "record":
			return "record";
		default:
			return opts.kind;
	}
}
