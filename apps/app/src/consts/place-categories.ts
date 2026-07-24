// Category taxonomy for the Geolocalizações (plural) module. Categories are
// grouped into larger life-stage buckets to guide the user toward the kinds of
// places worth registering. Keys are stable English identifiers persisted in
// GeoPlace.categories (a String[]); human labels come from i18n
// (`Places.cat_<key>` for items, `Places.catgroup_<group>` for groups).
//
// Adding a category = append a key here + add its `cat_<key>` label to all three
// locale files. Never rename an existing key (it would orphan stored rows).

export const PLACE_CATEGORY_GROUPS = [
  { group: "origins",       categories: ["birth", "childhood_home", "baptism_church"] },
  { group: "education",     categories: ["school", "university", "course"] },
  { group: "relationships", categories: ["first_kiss", "first_date", "wedding", "honeymoon"] },
  { group: "family",        categories: ["family_home", "grandparents_home", "children_birth"] },
  { group: "work",          categories: ["first_job", "workplace", "business"] },
  { group: "leisure",       categories: ["vacation_spot", "hobby", "favorite_place", "travel", "sport"] },
  { group: "milestones",    categories: ["achievement", "military_service", "immigration"] },
  { group: "final",         categories: ["resting_place", "memorial_site"] },
] as const

export type PlaceCategoryGroup = (typeof PLACE_CATEGORY_GROUPS)[number]["group"]

export type PlaceCategory =
  (typeof PLACE_CATEGORY_GROUPS)[number]["categories"][number]

// Flat list of every valid category key — used by the Zod schema to validate
// incoming category arrays and by the selector UI.
export const PLACE_CATEGORIES: readonly PlaceCategory[] = PLACE_CATEGORY_GROUPS.flatMap(
  (g) => g.categories,
) as PlaceCategory[]

const CATEGORY_SET: ReadonlySet<string> = new Set(PLACE_CATEGORIES)

export function isPlaceCategory(value: string): value is PlaceCategory {
  return CATEGORY_SET.has(value)
}

// The group a category belongs to (for coloring pins / grouping badges).
export function groupOfCategory(category: string): PlaceCategoryGroup | null {
  const found = PLACE_CATEGORY_GROUPS.find((g) =>
    (g.categories as readonly string[]).includes(category),
  )
  return found ? found.group : null
}
