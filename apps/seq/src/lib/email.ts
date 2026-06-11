// Canonical templates + transport live in @genealogiq/email. This adapter keeps
// the app's call signatures and injects the right base URL per target app.
import {
  sendVerificationEmail as _verify,
  sendEmailChangeEmail as _change,
  sendPasswordResetEmail as _reset,
  sendAccountDeletionEmail as _delete,
  sendAppConsumerWelcomeEmail as _appWelcome,
  sendSequoiaWelcomeEmail as _seqWelcome,
} from "@genealogiq/email"

const SEQUOIA = () => process.env.SEQUOIA_URL ?? ""
const APP = () => process.env.APP_URL ?? ""

export const sendVerificationEmail   = (to: string, token: string) => _verify({ to, token, baseUrl: SEQUOIA() })
export const sendEmailChangeEmail    = (to: string, token: string) => _change({ to, token, baseUrl: SEQUOIA() })
export const sendPasswordResetEmail  = (to: string, token: string) => _reset({ to, token, baseUrl: SEQUOIA() })
export const sendAccountDeletionEmail = (to: string) => _delete({ to })
export const sendWelcomeEmail        = (to: string, token: string, name?: string) => _seqWelcome({ to, token, baseUrl: SEQUOIA(), name })
export const sendAppWelcomeEmail     = (to: string, token: string, name?: string) => _appWelcome({ to, token, baseUrl: APP(), name })
