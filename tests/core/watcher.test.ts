import { unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { eg } from "../../src";
import { watchEnv } from "../../src/core/watcher.js";

describe("watchEnv", () => {
	it("calls callback immediately with initial env", () => {
		const callback = vi.fn();
		const handle = watchEnv(
			{
				schema: { PORT: eg.port().default(3000) },
				sources: [{}],
			},
			callback,
		);
		handle.stop();
		expect(callback).toHaveBeenCalledOnce();
		expect(callback.mock.calls[0]?.[0].env?.PORT).toBe(3000);
		expect(callback.mock.calls[0]?.[0].error).toBeNull();
	});

	it("calls callback with error when validation fails", () => {
		const callback = vi.fn();
		const handle = watchEnv(
			{
				schema: { PORT: eg.port() },
				sources: [{}], // PORT missing
			},
			callback,
		);
		handle.stop();
		expect(callback).toHaveBeenCalledOnce();
		expect(callback.mock.calls[0]?.[0].env).toBeNull();
		expect(callback.mock.calls[0]?.[0].error).not.toBeNull();
	});

	it("returns a stop handle with no file sources", () => {
		const callback = vi.fn();
		const handle = watchEnv({ schema: { X: eg.string().default("y") }, sources: [{}] }, callback);
		expect(handle.stop).toBeTypeOf("function");
		handle.stop();
	});

	it("re-evaluates when watched file changes", async () => {
		const envPath = join(tmpdir(), `.env-watcher-test-${Date.now()}`);
		writeFileSync(envPath, "PORT=3000\n");

		const calls: unknown[] = [];
		const handle = watchEnv({ schema: { PORT: eg.port() }, sources: [envPath] }, (update) =>
			calls.push(update),
		);

		// Modify the file
		await new Promise((r) => setTimeout(r, 50));
		writeFileSync(envPath, "PORT=4000\n");
		await new Promise((r) => setTimeout(r, 200));

		handle.stop();
		unlinkSync(envPath);

		expect(calls.length).toBeGreaterThanOrEqual(2);
		const last = calls[calls.length - 1] as { env: { PORT: number } | null; error: null };
		expect(last.env?.PORT).toBe(4000);
	}, 5000);
});
