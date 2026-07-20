import { describe, expect, it } from "vitest";
import { keyify, slugify } from "./slug.js";

describe("slugify", () => {
  it("lowercases and dashes", () => {
    expect(slugify("Toyota GR Corolla")).toBe("toyota-gr-corolla");
  });

  it("strips leading/trailing dashes", () => {
    expect(slugify("  Honda!! ")).toBe("honda");
  });
});

describe("keyify", () => {
  it("converts spec labels to snake_case keys", () => {
    expect(keyify("0–100 km/h")).toBe("0_100_km_h");
  });

  it("handles degree signs", () => {
    expect(keyify("Charging Temp °C")).toBe("charging_temp_c");
  });
});
