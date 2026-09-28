/** Thread economy: at or under par is perfect; solving always earns a star. */
export function starsFor(threadsUsed: number, par: number): 1 | 2 | 3 {
  if (threadsUsed <= par) return 3;
  if (threadsUsed === par + 1) return 2;
  return 1;
}
