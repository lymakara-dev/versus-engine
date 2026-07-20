/** URL-safe identifier, e.g. "Toyota GR Corolla" -> "toyota-gr-corolla" */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** SpecDefinition.key form, e.g. "0–100 km/h" -> "0_100_km_h" */
export function keyify(label: string): string {
  return label
    .toLowerCase()
    .replace(/[°–—]/g, "-")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/(^_|_$)/g, "");
}
