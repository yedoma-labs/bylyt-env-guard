import type { ArrayItemKind, SchemaDefinition, SchemaField, SchemaFieldOptions } from "./types.js";

type ArrayItemKindToType = {
	string: string;
	number: number;
	integer: number;
	boolean: boolean;
};

class FieldBuilder<T> implements SchemaField<T> {
	_options: SchemaFieldOptions;
	_type!: T;

	constructor(options: SchemaFieldOptions) {
		this._options = { ...options };
	}

	required(): FieldBuilder<Exclude<T, undefined>> {
		this._options.isRequired = true;
		return this as unknown as FieldBuilder<Exclude<T, undefined>>;
	}

	optional(): FieldBuilder<T | undefined> {
		this._options.isRequired = false;
		return this as unknown as FieldBuilder<T | undefined>;
	}

	sensitive(): this {
		this._options.isSensitive = true;
		return this;
	}

	default(
		valueOrFactory: (T extends undefined ? never : T) | (() => T extends undefined ? never : T),
	): FieldBuilder<Exclude<T, undefined>> {
		if (typeof valueOrFactory === "function") {
			this._options.defaultFactory = valueOrFactory as () => unknown;
		} else {
			this._options.defaultValue = valueOrFactory;
		}
		this._options.isRequired = false;
		return this as unknown as FieldBuilder<Exclude<T, undefined>>;
	}

	aliases(...names: string[]): this {
		this._options.aliases = names;
		return this;
	}

	validate(fn: (value: Exclude<T, undefined>) => string | null): this {
		this._options.customValidator = fn as (value: unknown) => string | null;
		return this;
	}

	transform<R>(
		fn: (value: Exclude<T, undefined>) => R,
	): FieldBuilder<R | (undefined extends T ? undefined : never)> {
		this._options.transform = fn as (value: unknown) => unknown;
		return this as unknown as FieldBuilder<R | (undefined extends T ? undefined : never)>;
	}

	deprecated(message?: string): this {
		this._options.deprecated = message ?? "This environment variable is deprecated";
		return this;
	}

	describe(text: string): this {
		this._options.description = text;
		return this;
	}

	example(value: unknown): this {
		this._options.example = value;
		return this;
	}

	requiredIf(fn: (raw: Record<string, string | undefined>) => boolean): this {
		this._options.requiredIf = fn;
		return this;
	}
}

class StringFieldBuilder<T extends string | undefined = string> extends FieldBuilder<T> {
	constructor() {
		super({ kind: "string", isRequired: true, isSensitive: false });
	}

	minLength(n: number): this {
		this._options.minLength = n;
		return this;
	}

	maxLength(n: number): this {
		this._options.maxLength = n;
		return this;
	}

	pattern(re: RegExp): this {
		this._options.pattern = re;
		return this;
	}
}

class IntegerFieldBuilder<T extends number | undefined = number> extends FieldBuilder<T> {
	constructor() {
		super({ kind: "integer", isRequired: true, isSensitive: false });
	}

	min(n: number): this {
		this._options.minValue = n;
		return this;
	}

	max(n: number): this {
		this._options.maxValue = n;
		return this;
	}
}

class NumberFieldBuilder<T extends number | undefined = number> extends FieldBuilder<T> {
	constructor() {
		super({ kind: "number", isRequired: true, isSensitive: false });
	}

	min(n: number): this {
		this._options.minValue = n;
		return this;
	}

	max(n: number): this {
		this._options.maxValue = n;
		return this;
	}
}

class BooleanFieldBuilder<T extends boolean | undefined = boolean> extends FieldBuilder<T> {
	constructor() {
		super({ kind: "boolean", isRequired: true, isSensitive: false });
	}
}

class EnumFieldBuilder<T extends string> extends FieldBuilder<T> {
	constructor(values: readonly T[]) {
		super({
			kind: "enum",
			isRequired: true,
			isSensitive: false,
			enumValues: values as readonly string[],
		});
	}

	caseInsensitive(): this {
		this._options.caseInsensitive = true;
		return this;
	}
}

class UrlFieldBuilder<T extends string | undefined = string> extends FieldBuilder<T> {
	constructor() {
		super({ kind: "url", isRequired: true, isSensitive: false });
	}

	protocols(...allowed: string[]): this {
		this._options.allowedProtocols = allowed;
		return this;
	}
}

class PortFieldBuilder<T extends number | undefined = number> extends FieldBuilder<T> {
	constructor() {
		super({ kind: "port", isRequired: true, isSensitive: false, minValue: 1, maxValue: 65535 });
	}
}

class EmailFieldBuilder<T extends string | undefined = string> extends FieldBuilder<T> {
	constructor() {
		super({ kind: "email", isRequired: true, isSensitive: false });
	}

	minLength(n: number): this {
		this._options.minLength = n;
		return this;
	}

	maxLength(n: number): this {
		this._options.maxLength = n;
		return this;
	}
}

class JsonFieldBuilder<T = unknown> extends FieldBuilder<T> {
	constructor() {
		super({ kind: "json", isRequired: true, isSensitive: false });
	}
}

class DateFieldBuilder<T extends Date | undefined = Date> extends FieldBuilder<T> {
	constructor() {
		super({ kind: "date", isRequired: true, isSensitive: false });
	}
}

class ArrayFieldBuilder<T extends unknown[] | undefined = string[]> extends FieldBuilder<T> {
	constructor() {
		super({ kind: "array", isRequired: true, isSensitive: false, separator: "," });
	}

	separator(sep: string): this {
		this._options.separator = sep;
		return this;
	}

	of<K extends ArrayItemKind>(
		itemKind: K,
	): ArrayFieldBuilder<ArrayItemKindToType[K][] | (undefined extends T ? undefined : never)> {
		this._options.arrayItemKind = itemKind;
		return this as unknown as ArrayFieldBuilder<
			ArrayItemKindToType[K][] | (undefined extends T ? undefined : never)
		>;
	}

	minLength(n: number): this {
		this._options.minLength = n;
		return this;
	}

	maxLength(n: number): this {
		this._options.maxLength = n;
		return this;
	}
}

type InferGroup<T extends SchemaDefinition> = {
	[K in keyof T]: T[K] extends SchemaField<infer U> ? U : never;
};

class GroupFieldBuilder<T extends SchemaDefinition> extends FieldBuilder<InferGroup<T>> {
	constructor(subSchema: T, opts?: { separator?: string }) {
		super({
			kind: "group",
			isRequired: true,
			isSensitive: false,
			subSchema: subSchema as SchemaDefinition,
			groupSeparator: opts?.separator ?? "__",
		});
	}
}

class ArrayOfGroupsFieldBuilder<T extends SchemaDefinition> extends FieldBuilder<InferGroup<T>[]> {
	constructor(subSchema: T, opts?: { separator?: string }) {
		super({
			kind: "array-of-groups",
			isRequired: false,
			isSensitive: false,
			subSchema: subSchema as SchemaDefinition,
			groupSeparator: opts?.separator ?? "_",
		});
	}
}

class RecordFieldBuilder<
	T extends Record<string, string> | undefined = Record<string, string>,
> extends FieldBuilder<T> {
	constructor(prefixOrPattern?: string | RegExp) {
		super({ kind: "record", isRequired: false, isSensitive: false });
		if (typeof prefixOrPattern === "string") {
			this._options.recordPrefix = prefixOrPattern;
		} else if (prefixOrPattern instanceof RegExp) {
			this._options.recordPattern = prefixOrPattern;
		}
	}
}

export const eg = {
	string: () => new StringFieldBuilder(),
	number: () => new NumberFieldBuilder(),
	integer: () => new IntegerFieldBuilder(),
	boolean: () => new BooleanFieldBuilder(),
	enum: <T extends string>(values: readonly T[]) => new EnumFieldBuilder<T>(values),
	url: () => new UrlFieldBuilder(),
	port: () => new PortFieldBuilder(),
	email: () => new EmailFieldBuilder(),
	json: <T = unknown>() => new JsonFieldBuilder<T>(),
	date: () => new DateFieldBuilder(),
	array: () => new ArrayFieldBuilder(),
	group: <T extends SchemaDefinition>(subSchema: T, opts?: { separator?: string }) =>
		new GroupFieldBuilder<T>(subSchema, opts),
	arrayOfGroups: <T extends SchemaDefinition>(subSchema: T, opts?: { separator?: string }) =>
		new ArrayOfGroupsFieldBuilder<T>(subSchema, opts),
	record: (prefixOrPattern?: string | RegExp) => new RecordFieldBuilder(prefixOrPattern),
};
