// Canonical discriminated result for server actions and shared APIs.
// New/shared code returns this; legacy ad-hoc shapes migrate opportunistically.
export type Result<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string }

export const ok = <T>(data: T): Result<T> => ({ ok: true, data })
export const err = (error: string): Result<never> => ({ ok: false, error })
