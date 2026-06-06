import { createHash } from "crypto"

/**
 * Hashes a raw token for at-rest storage. The RAW token is what we email to the
 * user (reset/verification link); only its SHA-256 hash is persisted, so a DB
 * leak never exposes usable tokens.
 *
 * MUST stay byte-identical across all three apps: some tokens are issued by one
 * app and consumed by another (e.g. a SEQ vendor welcome token is redeemed via
 * the APP password-reset flow). The pinned-vector test guards against drift.
 */
export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex")
}
