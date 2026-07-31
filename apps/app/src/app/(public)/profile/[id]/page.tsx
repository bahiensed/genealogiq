import { getLocale, getTranslations } from "next-intl/server"
import { Network, BookOpenText, Images, Heart, Flower, BrickWall, MapPin, FileText, PawPrint } from "lucide-react"
import { auth } from "@/auth"
import { getProfileById, redactLivingProfile } from "@/queries/profile"
import { isFavoritedByUser, getFavoriteCount, getFavoritesByUserId } from "@/queries/favorite"
import { getGeolocationForViewer } from "@/queries/geolocation"
import { getMemorialsByCreatorId } from "@/queries/memorial"
import { countTreeMembers } from "@/queries/family-tree"
import { getGalleryImageUrls, getGalleryCount, getGalleryHasVideos } from "@/queries/gallery"
import { getPlacesForMap } from "@/queries/places"
import { getDocumentsByUserId, getDocumentsCount } from "@/queries/documents"
import { getTributeAuthors, getTributeCountByProfileId } from "@/queries/tribute"
import { getBioByUserId } from "@/queries/bio"
import { getAvatarColor } from "@/lib/avatar-color"
import { canManageProfile } from "@/lib/profile"
import { assertPublicMemorialAccess } from "@/lib/public-profile-access"
import { ProfileBanner, type ProfileData } from "@/components/profile-banner"
import { BentoGrid, type SectionCard } from "@/components/bento-grid"
import { AuroraBackdrop } from "@/components/aurora-backdrop"
import { ProfileViewTracker } from "@/components/profile-view-tracker"
import { QrScanTracker } from "@/components/qr-scan-tracker"
import {
  TreePreview,
  BioPreview,
  GalleryPreview,
  TributesPreview,
  FavoritesPreview,
  GuardianPreview,
  PlacesPreview,
  DocumentsPreview,
  PetsPreview,
} from "@/components/card-previews"
import { formatDateLong } from "@/lib/format-date"

interface Props {
  params: Promise<{ id: string }>
}

export default async function ProfileByIdPage({ params }: Props) {
  const { id } = await params
  const session = await auth()
  const sessionUserId = session?.user?.id

  const isAnon = !sessionUserId
  const rawUser = await getProfileById(id)
  assertPublicMemorialAccess(rawUser, sessionUserId, id)

  const isOwn = sessionUserId ? rawUser.id === sessionUserId : false
  const isMemorialized = rawUser.role === "APP_MEMO"
  const isPet = rawUser.role === "APP_PET"

  const isGuardian = isMemorialized && sessionUserId
    ? rawUser.guardedBy.some((g) => g.guardianId === sessionUserId)
    : false
  const guardians = isMemorialized
    ? rawUser.guardedBy.map((g) => ({ id: g.guardianId, firstName: g.guardian.firstName }))
    : []

  // Redact this living person's exact birth/death date+place for any viewer
  // who isn't the owner or an accepted guardian — same rule getFamilyTree()
  // applies when this person appears in someone ELSE's tree. Kept separate
  // from isOwn/isGuardian above (which are memorial-guardian-specific and
  // feed the edit-pencil visibility) to avoid any behavior change there.
  const canManageThis = sessionUserId ? canManageProfile(rawUser, sessionUserId) : false
  const user = redactLivingProfile(rawUser, { id: sessionUserId ?? null, canManage: canManageThis })

  // Pets have no lastName (empty string) — avoid a trailing space / bogus
  // second initial for them.
  const name = user.lastName ? `${user.firstName} ${user.lastName}` : user.firstName
  const initials = (user.lastName ? `${user.firstName[0]}${user.lastName[0]}` : user.firstName.slice(0, 2)).toUpperCase()

  const [
    favoritedBy,
    isFavoritedByMe,
    geo,
    galleryImages,
    galleryCount,
    galleryHasVideos,
    placesPins,
    tributeAuthors,
    tributeCount,
    favorites,
    memorials,
    bio,
    treeCount,
    documentsPreview,
    documentsCount,
  ] = await Promise.all([
    getFavoriteCount(id),
    isOwn || !sessionUserId ? Promise.resolve(false) : isFavoritedByUser(sessionUserId, id),
    isMemorialized ? getGeolocationForViewer(id) : Promise.resolve(null),
    getGalleryImageUrls(id, 4),
    getGalleryCount(id),
    getGalleryHasVideos(id),
    getPlacesForMap(id),
    getTributeAuthors(id, 5),
    getTributeCountByProfileId(id),
    !isMemorialized && !isPet ? getFavoritesByUserId(id, sessionUserId) : Promise.resolve([]),
    !isMemorialized && !isPet ? getMemorialsByCreatorId(id) : Promise.resolve([]),
    getBioByUserId(id),
    countTreeMembers(id),
    // Preview/metric only ever reflect PUBLIC documents unless the viewer can
    // manage this profile — private documents must never reach an unauthorized
    // viewer's RSC payload, even just as a title in the bento-card preview.
    getDocumentsByUserId(id, { includePrivate: canManageThis, take: 3 }),
    getDocumentsCount(id, canManageThis),
  ])

  const hasBio = !!bio && !!(bio.text || bio.quote || bio.images.length > 0)
  const memorialCount = memorials.length

  const locale = await getLocale()

  const profile: ProfileData = {
    id: user.id,
    name,
    initials,
    avatarColor: getAvatarColor(user.id),
    type: isMemorialized ? "memorialized" : isPet ? "pet" : "living",
    avatarUrl: user.avatarUrl,
    birth: user.birthDate
      ? { date: formatDateLong(user.birthDate, locale), place: user.birthPlace ?? "", country: user.birthCountry }
      : user.birthYear
        ? { date: String(user.birthYear), place: "", country: null, yearOnly: true }
        : null,
    death: user.deathDate
      ? { date: formatDateLong(user.deathDate, locale), place: user.deathPlace ?? "", country: user.deathCountry }
      : user.deathYear
        ? { date: String(user.deathYear), place: "", country: null, yearOnly: true }
        : null,
    geo: geo ? { lat: geo.lat, lon: geo.lon } : null,
    tributes: tributeCount,
    favoritedBy,
    mediaTotal: galleryCount,
    isOwn,
    isGuardian,
    guardians,
    guardedCount: memorialCount,
    isFavoritedByMe,
    isAuthenticated: !!sessionUserId,
  }

  const base = `/profile/${id}`
  const t = await getTranslations("Profile")

  const treeCard: SectionCard = {
    key: "tree",
    title: t("treeTitle"),
    description: t("treeDescription"),
    metric: treeCount > 1 ? t("treeMetric", { count: treeCount }) : t("treeEmptyMetric"),
    icon: Network,
    span: 2,
    preview: <TreePreview memberCount={treeCount} />,
    href: `${base}/tree`,
  }

  const bioCard: SectionCard = {
    key: "bio",
    title: t("bioTitle"),
    description: t("bioDescription"),
    metric: hasBio ? t("bioMetric") : t("bioEmptyMetric"),
    icon: BookOpenText,
    span: 2,
    preview: <BioPreview hasBio={hasBio} initial1={user.firstName[0]} initial2={user.lastName[0]} />,
    href: `${base}/bio`,
  }

  const documentsCard: SectionCard = {
    key: "documents",
    title: t("documentsTitle"),
    description: t("documentsDescription"),
    metric: documentsCount > 0 ? t("documentsMetric", { count: documentsCount }) : t("documentsEmptyMetric"),
    icon: FileText,
    span: 2,
    preview: <DocumentsPreview documents={documentsPreview} />,
    href: `${base}/documents`,
  }

  const galleryCard: SectionCard = {
    key: "gallery",
    title: t("galleryTitle"),
    description: t("galleryDescription"),
    metric: galleryCount > 0 ? t("galleryMetric", { count: galleryCount }) : t("galleryEmptyMetric"),
    icon: Images,
    span: 2,
    preview: <GalleryPreview images={galleryImages} hasVideos={galleryHasVideos} />,
    href: `${base}/gallery`,
  }

  const tributesCard: SectionCard = {
    key: "tributes",
    title: t("tributesTitle"),
    description: t("tributesDescription"),
    metric: tributeCount > 0 ? t("tributesMetric", { count: tributeCount }) : t("tributesEmptyMetric"),
    icon: Flower,
    span: 2,
    preview: <TributesPreview authors={tributeAuthors} />,
    href: `${base}/tributes`,
  }

  const placesCard: SectionCard = {
    key: "places",
    title: t("placesTitle"),
    description: t("placesDescription"),
    metric: placesPins.length > 0 ? t("placesMetric", { count: placesPins.length }) : t("placesEmptyMetric"),
    icon: MapPin,
    span: 2,
    preview: <PlacesPreview pins={placesPins} />,
    href: `${base}/places`,
  }

  const memorializedCards: SectionCard[] = [
    treeCard,
    bioCard,
    documentsCard,
    galleryCard,
    placesCard,
    tributesCard,
  ]

  // Pets get the memorial-style modules minus the guestbook — no
  // tributes/QR for pets in v1 (see plan). Bio/Gallery/Documents/Places
  // previews are already generic over any profile id.
  const petCards: SectionCard[] = [
    treeCard,
    bioCard,
    documentsCard,
    galleryCard,
    placesCard,
  ]

  const livingCards: SectionCard[] = [
    treeCard,
    bioCard,
    documentsCard,
    galleryCard,
    placesCard,
    tributesCard,
    {
      key: "favorites",
      title: t("favoritesTitle"),
      description: t("favoritesDescription"),
      metric: favorites.length > 0 ? t("favoritesMetric", { count: favorites.length }) : t("favoritesEmptyMetric"),
      icon: Heart,
      span: 2,
      preview: <FavoritesPreview favorites={favorites} />,
      // /favorites and /memorialized are verifySession()-gated (bare redirect
      // to sign-in, no callbackUrl, none of the polished SignupDialog/Prompt
      // treatment the other cards get) — an anonymous visitor gets a jarring
      // dead end if they click through, so the card stays href-less (inert,
      // same pattern the Pets placeholder below always uses) while anonymous.
      ...(isAnon ? {} : { href: `${base}/favorites` }),
    },
    {
      key: "guardian",
      title: t("guardianTitle"),
      description: t("guardianDescription"),
      metric: memorialCount > 0 ? t("guardianMetric", { count: memorialCount }) : t("guardianEmptyMetric"),
      icon: BrickWall,
      span: 2,
      preview: <GuardianPreview memorials={memorials} />,
      ...(isAnon ? {} : { href: `${base}/memorialized` }),
    },
    {
      // Inert placeholder for now — the Pets module (queries/actions/UI) is
      // fully built (see pet.actions.ts/pets-client.tsx/etc.) and still
      // reachable by direct URL, but isn't surfaced from this grid yet
      // pending a few more polish passes. No href, so BentoGrid renders a
      // plain non-clickable div (same fallback favorites/guardian use for
      // anon visitors) instead of a Link. Preview forced to the empty state
      // regardless of real pet count so the card doesn't leak data that
      // contradicts its own "coming soon" caption.
      key: "pets",
      title: t("petsTitle"),
      description: t("petsDescription"),
      metric: t("petsComingSoon"),
      icon: PawPrint,
      span: 2,
      preview: <PetsPreview pets={[]} />,
    },
  ]

  // Raw data for the recently-viewed cache — display strings (subtitle, metric,
  // status badge) are formatted at render time under the active locale.
  const recentProfile = {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    birthPlace: user.birthPlace ?? null,
    birthCountry: user.birthCountry ?? null,
    isMemorialized,
    birthDate: user.birthDate?.toISOString() ?? null,
    deathDate: user.deathDate?.toISOString() ?? null,
    birthYear: user.birthYear,
    deathYear: user.deathYear,
    avatarUrl: user.avatarUrl ?? null,
  }

  return (
    <div className="relative overflow-x-hidden mt-16">
      <AuroraBackdrop variant="page" intensity="bold" />
      <ProfileViewTracker profile={recentProfile} />
      {isMemorialized && (user.appSaleId != null || user.physicalQrLicense != null) && (
        <QrScanTracker profileId={id} />
      )}
      <main className="relative z-10">
        <ProfileBanner profile={profile} />
        <BentoGrid cards={isMemorialized ? memorializedCards : isPet ? petCards : livingCards} />
      </main>
    </div>
  )
}
