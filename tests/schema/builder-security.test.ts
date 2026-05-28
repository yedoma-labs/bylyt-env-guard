import { describe, expect, it, vi } from "vitest";
import { eg } from "../../src";

describe("builder security", () => {
	describe("array separator validation", () => {
		it("rejects empty string separator", () => {
			expect(() => eg.array().separator("")).toThrow("cannot be empty string");
		});

		it("warns on whitespace-only separator", () => {
			const warns: string[] = [];
			const spy = vi.spyOn(console, "warn").mockImplementation((msg) => warns.push(msg));

			eg.array().separator(" ");

			spy.mockRestore();
			expect(warns.some((w) => w.includes("whitespace-only"))).toBe(true);
		});

		it("accepts normal separators", () => {
			expect(() => eg.array().separator(",")).not.toThrow();
			expect(() => eg.array().separator("|")).not.toThrow();
			expect(() => eg.array().separator("::")).not.toThrow();
		});
	});
});
