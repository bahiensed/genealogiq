import { PackageForm } from '@/components/packages/package-form'

export default function NewPhysicalPackagePage() {
  return <PackageForm fixedType="PHYSICAL" backHref="/physical-qr" />
}
