import { describe, expect, it } from "vitest";
import { coerceSpecValue } from "./coerce-spec-value.js";

describe("coerceSpecValue", () => {
  it("parses numbers, stripping non-numeric characters", () => {
    expect(coerceSpecValue("NUMBER", "3,650")).toEqual({
      numberValue: 3650,
      textValue: null,
      boolValue: null,
      displayValue: "3,650",
    });
  });

  it("returns null for an unparseable number", () => {
    expect(coerceSpecValue("NUMBER", "n/a")).toBeNull();
  });

  it("parses booleans from common truthy/falsy strings", () => {
    expect(coerceSpecValue("BOOLEAN", "true")).toMatchObject({ boolValue: true });
    expect(coerceSpecValue("BOOLEAN", "No")).toMatchObject({ boolValue: false });
    expect(coerceSpecValue("BOOLEAN", "maybe")).toBeNull();
  });

  it("passes text through untouched", () => {
    expect(coerceSpecValue("TEXT", "AWD")).toEqual({
      numberValue: null,
      textValue: "AWD",
      boolValue: null,
      displayValue: "AWD",
    });
  });

  it("treats blank input as no value", () => {
    expect(coerceSpecValue("TEXT", "   ")).toBeNull();
  });
});
