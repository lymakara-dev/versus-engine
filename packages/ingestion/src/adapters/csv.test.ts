import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseProductsCsv } from "./csv.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const csvText = readFileSync(path.join(__dirname, "fixtures/products.csv"), "utf-8");

describe("parseProductsCsv", () => {
  it("parses fixed columns and spec_ columns", () => {
    const products = parseProductsCsv(csvText);
    expect(products).toHaveLength(3);

    const iphone = products[0]!;
    expect(iphone).toMatchObject({
      categorySlug: "phones",
      brand: "Apple",
      name: "iPhone 17 Pro",
      releaseYear: 2026,
      priceUsd: 1099,
      status: "VERIFIED",
      source: "csv",
    });
    expect(iphone.specs).toEqual({
      display_size: "6.3",
      battery_capacity: "3650",
      weight: "199",
      has_5g: "true",
    });
  });

  it("defaults status to DRAFT when verified is falsy or missing", () => {
    const products = parseProductsCsv(csvText);
    const nothingPhone = products.find((p) => p.brand === "Nothing")!;
    expect(nothingPhone.status).toBe("DRAFT");
    expect(nothingPhone.sourceUrl).toBeNull();
  });

  it("respects an explicit defaultStatus override", () => {
    const [, , nothingPhone] = parseProductsCsv(csvText, { defaultStatus: "VERIFIED" });
    // verified column is explicitly "false" so it should still win over defaultStatus
    expect(nothingPhone!.status).toBe("DRAFT");
  });
});
