export interface Release {
  /** Index of the chute this marble drops from. */
  readonly chute: number;
  /** How many marbles this chute has released before this one (drives spawn jitter). */
  readonly nth: number;
}

/** Round-robin across chutes so multiple colored streams fall side by side. */
export function releaseOrder(chutes: readonly { readonly count: number }[]): Release[] {
  const order: Release[] = [];
  const most = chutes.reduce((m, c) => Math.max(m, c.count), 0);
  for (let nth = 0; nth < most; nth++) {
    chutes.forEach((c, chute) => {
      if (nth < c.count) order.push({ chute, nth });
    });
  }
  return order;
}
