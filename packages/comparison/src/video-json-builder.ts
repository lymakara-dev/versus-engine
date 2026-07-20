import { videoInputSchema, type Contender, type Round, type VideoInput, type Verdict } from "@versus-engine/shared";
import { computeRoundWinner, type RoundCandidate } from "./round-selection.js";

const PRICE_KEY = "price";
const DEFAULT_ICON = "circle";

function pickSfxForRound(candidate: RoundCandidate): string {
  if (candidate.key === PRICE_KEY) return "cash";
  if (candidate.visualization === "COUNTER") return "whoosh-ding";
  return "ding";
}

/**
 * Rounds need one numeric value per contender for the schema even when the
 * underlying data isn't numeric (BADGE/TEXT rounds). The winner (if any)
 * gets 1 and everyone else 0 — the Badge component only reads winnerIndex
 * and displayValue, so these numbers are never rendered.
 */
function encodeValues(candidate: RoundCandidate, winnerIndex: number | null): number[] {
  if (candidate.dataType === "NUMBER") {
    return candidate.values.map((v) => v.numberValue ?? 0);
  }
  if (candidate.dataType === "BOOLEAN") {
    return candidate.values.map((v) => (v.boolValue ? 1 : 0));
  }
  return candidate.values.map((_, index) => (winnerIndex === index ? 1 : 0));
}

function buildRound(candidate: RoundCandidate): Round {
  const winnerIndex = computeRoundWinner(candidate);
  return {
    label: candidate.label,
    icon: candidate.icon ?? DEFAULT_ICON,
    visualization: candidate.visualization.toLowerCase() as Round["visualization"],
    unit: candidate.unit,
    higherIsBetter: candidate.higherIsBetter,
    values: encodeValues(candidate, winnerIndex),
    displayValues: candidate.values.map((v) => v.displayValue),
    winnerIndex,
    sfx: pickSfxForRound(candidate),
    specKey: candidate.key,
  };
}

export interface ContenderInput {
  name: string;
  brand: string;
  price: string;
  imageUrl: string;
  logoUrl: string;
  accentColor: string;
}

export interface BuildVideoInputOptions {
  title: string;
  category: string;
  theme: string;
  aspect?: "16:9" | "9:16";
  fps?: number;
  resolution?: { width: number; height: number };
  music: { src: string; loop: boolean; volumeDb: number };
  contenders: ContenderInput[];
  selectedRounds: RoundCandidate[];
  tagline: string;
  verdictSfx?: string;
}

const RESOLUTION_BY_ASPECT: Record<"16:9" | "9:16", { width: number; height: number }> = {
  "16:9": { width: 1920, height: 1080 },
  "9:16": { width: 1080, height: 1920 },
};

/** Pure builder: selected rounds + contender metadata -> the VideoInput contract. Persistence lives in build-comparison.ts. */
export function buildVideoInput(options: BuildVideoInputOptions): VideoInput {
  const aspect = options.aspect ?? "16:9";
  const rounds = options.selectedRounds.map(buildRound);

  const scores = new Array(options.contenders.length).fill(0);
  for (const round of rounds) {
    if (round.winnerIndex !== null) scores[round.winnerIndex]++;
  }
  const maxScore = Math.max(...scores);
  const leaders = scores.reduce<number[]>((acc, score, index) => {
    if (score === maxScore) acc.push(index);
    return acc;
  }, []);
  const winnerIndex = leaders.length === 1 ? leaders[0] : null;

  const verdict: Verdict = {
    winnerIndex,
    scores,
    tagline: options.tagline,
    sfx: options.verdictSfx ?? "drumroll-confetti",
  };

  const contenders: Contender[] = options.contenders.map((c) => ({
    name: c.name,
    brand: c.brand,
    price: c.price,
    imageUrl: c.imageUrl,
    logoUrl: c.logoUrl,
    accentColor: c.accentColor,
  }));

  return videoInputSchema.parse({
    meta: {
      title: options.title,
      category: options.category,
      theme: options.theme,
      aspect,
      fps: options.fps ?? 30,
      resolution: options.resolution ?? RESOLUTION_BY_ASPECT[aspect],
    },
    music: options.music,
    contenders,
    rounds,
    verdict,
  });
}
