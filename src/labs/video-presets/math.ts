// Small numeric helpers shared by the Lab's pure modules.

/** `n` kept inside `[min, max]`. */
export const clamp = (n: number, min: number, max: number): number => Math.min(max, Math.max(min, n));
