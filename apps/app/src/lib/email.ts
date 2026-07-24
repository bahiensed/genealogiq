// Canonical templates + transport live in @genealogiq/email. This adapter keeps
// the app's call signatures and injects the APP base URL.
import {
  sendAppConsumerVerificationEmail as _verify,
  sendEmailChangeEmail as _change,
  sendPasswordResetEmail as _reset,
  sendAccountDeletionEmail as _delete,
  sendFeedbackEmail as _feedback,
  sendAppAccountExistsEmail as _accountExists,
  type FeedbackEmail,
} from "@genealogiq/email"

const APP = () => process.env.APP_URL ?? ""

// Site-owner inbox for the footer's "Report a bug" / "Send feedback" dialogs —
// never client-controllable (not part of the submitted form/schema).
const FEEDBACK_TO = "douglas@rohling.com.br"

// Self-sign-up verification uses the Genealogiq-branded consumer template (PT),
// mirroring the welcome email — same brand copy, "confirm email" call to action.
export const sendVerificationEmail   = (to: string, token: string, name?: string, callbackUrl?: string) => _verify({ to, token, baseUrl: APP(), name, callbackUrl })
export const sendEmailChangeEmail    = (to: string, token: string) => _change({ to, token, baseUrl: APP() })
export const sendPasswordResetEmail  = (to: string, token: string) => _reset({ to, token, baseUrl: APP() })
export const sendAccountDeletionEmail = (to: string) => _delete({ to })
// Sent instead of a verification link when sign-up hits an email already in
// use — see the doc comment on the shared template for why.
export const sendAccountExistsEmail  = (to: string, name?: string) => _accountExists({ to, baseUrl: APP(), name })
export const sendFeedback = (data: Omit<FeedbackEmail, "to" | "contactEmail">) => _feedback({ ...data, to: FEEDBACK_TO })
