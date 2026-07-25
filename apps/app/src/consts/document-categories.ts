// Category taxonomy for the Documents module. Unlike Places' grouped multi-select
// (GeoPlace.categories, a String[]), a document has exactly ONE category — flat
// list, no groups. Keys are stable English identifiers persisted in
// Document.category; human labels come from i18n (`Documents.cat_<key>`).
//
// Adding a category = append a key here + add its `cat_<key>` label to all three
// locale files. Never rename an existing key (it would orphan stored rows).

const CATEGORIES = [
  "birth_certificate",
  "marriage_certificate",
  "death_certificate",
  "identity_document",
  "medical",
  "education",
  "immigration",
  "military",
  "legal",
  "correspondence",
  "other",
] as const

export type DocumentCategory = (typeof CATEGORIES)[number]

// Widened to a plain readonly array (not the literal `as const` tuple type) so
// `DOCUMENT_CATEGORIES as [string, ...string[]]` in the Zod schema type-checks —
// mirrors place-categories.ts's PLACE_CATEGORIES annotation exactly.
export const DOCUMENT_CATEGORIES: readonly DocumentCategory[] = CATEGORIES

const CATEGORY_SET: ReadonlySet<string> = new Set(DOCUMENT_CATEGORIES)

export function isDocumentCategory(value: string): value is DocumentCategory {
  return CATEGORY_SET.has(value)
}
