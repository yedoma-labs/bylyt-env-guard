import type { ArrayItemKind, SchemaFieldKind } from "../schema/types.js";

const TRUE_VALUES = new Set(["true", "1", "yes", "on"]);
const FALSE_VALUES = new Set(["false", "0", "no", "off"]);
const DURATION_UNIT_MS: Record<string, number> = {
	ms: 1,
	s: 1_000,
	m: 60_000,
	h: 3_600_000,
	d: 86_400_000,
};
const DURATION_PATTERN = /^(\d+(?:\.\d+)?)(ms|s|m|h|d)$/;

export function coerce(
	raw: string,
	kind: SchemaFieldKind,
	separator?: string,
	arrayItemKind?: ArrayItemKind,
): unknown {
	switch (kind) {
		case "string":
		case "url":
		case "enum":
		case "email":
			return raw;

		case "number": {
			const n = Number(raw);
			if (!Number.isFinite(n)) {
				throw new CoercionError(raw, "number");
			}
			return n;
		}

		case "integer":
		case "port": {
			const n = Number(raw);
			if (!Number.isFinite(n) || !Number.isInteger(n)) {
				throw new CoercionError(raw, kind === "integer" ? "integer" : "port (integer)");
			}
			if (n > Number.MAX_SAFE_INTEGER || n < Number.MIN_SAFE_INTEGER) {
				throw new CoercionError(raw, `${kind} (exceeds safe integer range)`);
			}
			return n;
		}

		case "boolean": {
			const lower = raw.toLowerCase();
			if (TRUE_VALUES.has(lower)) return true;
			if (FALSE_VALUES.has(lower)) return false;
			throw new CoercionError(raw, "boolean");
		}

		case "array": {
			const items = raw
				.split(separator ?? ",")
				.map((s) => s.trim())
				.filter((s) => s.length > 0);
			if (!arrayItemKind || arrayItemKind === "string") return items;
			return items.map((item) => coerceArrayItem(item, arrayItemKind, raw));
		}

		case "json": {
			const MAX_JSON_SIZE = 1024 * 1024; // 1MB
			if (raw.length > MAX_JSON_SIZE) {
				throw new CoercionError(raw.slice(0, 100), "JSON (size limit exceeded)");
			}
			try {
				const parsed = JSON.parse(raw);
				const depth = getJSONDepth(parsed);
				if (depth > 50) {
					throw new CoercionError(raw.slice(0, 100), "JSON (depth limit exceeded)");
				}
				return parsed;
			} catch (err) {
				if (err instanceof CoercionError) throw err;
				throw new CoercionError(raw.slice(0, 100), "JSON");
			}
		}

		case "date": {
			const d = new Date(raw);
			if (Number.isNaN(d.getTime())) {
				throw new CoercionError(raw, "date");
			}
			return d;
		}

		case "duration": {
			const match = DURATION_PATTERN.exec(raw.trim());
			const unit = match?.[2];
			if (!match || unit === undefined) {
				throw new CoercionError(raw, "duration (e.g. 500ms, 30s, 5m, 2h, 7d)");
			}
			const ms = Number(match[1]) * (DURATION_UNIT_MS[unit] ?? Number.NaN);
			if (!Number.isFinite(ms)) {
				throw new CoercionError(raw, "duration (out of range)");
			}
			return ms;
		}

		case "group":
			return raw;

		case "array-of-groups":
			return raw;

		case "record":
			return raw;

		default:
			return raw;
	}
}

function coerceArrayItem(item: string, kind: ArrayItemKind, rawArray: string): unknown {
	switch (kind) {
		case "number": {
			const n = Number(item);
			if (!Number.isFinite(n))
				throw new CoercionError(rawArray, `array of number (item: "${item}")`);
			return n;
		}
		case "integer": {
			const n = Number(item);
			if (!Number.isFinite(n) || !Number.isInteger(n))
				throw new CoercionError(rawArray, `array of integer (item: "${item}")`);
			return n;
		}
		case "boolean": {
			const lower = item.toLowerCase();
			if (TRUE_VALUES.has(lower)) return true;
			if (FALSE_VALUES.has(lower)) return false;
			throw new CoercionError(rawArray, `array of boolean (item: "${item}")`);
		}
		default:
			return item;
	}
}

function getJSONDepth(obj: unknown, depth = 0): number {
	if (depth > 50) return depth; // early termination
	if (obj === null || typeof obj !== "object") return depth;
	let maxChildDepth = depth;
	for (const value of Object.values(obj)) {
		const childDepth = getJSONDepth(value, depth + 1);
		if (childDepth > maxChildDepth) maxChildDepth = childDepth;
	}
	return maxChildDepth;
}

export class CoercionError extends Error {
	readonly raw: string;
	readonly targetType: string;

	constructor(raw: string, targetType: string) {
		super(`Cannot coerce "${raw}" to ${targetType}`);
		this.name = "CoercionError";
		this.raw = raw;
		this.targetType = targetType;
	}
}
