/**
 * Minimal .env file parser. Supports:
 * - Comments (#)
 * - Empty lines
 * - export prefix
 * - Single/double/backtick quotes
 * - Inline comments (outside quotes)
 * - Multiline values with double quotes
 */
export function parseDotenv(content: string): Record<string, string> {
	const result: Record<string, string> = {};
	const lines = content.split("\n");
	let i = 0;

	while (i < lines.length) {
		const line = lines[i]?.trim() ?? "";
		i++;

		if (line === "" || line.startsWith("#")) continue;

		const cleaned = line.startsWith("export ") ? line.slice(7) : line;
		const eqIndex = cleaned.indexOf("=");
		if (eqIndex === -1) continue;

		const key = cleaned.slice(0, eqIndex).trim();
		if (key === "__proto__" || key === "constructor" || key === "prototype") continue;
		let value = cleaned.slice(eqIndex + 1).trim();

		if (
			(value.startsWith('"') && !value.endsWith('"')) ||
			(value.startsWith('"') && value === '"')
		) {
			// Multiline value
			const MAX_MULTILINE_LINES = 100;
			const parts = [value.slice(1)];
			while (i < lines.length && parts.length < MAX_MULTILINE_LINES) {
				const nextLine = lines[i];
				i++;
				if (nextLine === undefined) break;
				if (nextLine.trimEnd().endsWith('"')) {
					parts.push(nextLine.trimEnd().slice(0, -1));
					break;
				}
				parts.push(nextLine);
			}
			if (parts.length >= MAX_MULTILINE_LINES) {
				throw new Error(`Multiline value for "${key}" exceeds ${MAX_MULTILINE_LINES} lines`);
			}
			result[key] = parts.join("\n");
			continue;
		}

		// Strip quotes (only matching pairs)
		const first = value[0];
		const last = value[value.length - 1];
		if (first === last && (first === '"' || first === "'" || first === "`")) {
			value = value.slice(1, -1);
		} else {
			// Remove inline comment (with or without leading space)
			const commentIndex = value.indexOf("#");
			if (commentIndex !== -1) {
				value = value.slice(0, commentIndex).trimEnd();
			}
		}

		result[key] = value;
	}

	return result;
}
