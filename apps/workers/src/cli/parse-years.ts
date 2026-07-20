/** Accepts "2024-2026" (inclusive range) or "2024,2025,2026" (explicit list). */
export function parseYears(value: string): number[] {
  const rangeMatch = value.match(/^(\d{4})-(\d{4})$/);
  if (rangeMatch) {
    const start = Number(rangeMatch[1]);
    const end = Number(rangeMatch[2]);
    if (end < start) {
      throw new Error(`Invalid year range "${value}": end must be >= start`);
    }
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  const years = value.split(",").map((part) => {
    const year = Number(part.trim());
    if (!Number.isInteger(year) || part.trim() === "") {
      throw new Error(`Invalid year "${part}" in "${value}"`);
    }
    return year;
  });

  if (years.length === 0) {
    throw new Error(`No years parsed from "${value}"`);
  }

  return years;
}
