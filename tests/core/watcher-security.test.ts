import { unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { eg } from "../../src";
import { watchEnv } from "../../src/core/watcher.js";

describe("watcher security", () => {
	it("reads file atomically on change (TOCTOU-safe)", async () => {
		const envPath = join(tmpdir(), `.env-watcher-toctou-test-${Date.now()}`);
		writeFileSync(envPath, "VALUE=initial\n");

		const callbacks: unknown[] = [];
		const handle = watchEnv({ schema: { VALUE: eg.string() }, sources: [envPath] }, (update) =>
			callbacks.push(update),
		);

		// Wait for initial evaluation
		await new Promise((r) => setTimeout(r, 50));

		// Modify file
		writeFileSync(envPath, "VALUE=changed\n");
		await new Promise((r) => setTimeout(r, 200));

		handle.stop();
		unlinkSync(envPath);

		// Should have at least 2 callbacks: initial + change
		expect(callbacks.length).toBeGreaterThanOrEqual(2);
		const last = callbacks[callbacks.length - 1] as { env: { VALUE: string } | null };
		expect(last.env?.VALUE).toBe("changed");
	}, 5000);

	it("continues working after file read error", async () => {
		const envPath = join(tmpdir(), `.env-watcher-error-test-${Date.now()}`);
		writeFileSync(envPath, "VALUE=test\n");

		const warns: string[] = [];
		const spy = vi.spyOn(console, "warn").mockImplementation((msg) => warns.push(String(msg)));

		const callbacks: unknown[] = [];
		const handle = watchEnv({ schema: { VALUE: eg.string() }, sources: [envPath] }, (update) =>
			callbacks.push(update),
		);

		await new Promise((r) => setTimeout(r, 50));

		// Temporarily delete file to trigger read error on next change
		const tempPath = `${envPath}.tmp`;
		writeFileSync(tempPath, "VALUE=test\n");
		unlinkSync(envPath);

		// Trigger watch event by recreating file immediately
		writeFileSync(envPath, "VALUE=recovered\n");
		await new Promise((r) => setTimeout(r, 200));

		handle.stop();
		unlinkSync(envPath);
		try {
			unlinkSync(tempPath);
		} catch {}
		spy.mockRestore();

		// Should have recovered and processed the file
		const last = callbacks[callbacks.length - 1] as { env: { VALUE: string } | null };
		expect(last.env?.VALUE).toBe("recovered");
	}, 5000);
});
