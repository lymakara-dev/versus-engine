import { describe, expect, it } from "vitest";
import {
  computeRoundWinner,
  normalizedDifference,
  scoreCandidate,
  selectRounds,
  type RoundCandidate,
} from "./round-selection.js";

function numberCandidate(
  overrides: Partial<Omit<RoundCandidate, "values">> & { key: string; values: number[] },
): RoundCandidate {
  return {
    key: overrides.key,
    label: overrides.label ?? overrides.key,
    icon: overrides.icon ?? "zap",
    unit: overrides.unit ?? null,
    dataType: "NUMBER",
    visualization: overrides.visualization ?? "BAR",
    higherIsBetter: overrides.higherIsBetter ?? true,
    priorityWeight: overrides.priorityWeight ?? 1,
    displayFormat: overrides.displayFormat ?? null,
    values: overrides.values.map((n) => ({ numberValue: n, textValue: null, boolValue: null, displayValue: String(n) })),
  };
}

describe("normalizedDifference", () => {
  it("is 0 when all numeric values are equal", () => {
    expect(normalizedDifference(numberCandidate({ key: "a", values: [100, 100] }))).toBe(0);
  });

  it("is positive when numeric values differ", () => {
    expect(normalizedDifference(numberCandidate({ key: "a", values: [100, 150] }))).toBeGreaterThan(0);
  });

  it("handles a zero mean without dividing by zero", () => {
    expect(normalizedDifference(numberCandidate({ key: "a", values: [-10, 10] }))).toBe(1);
  });

  it("treats differing free text as a binary signal", () => {
    const candidate: RoundCandidate = {
      key: "drivetrain",
      label: "Drivetrain",
      icon: "cog",
      unit: null,
      dataType: "TEXT",
      visualization: "BADGE",
      higherIsBetter: true,
      priorityWeight: 1,
      displayFormat: null,
      values: [
        { numberValue: null, textValue: "AWD", boolValue: null, displayValue: "AWD" },
        { numberValue: null, textValue: "FWD", boolValue: null, displayValue: "FWD" },
      ],
    };
    expect(normalizedDifference(candidate)).toBe(1);
  });
});

describe("computeRoundWinner", () => {
  it("picks the higher value when higherIsBetter", () => {
    expect(computeRoundWinner(numberCandidate({ key: "hp", values: [300, 315], higherIsBetter: true }))).toBe(1);
  });

  it("picks the lower value when higherIsBetter is false", () => {
    expect(computeRoundWinner(numberCandidate({ key: "0-100", values: [4.9, 5.3], higherIsBetter: false }))).toBe(0);
  });

  it("returns null on a tie", () => {
    expect(computeRoundWinner(numberCandidate({ key: "hp", values: [300, 300] }))).toBeNull();
  });

  it("returns null for free text (no generic ranking)", () => {
    const candidate: RoundCandidate = {
      key: "drivetrain",
      label: "Drivetrain",
      icon: "cog",
      unit: null,
      dataType: "TEXT",
      visualization: "BADGE",
      higherIsBetter: true,
      priorityWeight: 1,
      displayFormat: null,
      values: [
        { numberValue: null, textValue: "AWD", boolValue: null, displayValue: "AWD" },
        { numberValue: null, textValue: "FWD", boolValue: null, displayValue: "FWD" },
      ],
    };
    expect(computeRoundWinner(candidate)).toBeNull();
  });
});

describe("selectRounds", () => {
  function candidates(): RoundCandidate[] {
    return [
      numberCandidate({ key: "horsepower", label: "Horsepower", priorityWeight: 1.2, values: [300, 315], higherIsBetter: true }),
      numberCandidate({ key: "0_100", label: "0-100", priorityWeight: 1.2, values: [4.9, 5.3], higherIsBetter: false }),
      numberCandidate({ key: "torque", label: "Torque", priorityWeight: 1.0, values: [400, 420], higherIsBetter: true }),
      numberCandidate({ key: "weight", label: "Weight", priorityWeight: 0.8, values: [1475, 1429], higherIsBetter: false }),
      numberCandidate({ key: "top_speed", label: "Top Speed", priorityWeight: 0.7, values: [250, 270], higherIsBetter: true }),
      numberCandidate({ key: "trunk", label: "Trunk", priorityWeight: 0.5, values: [300, 305], higherIsBetter: true }),
      numberCandidate({ key: "seats", label: "Seats", priorityWeight: 0.3, values: [5, 5], higherIsBetter: true }), // no diff
      numberCandidate({ key: "price", label: "Price", priorityWeight: 1.5, values: [39995, 45895], higherIsBetter: false }),
      {
        key: "drivetrain",
        label: "Drivetrain",
        icon: "cog",
        unit: null,
        dataType: "TEXT",
        visualization: "BADGE",
        higherIsBetter: true,
        priorityWeight: 0.8,
        displayFormat: null,
        values: [
          { numberValue: null, textValue: "AWD", boolValue: null, displayValue: "AWD" },
          { numberValue: null, textValue: "FWD", boolValue: null, displayValue: "FWD" },
        ],
      },
      {
        key: "warranty_badge",
        label: "Extended Warranty",
        icon: "shield",
        unit: null,
        dataType: "BOOLEAN",
        visualization: "BADGE",
        higherIsBetter: true,
        priorityWeight: 0.4,
        displayFormat: null,
        values: [
          { numberValue: null, textValue: null, boolValue: true, displayValue: "Yes" },
          { numberValue: null, textValue: null, boolValue: false, displayValue: "No" },
        ],
      },
    ];
  }

  it("always includes price", () => {
    const selected = selectRounds(candidates());
    expect(selected.some((c) => c.key === "price")).toBe(true);
  });

  it("caps badge rounds at one", () => {
    const selected = selectRounds(candidates());
    expect(selected.filter((c) => c.visualization === "BADGE")).toHaveLength(1);
  });

  it("selects between 6 and 8 rounds", () => {
    const selected = selectRounds(candidates());
    expect(selected.length).toBeGreaterThanOrEqual(6);
    expect(selected.length).toBeLessThanOrEqual(8);
  });

  it("excludes zero-differentiation rounds when there are enough alternatives", () => {
    const selected = selectRounds(candidates());
    expect(selected.some((c) => c.key === "seats")).toBe(false);
  });

  it("places price last", () => {
    const selected = selectRounds(candidates());
    expect(selected[selected.length - 1].key).toBe("price");
  });

  it("guarantees at least one round won by each contender when the data allows", () => {
    // Contender 0 only wins on "underdog" here; without the guarantee it'd be
    // crowded out by higher-scoring rounds contender 1 wins.
    const lopsided: RoundCandidate[] = [
      numberCandidate({ key: "a", priorityWeight: 3, values: [10, 100], higherIsBetter: true }),
      numberCandidate({ key: "b", priorityWeight: 3, values: [10, 100], higherIsBetter: true }),
      numberCandidate({ key: "c", priorityWeight: 3, values: [10, 100], higherIsBetter: true }),
      numberCandidate({ key: "d", priorityWeight: 3, values: [10, 100], higherIsBetter: true }),
      numberCandidate({ key: "e", priorityWeight: 3, values: [10, 100], higherIsBetter: true }),
      numberCandidate({ key: "f", priorityWeight: 3, values: [10, 100], higherIsBetter: true }),
      numberCandidate({ key: "underdog", priorityWeight: 0.1, values: [100, 10], higherIsBetter: true }),
      numberCandidate({ key: "price", label: "Price", priorityWeight: 1.5, values: [39995, 45895], higherIsBetter: false }),
    ];

    const selected = selectRounds(lopsided, { min: 6, max: 6 });
    const winners = selected.map((c) => computeRoundWinner(c));
    expect(winners).toContain(0);
    expect(winners).toContain(1);
  });
});

describe("scoreCandidate", () => {
  it("multiplies priorityWeight by normalizedDifference", () => {
    const candidate = numberCandidate({ key: "a", priorityWeight: 2, values: [10, 20] });
    expect(scoreCandidate(candidate)).toBeCloseTo(2 * normalizedDifference(candidate));
  });
});
