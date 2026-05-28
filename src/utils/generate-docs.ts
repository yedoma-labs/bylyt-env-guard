import type { SchemaDefinition, SchemaFieldOptions } from "../schema/types.js";

export interface GenerateMarkdownDocsOptions {
	title?: string;
	includeConstraints?: boolean;
}

export function generateMarkdownDocs(
	schema: SchemaDefinition,
	options: GenerateMarkdownDocsOptions = {},
): string {
	const title = options.title ?? "Environment Variables";
	const includeConstraints = options.includeConstraints ?? true;
	const lines: string[] = [];

	lines.push(`## ${title}`);
	lines.push("");

	const headers = ["Variable", "Type", "Required", "Default", "Description"];
	if (includeConstraints) headers.splice(4, 0, "Constraints");

	lines.push(`| ${headers.join(" | ")} |`);
	lines.push(`| ${headers.map(() => "---").join(" | ")} |`);

	for (const [key, field] of Object.entries(schema)) {
		const opts = field._options;

		if (opts.kind === "group" && opts.subSchema) {
			const sep = opts.groupSeparator ?? "__";
			const prefix = key.toUpperCase() + sep;
			for (const [subKey, subField] of Object.entries(opts.subSchema)) {
				lines.push(formatRow(`${prefix}${subKey}`, subField._options, includeConstraints));
			}
			continue;
		}

		if (opts.kind === "array-of-groups" && opts.subSchema) {
			const sep = opts.groupSeparator ?? "_";
			const prefix = `${key.toUpperCase() + sep}N${sep}`;
			for (const [subKey, subField] of Object.entries(opts.subSchema)) {
				lines.push(formatRow(`${prefix}${subKey}`, subField._options, includeConstraints));
			}
			continue;
		}

		lines.push(formatRow(key, opts, includeConstraints));
	}

	lines.push("");
	return lines.join("\n");
}

function formatRow(key: string, opts: SchemaFieldOptions, includeConstraints: boolean): string {
	const type = formatType(opts);
	const required =
		opts.isRequired && opts.defaultValue === undefined && opts.defaultFactory === undefined
			? "✅"
			: "—";
	const defaultVal =
		opts.defaultValue !== undefined
			? `\`${String(opts.defaultValue)}\``
			: opts.defaultFactory !== undefined
				? "_runtime_"
				: "—";
	const description =
		opts.description ?? (opts.deprecated ? `⚠️ Deprecated: ${opts.deprecated}` : "—");

	const cells = [`\`${key}\``, type, required, defaultVal];

	if (includeConstraints) {
		const constraints: string[] = [];
		if (opts.enumValues) constraints.push(opts.enumValues.map((v) => `\`${v}\``).join(", "));
		if (opts.minValue !== undefined) constraints.push(`min: ${opts.minValue}`);
		if (opts.maxValue !== undefined) constraints.push(`max: ${opts.maxValue}`);
		if (opts.minLength !== undefined) constraints.push(`minLen: ${opts.minLength}`);
		if (opts.maxLength !== undefined) constraints.push(`maxLen: ${opts.maxLength}`);
		if (opts.pattern) constraints.push(`pattern: \`${opts.pattern}\``);
		if (opts.allowedProtocols) constraints.push(`protocols: ${opts.allowedProtocols.join(", ")}`);
		cells.push(constraints.length > 0 ? constraints.join(", ") : "—");
	}

	cells.push(description);

	return `| ${cells.join(" | ")} |`;
}

function formatType(opts: SchemaFieldOptions): string {
	switch (opts.kind) {
		case "enum":
			return "enum";
		case "array":
			return opts.arrayItemKind ? `array\\<${opts.arrayItemKind}\\>` : "array";
		case "array-of-groups":
			return "array\\<object\\>";
		case "record":
			return "record";
		case "group":
			return "object";
		default:
			return opts.kind;
	}
}
