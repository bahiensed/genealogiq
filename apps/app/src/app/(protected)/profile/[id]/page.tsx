import { notFound } from "next/navigation"
import { getLocale, getTranslations } from "next-intl/server"
import { getCountryName } from "@genealogiq/core"
import { Network, BookOpen, Images, Heart, Flower2, BrickWall, MapPin, QrCode } from "lucide-react"
import { auth } from "@/auth"
import { getProfileById } from "@/queries/profile"
import { isFavoritedByUser, getFavoriteCount, getFavoritesByUserId } from "@/queries/favorite"
import { getGeolocationForViewer } from "@/queries/geolocation"
import { getMemorialsByCreatorId } from "@/queries/memorial"
import { countTreeMembers } from "@/queries/family-tree"
import { getGalleryImageUrls, getGalleryCount, getGalleryHasVideos } from "@/queries/gallery"
import { getTributeAuthors, getTributeCountByProfileId } from "@/queries/tribute"
import { getBioByUserId } from "@/queries/bio"
import { getAvatarColor, getProfileGradient } from "@/lib/avatar-color"
import { ProfileBanner, type ProfileData } from "@/components/profile-banner"
import { BentoGrid, type SectionCard } from "@/components/bento-grid"
import { AuroraBackdrop } from "@/components/aurora-backdrop"
import { ProfileViewTracker } from "@/components/profile-view-tracker"
import { QrScanTracker } from "@/components/qr-scan-tracker"
import type { MiniProfile } from "@/components/profile-mini-card"
import {
  TreePreview,
  BioPreview,
  GalleryPreview,
  TributesPreview,
  FavoritesPreview,
  GuardianPreview,
  GeoPreview,
  QrPreview,
} from "@/components/card-previews"

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
}

interface Props {
  params: Promise<{ id: string }>
}

export default async function ProfileByIdPage({ params }: Props) {
  const { id } = await params
  const session = await auth()
  const sessionUserId = session?.user?.id

  const user = await getProfileById(id)
  if (!user) notFound()

  const isOwn = sessionUserId ? user.id === sessionUserId : false
  const isMemorialized = user.role === "APP_MEMO"
  const isGuardian = isMemorialized && sessionUserId
    ? user.guardedBy.some((g) => g.guardianId === sessionUserId)
    : false
  const name = `${user.firstName} ${user.lastName}`
  const initials = `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()

  const [
    favoritedBy,
    isFavoritedByMe,
    geo,
    galleryImages,
    galleryCount,
    galleryHasVideos,
    tributeAuthors,
    tributeCount,
    favorites,
    memorials,
    bio,
    treeCount,
  ] = await Promise.all([
    getFavoriteCount(id),
    isOwn || !sessionUserId ? Promise.resolve(false) : isFavoritedByUser(sessionUserId, id),
    isMemorialized ? getGeolocationForViewer(id) : Promise.resolve(null),
    getGalleryImageUrls(id, 4),
    getGalleryCount(id),
    getGalleryHasVideos(id),
    getTributeAuthors(id, 5),
    getTributeCountByProfileId(id),
    !isMemorialized ? getFavoritesByUserId(id) : Promise.resolve([]),
    !isMemorialized ? getMemorialsByCreatorId(id) : Promise.resolve([]),
    getBioByUserId(id),
    countTreeMembers(id),
  ])

  const hasBio = !!bio && !!(bio.text || bio.quote || bio.images.length > 0)
  const memorialCount = memorials.length
  const isFreeMemorial = isMemorialized && user.appSaleId == null && user.physicalQrLicense == null
  const showQrPurchaseCTA = isFreeMemorial && isGuardian
  const showQrVisitorEmpty = isFreeMemorial && !isGuardian

  const profile: ProfileData = {
    id: user.id,
    name,
    initials,
    avatarColor: getAvatarColor(user.id),
    type: isMemorialized ? "memorialized" : "living",
    avatarUrl: user.avatarUrl,
    birth: user.birthDate
      ? { date: formatDate(user.birthDate), place: user.birthPlace ?? "", country: user.birthCountry }
      : null,
    death: user.deathDate
      ? { date: formatDate(user.deathDate), place: user.deathPlace ?? "", country: user.deathCountry }
      : null,
    geo: geo ? { lat: geo.lat, lon: geo.lon } : null,
    tributes: tributeCount,
    favoritedBy,
    mediaTotal: galleryCount,
    isOwn,
    isGuardian,
    guardedCount: memorialCount,
    isFavoritedByMe,
  }

  const base = `/profile/${id}`
  const t = await getTranslations("Profile")

  const treeCard: SectionCard = {
    key: "tree",
    title: t("treeTitle"),
    description: t("treeDescription"),
    metric: treeCount > 1 ? t("treeMetric", { count: treeCount }) : t("treeEmptyMetric"),
    icon: Network,
    span: 4,
    preview: <TreePreview memberCount={treeCount} />,
    href: `${base}/tree`,
  }

  const bioCard: SectionCard = {
    key: "bio",
    title: t("bioTitle"),
    description: t("bioDescription"),
    metric: hasBio ? t("bioMetric") : t("bioEmptyMetric"),
    icon: BookOpen,
    span: 2,
    preview: <BioPreview hasBio={hasBio} initial1={user.firstName[0]} initial2={user.lastName[0]} />,
    href: `${base}/bio`,
  }

  const galleryCard: SectionCard = {
    key: "gallery",
    title: t("galleryTitle"),
    description: t("galleryDescription"),
    metric: galleryCount > 0 ? t("galleryMetric", { count: galleryCount }) : t("galleryEmptyMetric"),
    icon: Images,
    span: 3,
    preview: <GalleryPreview images={galleryImages} hasVideos={galleryHasVideos} />,
    href: `${base}/gallery`,
  }

  const tributesCard: SectionCard = {
    key: "tributes",
    title: t("tributesTitle"),
    description: t("tributesDescription"),
    metric: tributeCount > 0 ? t("tributesMetric", { count: tributeCount }) : t("tributesEmptyMetric"),
    icon: Flower2,
    span: 3,
    preview: <TributesPreview authors={tributeAuthors} />,
    href: `${base}/tributes`,
  }

  const memorializedCards: SectionCard[] = [
    treeCard,
    bioCard,
    galleryCard,
    tributesCard,
    {
      key: "geo",
      title: t("geoTitle"),
      description: t("geoDescription"),
      metric: geo ? geo.placeName : t("geoEmptyMetric"),
      icon: MapPin,
      span: 3,
      preview: <GeoPreview lat={geo?.lat} lon={geo?.lon} />,
      href: `${base}/geolocation`,
    },
    {
      key: "qr",
      title: t("qrTitle"),
      description: t("qrDescription"),
      metric: showQrPurchaseCTA
        ? t("qrMetricPurchase")
        : showQrVisitorEmpty
          ? t("qrMetricNotGenerated")
          : t("qrMetricReady"),
      icon: QrCode,
      span: 3,
      preview: <QrPreview />,
      ...(showQrPurchaseCTA ? { gated: true } : { href: `${base}/qr-code` }),
    },
  ]

  const livingCards: SectionCard[] = [
    treeCard,
    bioCard,
    galleryCard,
    tributesCard,
    {
      key: "favorites",
      title: t("favoritesTitle"),
      description: t("favoritesDescription"),
      metric: favorites.length > 0 ? t("favoritesMetric", { count: favorites.length }) : t("favoritesEmptyMetric"),
      icon: Heart,
      span: 3,
      preview: <FavoritesPreview favorites={favorites} />,
      href: `${base}/favorites`,
    },
    {
      key: "guardian",
      title: t("guardianTitle"),
      description: t("guardianDescription"),
      metric: memorialCount > 0 ? t("guardianMetric", { count: memorialCount }) : t("guardianEmptyMetric"),
      icon: BrickWall,
      span: 3,
      preview: <GuardianPreview memorials={memorials} />,
      href: `${base}/memorialized`,
    },
  ]

  const locale = await getLocale()
  const miniProfile: MiniProfile = {
    id: user.id,
    name,
    subtitle: user.birthPlace
      ? `${user.birthPlace}${user.birthCountry ? `, ${getCountryName(user.birthCountry, locale)}` : ""}`
      : isMemorialized ? "Memorialized profile" : "",
    status: isMemorialized ? "Memorialized" : "Living",
    metric: isMemorialized && user.deathDate
      ? `✦ ${user.deathDate.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}`
      : user.birthDate
        ? `Born ${user.birthDate.toLocaleDateString("en-US", { year: "numeric", month: "short" })}`
        : "",
    initials,
    gradient: getProfileGradient(user.id),
    href: `/profile/${user.id}`,
    avatarUrl: user.avatarUrl,
  }

  return (
    <div className="min-h-screen relative overflow-x-hidden mt-16">
      <AuroraBackdrop variant="page" intensity="bold" />
      <ProfileViewTracker profile={miniProfile} />
      {isMemorialized && (user.appSaleId != null || user.physicalQrLicense != null) && (
        <QrScanTracker profileId={id} />
      )}
      <main className="relative z-10">
        <ProfileBanner profile={profile} />
        <BentoGrid cards={isMemorialized ? memorializedCards : livingCards} />
      </main>
    </div>
  )
}
