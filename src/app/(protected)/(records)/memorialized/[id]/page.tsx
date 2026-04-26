import { notFound } from 'next/navigation'
import { getDeceased } from '@/queries/deceased'
import { MemorializedForm } from '@/components/memorialized/memorialized-form'
import { QrCodeDownload } from '@/components/ui/qr-code-download'
import type { DeceasedFormValues } from '@/schemas/deceased.schema'

const BASE_URL = 'https://www.genealogiq.app'

export default async function MemorializedDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const deceased = await getDeceased(id)
  if (!deceased) notFound()

  const defaultValues: DeceasedFormValues = {
    firstName:          deceased.firstName,
    lastName:           deceased.lastName,
    gender:             (deceased.gender as DeceasedFormValues['gender']) ?? 'MALE',
    birthDate:          deceased.birthDate ? deceased.birthDate.toISOString().slice(0, 10) : '',
    birthCity:          deceased.birthCity          ?? '',
    birthState:         deceased.birthState         ?? '',
    birthCountry:       deceased.birthCountry       ?? '',
    deathDate:          deceased.deathDate ? deceased.deathDate.toISOString().slice(0, 10) : '',
    deathCause:         deceased.deathCause         ?? '',
    deathCity:          deceased.deathCity          ?? '',
    deathState:         deceased.deathState         ?? '',
    deathCountry:       deceased.deathCountry       ?? '',
    burialDate:         deceased.burialDate,
    burialLatitude:     deceased.burialLatitude  !== null ? Number(deceased.burialLatitude)  : null,
    burialLongitude:    deceased.burialLongitude !== null ? Number(deceased.burialLongitude) : null,
    burialSite:         deceased.burialSite         ?? '',
    burialZip:          deceased.burialZip          ?? '',
    burialStreet:       deceased.burialStreet       ?? '',
    burialNumber:       deceased.burialNumber       ?? '',
    burialComplement:   deceased.burialComplement   ?? '',
    burialNeighborhood: deceased.burialNeighborhood ?? '',
    burialCity:         deceased.burialCity         ?? '',
    burialState:        deceased.burialState        ?? '',
    burialCountry:      deceased.burialCountry      ?? '',
    fb:                 deceased.fb                 ?? '',
    instagram:          deceased.instagram          ?? '',
    linkedin:           deceased.linkedin           ?? '',
    tiktok:             deceased.tiktok             ?? '',
    x:                  deceased.x                  ?? '',
    youtube:            deceased.youtube            ?? '',
    otherSocial:        deceased.otherSocial        ?? '',
    website:            deceased.website            ?? '',
    notes:              deceased.notes              ?? '',
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">
          {deceased.firstName} {deceased.lastName}
        </h1>
        <div className="shrink-0 pt-1">
          <QrCodeDownload
            value={`${BASE_URL}/${id}`}
            filename={`qr-${deceased.firstName}-${deceased.lastName}`}
            previewSize={80}
          />
        </div>
      </div>

      <MemorializedForm id={id} defaultValues={defaultValues} />
    </div>
  )
}
