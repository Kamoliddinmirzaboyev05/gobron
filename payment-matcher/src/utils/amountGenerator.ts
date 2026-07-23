/**
 * Unique payment amount generator.
 *
 * Formula: uniqueAmount = baseAmount + tip, tip ∈ [1, 99]
 * Guarantees the result is not in the `taken` set (active pending intents).
 *
 * Used by the FastAPI backend in production; kept here for parity / tests /
 * optional standalone tooling.
 */
export function generateUniqueAmount(baseAmount: number, taken: Set<number>): number {
  if (!Number.isInteger(baseAmount) || baseAmount < 1) {
    throw new Error("baseAmount must be a positive integer (so'm)");
  }

  const tips = Array.from({ length: 99 }, (_, i) => i + 1);
  // Fisher–Yates shuffle
  for (let i = tips.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [tips[i], tips[j]] = [tips[j], tips[i]];
  }

  for (const tip of tips) {
    const amount = baseAmount + tip;
    if (!taken.has(amount)) return amount;
  }

  throw new Error("No free unique amount available (all tips 1–99 taken)");
}
