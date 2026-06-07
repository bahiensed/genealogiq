// Canonical templates + transport live in @genealogiq/email. This adapter keeps
// the app's call signatures and injects the APP base URL.
import {
  sendVerificationEmail as _verify,
  sendEmailChangeEmail as _change,
  sendPasswordResetEmail as _reset,
  sendAccountDeletionEmail as _delete,
} from "@genealogiq/email"

const APP = () => process.env.APP_URL ?? ""

export const sendVerificationEmail   = (to: string, token: string) => _verify({ to, token, baseUrl: APP() })
export const sendEmailChangeEmail    = (to: string, token: string) => _change({ to, token, baseUrl: APP() })
export const sendPasswordResetEmail  = (to: string, token: string) => _reset({ to, token, baseUrl: APP() })
export const sendAccountDeletionEmail = (to: string) => _delete({ to })
