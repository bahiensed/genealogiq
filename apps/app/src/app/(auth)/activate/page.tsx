import { AuthCard } from '@/components/auth/auth-card'
import { ActivateCodeForm } from '@/components/qr/activate-code-form'

export default function ActivatePage() {
  return (
    <AuthCard
      title="Activate your QR code"
      description="Enter the activation code printed on your physical QR code to link it to a memorial."
    >
      <ActivateCodeForm />
    </AuthCard>
  )
}
