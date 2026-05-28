import type { ArrayItemKind, SchemaFieldKind } from "../schema/types.js";

const TRUE_VALUES = new Set(["true", "1", "yes", "on"]);
const FALSE_VALUES = new Set(["false", "0", "no", "off"]);

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
			try {
				return JSON.parse(raw);
			} catch {
				throw new CoercionError(raw, "JSON");
			}
		}

		case "date": {
			const d = new Date(raw);
			if (Number.isNaN(d.getTime())) {
				throw new CoercionError(raw, "date");
			}
			return d;
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
