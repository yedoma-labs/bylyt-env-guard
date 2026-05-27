import type { SchemaFieldKind } from "../schema/types.js";

const TRUE_VALUES = new Set(["true", "1", "yes", "on"]);
const FALSE_VALUES = new Set(["false", "0", "no", "off"]);

export function coerce(raw: string, kind: SchemaFieldKind, separator?: string): unknown {
	switch (kind) {
		case "string":
		case "url":
		case "enum":
			return raw;

		case "number": {
			const n = Number(raw);
			if (Number.isNaN(n)) {
				throw new CoercionError(raw, "number");
			}
			return n;
		}

		case "port": {
			const n = Number.parseInt(raw, 10);
			if (Number.isNaN(n)) {
				throw new CoercionError(raw, "port (integer)");
			}
			return n;
		}

		case "boolean": {
			const lower = raw.toLowerCase();
			if (TRUE_VALUES.has(lower)) return true;
			if (FALSE_VALUES.has(lower)) return false;
			throw new CoercionError(raw, "boolean");
		}

		case "array":
			return raw
				.split(separator ?? ",")
				.map((s) => s.trim())
				.filter((s) => s.length > 0);

		default:
			return raw;
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
