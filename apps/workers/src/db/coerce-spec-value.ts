import type { SpecDataType } from "@versus-engine/db";

export interface TypedSpecValue {
  numberValue: number | null;
  textValue: string | null;
  boolValue: boolean | null;
  displayValue: string;
}

const TRUE_VALUES = new Set(["true", "yes", "1"]);
const FALSE_VALUES = new Set(["false", "no", "0"]);

/** Coerces a raw string spec (from CSV/vPIC) into the typed shape a SpecDefinition's dataType expects. */
export function coerceSpecValue(dataType: SpecDataType, rawValue: string): TypedSpecValue | null {
  const trimmed = rawValue.trim();
  if (trimmed === "") return null;

  if (dataType === "NUMBER") {
    const stripped = trimmed.replace(/[^0-9.-]/g, "");
    if (!/\d/.test(stripped)) return null;
    const numberValue = Number(stripped);
    if (Number.isNaN(numberValue)) return null;
    return { numberValue, textValue: null, boolValue: null, displayValue: trimmed };
  }

  if (dataType === "BOOLEAN") {
    const lower = trimmed.toLowerCase();
    if (TRUE_VALUES.has(lower)) return { numberValue: null, textValue: null, boolValue: true, displayValue: trimmed };
    if (FALSE_VALUES.has(lower)) return { numberValue: null, textValue: null, boolValue: false, displayValue: trimmed };
    return null;
  }

  return { numberValue: null, textValue: trimmed, boolValue: null, displayValue: trimmed };
}
