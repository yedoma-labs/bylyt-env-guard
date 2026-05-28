import { describe, expect, it } from "vitest";
import { eg } from "../../src";

describe("schema builder", () => {
	it("creates string field with defaults", () => {
		const field = eg.string();
		expect(field._options.kind).toBe("string");
		expect(field._options.isRequired).toBe(true);
		expect(field._options.isSensitive).toBe(false);
	});

	it("chains required/optional/sensitive", () => {
		const field = eg.string().optional().sensitive();
		expect(field._options.isRequired).toBe(false);
		expect(field._options.isSensitive).toBe(true);
	});

	it("sets default and marks optional", () => {
		const field = eg.string().default("hello");
		expect(field._options.defaultValue).toBe("hello");
		expect(field._options.isRequired).toBe(false);
	});

	it("creates number with min/max", () => {
		const field = eg.number().min(0).max(100);
		expect(field._options.kind).toBe("number");
		expect(field._options.minValue).toBe(0);
		expect(field._options.maxValue).toBe(100);
	});

	it("creates boolean field", () => {
		const field = eg.boolean();
		expect(field._options.kind).toBe("boolean");
	});

	it("creates enum with values", () => {
		const field = eg.enum(["a", "b", "c"] as const);
		expect(field._options.kind).toBe("enum");
		expect(field._options.enumValues).toEqual(["a", "b", "c"]);
	});

	it("creates url field", () => {
		expect(eg.url()._options.kind).toBe("url");
	});

	it("creates port field with range", () => {
		const field = eg.port();
		expect(field._options.kind).toBe("port");
		expect(field._options.minValue).toBe(1);
		expect(field._options.maxValue).toBe(65535);
	});

	it("creates array field with custom separator", () => {
		const field = eg.array().separator("|");
		expect(field._options.kind).toBe("array");
		expect(field._options.separator).toBe("|");
	});

	it("string with minLength/maxLength/pattern", () => {
		const field = eg
			.string()
			.minLength(3)
			.maxLength(10)
			.pattern(/^[a-z]+$/);
		expect(field._options.minLength).toBe(3);
		expect(field._options.maxLength).toBe(10);
		expect(field._options.pattern).toEqual(/^[a-z]+$/);
	});
});

describe("new field types", () => {
	it("creates integer field", () => {
		const field = eg.integer();
		expect(field._options.kind).toBe("integer");
		expect(field._options.isRequired).toBe(true);
	});

	it("creates email field", () => {
		const field = eg.email();
		expect(field._options.kind).toBe("email");
		expect(field._options.isRequired).toBe(true);
	});

	it("creates json field", () => {
		const field = eg.json();
		expect(field._options.kind).toBe("json");
		expect(field._options.isRequired).toBe(true);
	});

	it("creates date field", () => {
		const field = eg.date();
		expect(field._options.kind).toBe("date");
		expect(field._options.isRequired).toBe(true);
	});

	it("email with minLength and maxLength", () => {
		const field = eg.email().minLength(5).maxLength(50);
		expect(field._options.minLength).toBe(5);
		expect(field._options.maxLength).toBe(50);
	});

	it("url with allowed protocols", () => {
		const field = eg.url().protocols("https", "wss");
		expect(field._options.allowedProtocols).toEqual(["https", "wss"]);
	});

	it("enum with caseInsensitive", () => {
		const field = eg.enum(["a", "b"] as const).caseInsensitive();
		expect(field._options.caseInsensitive).toBe(true);
	});

	it("array with item kind", () => {
		const field = eg.array().of("number");
		expect(field._options.arrayItemKind).toBe("number");
	});

	it("integer with min and max", () => {
		const field = eg.integer().min(0).max(100);
		expect(field._options.minValue).toBe(0);
		expect(field._options.maxValue).toBe(100);
	});
});

describe("new builder methods", () => {
	it("sets aliases", () => {
		const field = eg.string().aliases("ALIAS_1", "ALIAS_2");
		expect(field._options.aliases).toEqual(["ALIAS_1", "ALIAS_2"]);
	});

	it("sets custom validator", () => {
		const validator = (v: string) => (v === "test" ? null : "invalid");
		const field = eg.string().validate(validator);
		expect(field._options.customValidator).toBe(validator);
	});

	it("sets transform function", () => {
		const transform = (v: string) => v.toUpperCase();
		const field = eg.string().transform(transform);
		expect(field._options.transform).toBe(transform);
	});

	it("sets deprecated with message", () => {
		const field = eg.string().deprecated("use X instead");
		expect(field._options.deprecated).toBe("use X instead");
	});

	it("sets deprecated with default message", () => {
		const field = eg.string().deprecated();
		expect(field._options.deprecated).toBe("This environment variable is deprecated");
	});

	it("sets defaultFactory and marks optional", () => {
		const factory = () => 42;
		const field = eg.number().default(factory);
		expect(field._options.defaultFactory).toBe(factory);
		expect(field._options.defaultValue).toBeUndefined();
		expect(field._options.isRequired).toBe(false);
	});

	it("sets defaultValue and marks optional", () => {
		const field = eg.number().default(42);
		expect(field._options.defaultValue).toBe(42);
		expect(field._options.defaultFactory).toBeUndefined();
		expect(field._options.isRequired).toBe(false);
	});
});

describe("describe and example", () => {
	it("sets description", () => {
		const f = eg.string().describe("My field");
		expect(f._options.description).toBe("My field");
	});

	it("sets example", () => {
		const f = eg.number().example(42);
		expect(f._options.example).toBe(42);
	});
});

describe("requiredIf", () => {
	it("sets requiredIf function", () => {
		const fn = (raw: Record<string, string | undefined>) => raw.USE_DB === "true";
		const f = eg.url().requiredIf(fn);
		expect(f._options.requiredIf).toBe(fn);
	});
});

describe("eg.group", () => {
	it("creates group field with subSchema", () => {
		const g = eg.group({ HOST: eg.string(), PORT: eg.port() });
		expect(g._options.kind).toBe("group");
		expect(g._options.subSchema).toBeDefined();
		expect(g._options.groupSeparator).toBe("__");
	});

	it("accepts custom separator", () => {
		const g = eg.group({ HOST: eg.string() }, { separator: "_" });
		expect(g._options.groupSeparator).toBe("_");
	});
});

describe("array minLength/maxLength", () => {
	it("sets minLength on array", () => {
		const f = eg.array().minLength(2);
		expect(f._options.minLength).toBe(2);
	});

	it("sets maxLength on array", () => {
		const f = eg.array().maxLength(10);
		expect(f._options.maxLength).toBe(10);
	});
});
