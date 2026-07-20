/** Tallies round wins into the overall verdict. Ties (null winner) score nobody. */
export function computeVerdict(
  winnerIndexes: Array<number | null>,
  contenderCount: number,
): { winnerIndex: number | null; scores: number[] } {
  const scores = new Array(contenderCount).fill(0);
  for (const winner of winnerIndexes) {
    if (winner !== null) scores[winner]++;
  }

  const max = Math.max(...scores);
  const leaders = scores.reduce<number[]>((acc, score, index) => {
    if (score === max) acc.push(index);
    return acc;
  }, []);

  return {
    winnerIndex: leaders.length === 1 ? leaders[0] : null,
    scores,
  };
}
