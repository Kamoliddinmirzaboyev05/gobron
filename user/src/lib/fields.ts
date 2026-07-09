import type { Field } from "../types";

/**
 * One card per owner. An owner with several pitches gets represented by the
 * one they added first (lowest id) - the API orders by rating/price, so
 * picking "the first one we happen to see" would surface a different pitch
 * depending on the sort.
 */
export function primaryFieldPerOwner(fields: Field[] | undefined): Field[] {
  const byOwner = new Map<number, Field>();
  for (const f of fields ?? []) {
    const current = byOwner.get(f.owner_id);
    if (!current || f.id < current.id) byOwner.set(f.owner_id, f);
  }
  // Preserve the API's ordering (rating / cheapest / popular).
  return (fields ?? []).filter((f) => byOwner.get(f.owner_id) === f);
}
