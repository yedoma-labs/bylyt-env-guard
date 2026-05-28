import { watch } from "node:fs";
import { resolve } from "node:path";
import { EnvValidationError } from "../errors/validation-error.js";
import type { InferEnv, SchemaDefinition } from "../schema/types.js";
import type { EnvSource } from "./parser.js";
import { resolveSources } from "./resolver.js";
import { validateAndCoerce } from "./validator.js";

export type WatchCallback<T extends SchemaDefinition> = (
	update: { env: Readonly<InferEnv<T>>; error: null } | { env: null; error: EnvValidationError },
) => void;

export interface WatchOptions<T extends SchemaDefinition> {
	schema: T;
	sources?: EnvSource[];
	prefix?: string;
	profiles?: Record<string, Record<string, string>>;
	activeProfile?: string;
	debounceMs?: number;
}

export interface WatchHandle {
	stop: () => void;
}

export function watchEnv<T extends SchemaDefinition>(
	options: WatchOptions<T>,
	callback: WatchCallback<T>,
): WatchHandle {
	const { schema, prefix, profiles, activeProfile, debounceMs = 100 } = options;

	// Collect file sources to watch
	const fileSources: string[] = (options.sources ?? []).filter(
		(s): s is string => typeof s === "string",
	);

	function evaluate(): void {
		try {
			const profileName = activeProfile ?? process.env.NODE_ENV;
			const profileSource = profileName && profiles?.[profileName] ? profiles[profileName] : {};
			const sources = [profileSource, ...(options.sources ?? [process.env])];
			const resolved = resolveSources(schema, sources, { prefix });
			const result = validateAndCoerce(schema, resolved);
			callback({ env: Object.freeze(result) as Readonly<InferEnv<T>>, error: null });
		} catch (err) {
			const validationErr =
				err instanceof EnvValidationError
					? err
					: new EnvValidationError([
							{ field: "(internal)", message: String(err), code: "INTERNAL" },
						]);
			callback({ env: null, error: validationErr });
		}
	}

	// Initial evaluation
	evaluate();

	if (fileSources.length === 0) {
		return { stop: () => {} };
	}

	// Debounced re-evaluation on file change
	const watchers: ReturnType<typeof watch>[] = [];
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;

	const handleChange = () => {
		if (debounceTimer !== null) clearTimeout(debounceTimer);
		debounceTimer = setTimeout(evaluate, debounceMs);
	};

	for (const filePath of fileSources) {
		try {
			const watcher = watch(resolve(filePath), handleChange);
			watchers.push(watcher);
		} catch (err) {
			console.warn(`[env-guard] Failed to watch file: ${filePath}`, err);
		}
	}

	return {
		stop() {
			if (debounceTimer !== null) clearTimeout(debounceTimer);
			for (const w of watchers) w.close();
		},
	};
}
