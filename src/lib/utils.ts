import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function chunk<T>(array: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(array.length / size) }, (_, i) =>
    array.slice(i * size, i * size + size),
  );
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Formats a duration in seconds as `m:ss`, or `Ns` when under a minute */
export function formatDuration(totalSeconds: number) {
  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/** Reads the value of a set regardless of whether it's counted in reps or seconds */
export function getSetValue(set: { reps: number } | { seconds: number }) {
  return "seconds" in set ? set.seconds : set.reps;
}
