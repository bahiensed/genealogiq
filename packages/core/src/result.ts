// Canonical discriminated result for server actions and shared APIs.
//
//   const r = await someAction(input)
//   if (!r.ok) { toast.error(r.message); return }
//   // r.ok === true here; r.data is the typed payload, r.message an optional toast
//
// `message` is the user-facing string (already localized by the action via
// next-intl's getTranslations). `data` is the optional typed payload for actions
// that return something beyond success/failure (e.g. a checkout URL).
//
// Helpers:
//   done(message?)     success that only needs a (localized) toast message — the common case
//   ok(data, message?) success that carries a typed payload (e.g. { url })
//   fail(message)      failure with a (localized) message
export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; message: string }

export const ok = <T = undefined>(data?: T, message?: string): ActionResult<T> => ({
  ok: true,
  data,
  message,
})

export const done = (message?: string): ActionResult => ({ ok: true, message })

export const fail = (message: string): ActionResult<never> => ({ ok: false, message })
