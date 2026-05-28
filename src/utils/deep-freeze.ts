export function deepFreeze<T>(obj: T, seen = new WeakSet()): T {
	if (obj === null || typeof obj !== "object") return obj;
	if (seen.has(obj as object)) return obj;
	seen.add(obj as object);
	Object.freeze(obj);
	for (const value of Object.values(obj as object)) {
		deepFreeze(value, seen);
	}
	return obj;
}
