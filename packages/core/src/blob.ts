/**
 * Pinned Vercel Blob host. Uploaded-media URLs persisted to the DB must point
 * here, never an arbitrary external origin — otherwise a tampered client could
 * store an off-site `<img>`/media `src` that is then rendered on profile,
 * memorial, gallery and tribute pages (a stored tracking-pixel / viewer-IP leak).
 * BMS/SEQ already pin the avatar host with this exact pattern; APP schemas use it
 * via @genealogiq/core so all three apps share one source of truth.
 */
export const BLOB_URL_PATTERN = /^https:\/\/[^/]+\.public\.blob\.vercel-storage\.com\//
