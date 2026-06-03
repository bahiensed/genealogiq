import { PackageForm } from '@/components/packages/package-form'

export default async function NewPackagePage() {
  return <PackageForm fixedType="DIGITAL" backHref="/packages" />
}
