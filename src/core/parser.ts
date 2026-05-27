import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseDotenv } from "../utils/dotenv.js";

export type EnvSource = string | Record<string, string | undefined>;

export function parseSource(source: EnvSource): Record<string, string> {
	if (typeof source === "string") {
		return parseFileSource(source);
	}
	return parseObjectSource(source);
}

function parseFileSource(filePath: string): Record<string, string> {
	const resolved = resolve(filePath);
	if (!existsSync(resolved)) {
		return {};
	}
	const content = readFileSync(resolved, "utf-8");
	return parseDotenv(content);
}

function parseObjectSource(obj: Record<string, string | undefined>): Record<string, string> {
	const result: Record<string, string> = {};
	for (const [key, value] of Object.entries(obj)) {
		if (value !== undefined) {
			result[key] = value;
		}
	}
	return result;
}
