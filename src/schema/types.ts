export type SchemaFieldKind =
	| "string"
	| "number"
	| "boolean"
	| "enum"
	| "url"
	| "port"
	| "array"
	| "integer"
	| "email"
	| "json"
	| "date"
	| "group"
	| "array-of-groups"
	| "record";

export type ArrayItemKind = "string" | "number" | "integer" | "boolean";

export interface SchemaFieldOptions {
	kind: SchemaFieldKind;
	isRequired: boolean;
	isSensitive: boolean;
	defaultValue?: unknown;
	defaultFactory?: () => unknown;
	enumValues?: readonly string[];
	separator?: string;
	minValue?: number;
	maxValue?: number;
	minLength?: number;
	maxLength?: number;
	pattern?: RegExp;
	aliases?: string[];
	allowedProtocols?: string[];
	caseInsensitive?: boolean;
	arrayItemKind?: ArrayItemKind;
	customValidator?: (value: unknown) => string | null;
	transform?: (value: unknown) => unknown;
	transformTimeout?: number;
	deprecated?: string;
	description?: string;
	example?: unknown;
	requiredIf?: (raw: Record<string, string | undefined>) => boolean;
	subSchema?: SchemaDefinition;
	groupSeparator?: string;
	recordPrefix?: string;
	recordPattern?: RegExp;
}

export interface SchemaField<T = unknown> {
	_options: SchemaFieldOptions;
	_type: T;
}

export type SchemaDefinition = Record<string, SchemaField>;

export type InferEnv<T extends SchemaDefinition> = Readonly<{
	[K in keyof T]: T[K] extends SchemaField<infer U> ? U : never;
}>;
