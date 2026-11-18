// Immutable record updates shared by the Lab's edit helpers.

/** `record` with `key` set to `value`, or without `key` when `value` is null or undefined. */
export const withKey = <T extends object, K extends keyof T>(record: T, key: K, value: T[K] | null | undefined): T => {
  const { [key]: _removed, ...rest } = record;
  return (value == null ? rest : { ...rest, [key]: value }) as T;
};
