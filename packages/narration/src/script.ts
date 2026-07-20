import { computeRoundTimeRangesSec, computeSceneBoundariesSec, type Round, type VideoInput } from "@versus-engine/shared";

export interface NarrationLine {
  /** Stable id used for the synthesized audio file name, e.g. "hook", "round-2", "verdict". */
  id: string;
  text: string;
  /** Where this line should start on the full composition timeline. */
  anchorSec: number;
}

const HOOK_LEAD_SEC = 0.3;
const ROUND_LEAD_SEC = 0.4;
const VERDICT_LEAD_SEC = 1;

function describeRound(round: Round, contenders: VideoInput["contenders"]): string {
  const readings = contenders.map((c, i) => `${c.name}: ${round.displayValues[i]}`).join(". ");
  const winnerLine =
    round.winnerIndex !== null ? `${contenders[round.winnerIndex].name} takes this round.` : "It's a tie.";
  return `${round.label}. ${readings}. ${winnerLine}`;
}

/**
 * Turns a frozen VideoInput into narration lines with absolute timeline
 * anchors — pure and category-agnostic (only reads the generic
 * contenders/rounds/verdict shape every category already produces), so it
 * never needs to know it's describing cars vs phones vs laptops
 * (CLAUDE.md prime directive #1).
 */
export function buildNarrationScript(
  input: Pick<VideoInput, "meta" | "contenders" | "rounds" | "verdict">,
): NarrationLine[] {
  const boundaries = computeSceneBoundariesSec(input);
  const roundRanges = computeRoundTimeRangesSec(input);

  const lines: NarrationLine[] = [
    { id: "hook", text: `${input.meta.title}.`, anchorSec: boundaries.introStartSec + HOOK_LEAD_SEC },
  ];

  input.rounds.forEach((round, index) => {
    lines.push({
      id: `round-${index}`,
      text: describeRound(round, input.contenders),
      anchorSec: roundRanges[index].startSec + ROUND_LEAD_SEC,
    });
  });

  lines.push({
    id: "verdict",
    text: input.verdict.tagline,
    anchorSec: boundaries.winnerRevealStartSec + VERDICT_LEAD_SEC,
  });

  return lines;
}
