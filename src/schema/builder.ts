import type { SchemaField, SchemaFieldOptions } from "./types.js";

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

	default(value: T extends undefined ? never : T): FieldBuilder<Exclude<T, undefined>> {
		this._options.defaultValue = value;
		this._options.isRequired = false;
		return this as unknown as FieldBuilder<Exclude<T, undefined>>;
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

class BooleanFieldBuilder<
	T extends boolean | undefined = boolean,
> extends FieldBuilder<T> {
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
}

class UrlFieldBuilder<T extends string | undefined = string> extends FieldBuilder<T> {
	constructor() {
		super({ kind: "url", isRequired: true, isSensitive: false });
	}
}

class PortFieldBuilder<T extends number | undefined = number> extends FieldBuilder<T> {
	constructor() {
		super({ kind: "port", isRequired: true, isSensitive: false, minValue: 1, maxValue: 65535 });
	}
}

class ArrayFieldBuilder<T extends string[] | undefined = string[]> extends FieldBuilder<T> {
	constructor() {
		super({ kind: "array", isRequired: true, isSensitive: false, separator: "," });
	}

	separator(sep: string): this {
		this._options.separator = sep;
		return this;
	}
}

export const eg = {
	string: () => new StringFieldBuilder(),
	number: () => new NumberFieldBuilder(),
	boolean: () => new BooleanFieldBuilder(),
	enum: <T extends string>(values: readonly T[]) => new EnumFieldBuilder<T>(values),
	url: () => new UrlFieldBuilder(),
	port: () => new PortFieldBuilder(),
	array: () => new ArrayFieldBuilder(),
};
