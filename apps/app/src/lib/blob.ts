import { del } from "@vercel/blob"

export async function deleteBlobs(urls: (string | null | undefined)[]) {
  const toDelete = urls.filter((u): u is string => typeof u === "string" && u.length > 0)
  if (toDelete.length === 0) return
  try {
    await del(toDelete)
  } catch {
    // Blob deletion failure must not block the DB operation
  }
}
