export type SchemaFieldKind = "string" | "number" | "boolean" | "enum" | "url" | "port" | "array";

export interface SchemaFieldOptions {
	kind: SchemaFieldKind;
	isRequired: boolean;
	isSensitive: boolean;
	defaultValue?: unknown;
	enumValues?: readonly string[];
	separator?: string;
	minValue?: number;
	maxValue?: number;
	minLength?: number;
	maxLength?: number;
	pattern?: RegExp;
}

export interface SchemaField<T = unknown> {
	_options: SchemaFieldOptions;
	_type: T;
}

export type SchemaDefinition = Record<string, SchemaField>;

export type InferEnv<T extends SchemaDefinition> = {
	[K in keyof T]: T[K] extends SchemaField<infer U> ? U : never;
};
