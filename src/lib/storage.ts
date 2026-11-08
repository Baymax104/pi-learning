import { useEffect, useState } from "react";

export function useLocalState<T>(
  key: string,
  fallback: T,
  validate: (value: unknown) => value is T,
) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      const parsed: unknown = raw ? JSON.parse(raw) : null;
      return validate(parsed) ? parsed : fallback;
    } catch {
      return fallback;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* 存储不可用时继续使用内存状态。 */
    }
  }, [key, value]);
  return [value, setValue] as const;
}

export const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((entry) => typeof entry === "string");

export const isNotes = (value: unknown): value is Record<string, string> =>
  typeof value === "object" &&
  value !== null &&
  !Array.isArray(value) &&
  Object.values(value).every((entry) => typeof entry === "string");
