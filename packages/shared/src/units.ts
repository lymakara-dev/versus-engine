/**
 * Unit conversion helpers. Per CLAUDE.md, conversion happens once at ingestion —
 * everything stored in SpecValue.numberValue is already in the canonical SI-ish
 * unit for its SpecDefinition (kg, km/h, cm, s, USD, etc).
 */

export function lbToKg(lb: number): number {
  return lb * 0.45359237;
}

export function mphToKmh(mph: number): number {
  return mph * 1.609344;
}

export function inToCm(inches: number): number {
  return inches * 2.54;
}

export function inToMm(inches: number): number {
  return inches * 25.4;
}

export function ozToG(oz: number): number {
  return oz * 28.349523125;
}

export function ftLbToNm(ftLb: number): number {
  return ftLb * 1.3558179483;
}

export function fToC(fahrenheit: number): number {
  return ((fahrenheit - 32) * 5) / 9;
}

export function round(value: number, decimals = 1): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
