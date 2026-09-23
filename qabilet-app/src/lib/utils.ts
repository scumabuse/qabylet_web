import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Removes emoji and pictographs from display strings that come from logic. */
export function stripEmoji(text: string) {
  return text.replace(/\p{Extended_Pictographic}\uFE0F?\s*/gu, "").trim();
}
