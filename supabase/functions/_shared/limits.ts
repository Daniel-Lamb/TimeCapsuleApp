/**
 * Server-side ceilings. The browser enforces the same numbers in
 * `src/lib/limits.ts` for immediate feedback; these are the ones that actually
 * count, since anything can POST to this function.
 */
export const MAX_FILES = 10;
export const MAX_FILE_BYTES = 25 * 1024 * 1024;
export const MAX_TOTAL_BYTES = 100 * 1024 * 1024;

/** Furthest into the future a capsule may be scheduled. */
export const MAX_UNLOCK_YEARS = 50;
