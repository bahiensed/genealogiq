import { getMemorialFeatures } from "@/lib/subscription"
import { countMemorialsByCreatorId } from "@/queries/memorial"

export interface MemorialCreationStatus {
  count: number
  limit: number
  allowed: boolean
}

// Consolidates what used to be three independent, disagreeing
// implementations of "can this guardian create another memorial" (a
// hardcoded MAX_MEMORIALS=2 page guard, a real free-tier rule of "1" in
// createMemorial, and a third ad hoc paid-slot formula in the list page)
// into one shared check, driven by the guardian's own resolved plan
// (features.memorialsMax). This governs whether the guardian may create
// another memorial at all — separate from, and unrelated to, whether a
// specific new memorial gets bound to a legacy paid AppSale slot (still
// handled independently in createMemorial via maxProfiles/nextSale).
export async function getMemorialCreationStatus(guardianId: string): Promise<MemorialCreationStatus> {
  const [count, features] = await Promise.all([
    countMemorialsByCreatorId(guardianId),
    getMemorialFeatures(guardianId),
  ])
  return { count, limit: features.memorialsMax, allowed: count < features.memorialsMax }
}
