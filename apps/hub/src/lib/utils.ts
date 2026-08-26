import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function truncate(str: string, length: number = 30) {
  if (!str || str.length <= length) return str;
  return str.slice(0, length) + "...";
}
