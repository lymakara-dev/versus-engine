/**
 * Takes the top `count` entries from a ranked list and pairs them
 * consecutively (0v1, 2v3, ...). An odd one out at the end is dropped —
 * every video needs exactly two contenders.
 */
export function pairTopRanked<T>(ranked: T[], count: number): [T, T][] {
  const top = ranked.slice(0, count);
  const pairs: [T, T][] = [];
  for (let i = 0; i + 1 < top.length; i += 2) {
    pairs.push([top[i], top[i + 1]]);
  }
  return pairs;
}
