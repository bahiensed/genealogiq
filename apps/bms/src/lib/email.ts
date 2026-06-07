// Canonical templates + transport live in @genealogiq/email. This adapter keeps
// the app's call signatures and injects the right base URL per target app.
import {
  sendVerificationEmail as _verify,
  sendEmailChangeEmail as _change,
  sendPasswordResetEmail as _reset,
  sendAccountDeletionEmail as _delete,
  sendWelcomeEmail as _welcome,
} from "@genealogiq/email"

const BMS = () => process.env.BMS_URL ?? ""
const SEQUOIA = () => process.env.SEQUOIA_URL ?? ""

export const sendVerificationEmail   = (to: string, token: string) => _verify({ to, token, baseUrl: BMS() })
export const sendEmailChangeEmail    = (to: string, token: string) => _change({ to, token, baseUrl: BMS() })
export const sendPasswordResetEmail  = (to: string, token: string) => _reset({ to, token, baseUrl: BMS() })
export const sendAccountDeletionEmail = (to: string) => _delete({ to })
export const sendWelcomeEmail        = (to: string, token: string) => _welcome({ to, token, baseUrl: BMS() })
export const sendSequoiaWelcomeEmail = (to: string, token: string) => _welcome({ to, token, baseUrl: SEQUOIA(), productName: "Sequoia" })
