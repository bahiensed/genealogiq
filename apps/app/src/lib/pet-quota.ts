import { getMemorialFeatures } from "@/lib/subscription"
import { countPetsByCreatorId } from "@/queries/pet"

export interface PetCreationStatus {
  count: number
  limit: number
  allowed: boolean
}

// Mirrors getMemorialCreationStatus — governs whether this guardian may
// create another pet at all, driven by their own resolved plan
// (features.petsMax). Pets have no legacy paid-slot concept to separately
// bind to (that's memorial-only), so unlike createMemorial there's no second
// check alongside this one.
export async function getPetCreationStatus(guardianId: string): Promise<PetCreationStatus> {
  const [count, features] = await Promise.all([
    countPetsByCreatorId(guardianId),
    getMemorialFeatures(guardianId),
  ])
  return { count, limit: features.petsMax, allowed: count < features.petsMax }
}
