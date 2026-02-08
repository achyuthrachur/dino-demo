/**
 * Per-character splitting utilities for anime.js text animations.
 * Renders each character as a <span> so anime.js can target individually.
 */

export interface CharData {
  char: string;
  index: number;
  isSpace: boolean;
  isNumeric: boolean;
}

export interface NumberSpan {
  start: number;
  end: number; // exclusive
  value: string; // raw numeric string e.g. "12,800"
  numericValue: number; // parsed numeric value e.g. 12800
}

/**
 * Split text into per-character data array.
 * Preserves spaces as non-breaking spans for layout.
 */
export function splitText(text: string): CharData[] {
  return Array.from(text).map((char, index) => ({
    char,
    index,
    isSpace: char === ' ',
    isNumeric: isNumericChar(char),
  }));
}

/**
 * Find contiguous numeric substrings (including commas and dots).
 * E.g. "about 12,800 pounds" → [{ start: 6, end: 12, value: "12,800", numericValue: 12800 }]
 */
export function extractNumbers(text: string): NumberSpan[] {
  const spans: NumberSpan[] = [];
  const regex = /[\d,]+\.?\d*/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const raw = match[0];
    const numericValue = parseFloat(raw.replace(/,/g, ''));
    if (!isNaN(numericValue) && numericValue > 0) {
      spans.push({
        start: match.index,
        end: match.index + raw.length,
        value: raw,
        numericValue,
      });
    }
  }
  return spans;
}

export function isNumericChar(char: string): boolean {
  return /[\d,.]/.test(char);
}

/**
 * Format a number with commas, matching the original formatting style.
 */
export function formatNumber(value: number, decimals = 0): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
