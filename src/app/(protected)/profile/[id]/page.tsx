import { notFound } from "next/navigation"
import { TreePine, BookOpen, Images, Heart, Flower2, BrickWall, MapPin, QrCode } from "lucide-react"
import { verifySession } from "@/lib/dal"
import { getProfileById } from "@/queries/profile"
import { isFavoritedByUser, getFavoriteCount, getFavoritesByUserId } from "@/queries/favorite"
import { getGeolocationByUserId } from "@/queries/geolocation"
import { getMemorialsByCreatorId } from "@/queries/memorial"
import { getFamilyRelationCount } from "@/queries/family-tree"
import { getGalleryImageUrls, getGalleryCount } from "@/queries/gallery"
import { getTributeAuthors, getTributeCountByProfileId } from "@/queries/tribute"
import { getBioByUserId } from "@/queries/bio"
import { getAvatarColor, getProfileGradient } from "@/lib/avatar-color"
import { ProfileBanner, type ProfileData } from "@/components/profile-banner"
import { BentoGrid, type SectionCard } from "@/components/bento-grid"
import { AuroraBackdrop } from "@/components/aurora-backdrop"
import { ProfileViewTracker } from "@/components/profile-view-tracker"
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
  const session = await verifySession()

  const user = await getProfileById(id)
  if (!user) notFound()

  const isOwn = user.id === session.user.id
  const isMemorialized = user.role === "APP_MEMO"
  const isGuardian = isMemorialized && user.guardedBy.some((g) => g.guardianId === session.user.id)
  const name = `${user.firstName} ${user.lastName}`
  const initials = `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()

  const [
    favoritedBy,
    isFavoritedByMe,
    geo,
    galleryImages,
    galleryCount,
    tributeAuthors,
    tributeCount,
    favorites,
    memorials,
    bio,
    treeCount,
  ] = await Promise.all([
    getFavoriteCount(id),
    isOwn ? Promise.resolve(false) : isFavoritedByUser(session.user.id, id),
    isMemorialized ? getGeolocationByUserId(id) : Promise.resolve(null),
    getGalleryImageUrls(id, 4),
    getGalleryCount(id),
    getTributeAuthors(id, 5),
    getTributeCountByProfileId(id),
    !isMemorialized ? getFavoritesByUserId(id) : Promise.resolve([]),
    !isMemorialized ? getMemorialsByCreatorId(id) : Promise.resolve([]),
    getBioByUserId(id),
    getFamilyRelationCount(id),
  ])

  const hasBio = !!bio && !!(bio.text || bio.quote || bio.images.length > 0)
  const memorialCount = memorials.length
  const isFreeMemorial = isMemorialized && user.appSaleId == null
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
    tributes: tributeCount,
    favoritedBy,
    mediaTotal: galleryCount,
    isOwn,
    isGuardian,
    guardedCount: memorialCount,
    isFavoritedByMe,
  }

  const base = `/profile/${id}`

  const memorializedCards: SectionCard[] = [
    {
      key: "tree",
      title: "Family Tree",
      description: "Roots, branches and the quiet ties that bind generations.",
      metric: treeCount > 0 ? `${treeCount} ${treeCount === 1 ? "member" : "members"}` : "No members yet",
      icon: TreePine,
      span: 4,
      preview: <TreePreview />,
      href: `${base}/tree`,
    },
    {
      key: "bio",
      title: "Biography",
      description: "A life told in chapters — moments, places and turning points.",
      metric: hasBio ? "Read" : "No biography yet",
      icon: BookOpen,
      span: 2,
      preview: <BioPreview />,
      href: `${base}/bio`,
    },
    {
      key: "gallery",
      title: "Gallery",
      description: "Images and moments worth remembering.",
      metric: galleryCount > 0 ? `${galleryCount} ${galleryCount === 1 ? "memory" : "memories"}` : "No media yet",
      icon: Images,
      span: 3,
      preview: <GalleryPreview images={galleryImages} />,
      href: `${base}/gallery`,
    },
    {
      key: "tributes",
      title: "Tributes",
      description: "Messages celebrating shared experiences and memories.",
      metric: tributeCount > 0 ? `${tributeCount} ${tributeCount === 1 ? "tribute" : "tributes"}` : "No tributes yet",
      icon: Flower2,
      span: 3,
      preview: <TributesPreview authors={tributeAuthors} />,
      href: `${base}/tributes`,
    },
    {
      key: "geo",
      title: "Geolocation",
      description: "A point of departure — and a place to meet again, from anywhere.",
      metric: geo ? geo.placeName : "Not set",
      icon: MapPin,
      span: 3,
      preview: <GeoPreview lat={geo?.lat} lon={geo?.lon} />,
      href: `${base}/geolocation`,
    },
    {
      key: "qr",
      title: "QR Code",
      description: "For plaques, headstones and digital spaces alike.",
      metric: showQrPurchaseCTA
        ? "Purchase to unlock"
        : showQrVisitorEmpty
          ? "Not yet generated"
          : "Ready to print",
      icon: QrCode,
      span: 3,
      preview: <QrPreview />,
      ...(showQrPurchaseCTA ? { gated: true } : { href: `${base}/qr-code` }),
    },
  ]

  const livingCards: SectionCard[] = [
    {
      key: "tree",
      title: "Family Tree",
      description: "Roots, branches and the quiet ties that bind generations.",
      metric: treeCount > 0 ? `${treeCount} ${treeCount === 1 ? "member" : "members"}` : "No members yet",
      icon: TreePine,
      span: 4,
      preview: <TreePreview />,
      href: `${base}/tree`,
    },
    {
      key: "bio",
      title: "Biography",
      description: "A life told in chapters — moments, places and turning points.",
      metric: hasBio ? "Read" : "No biography yet",
      icon: BookOpen,
      span: 2,
      preview: <BioPreview />,
      href: `${base}/bio`,
    },
    {
      key: "gallery",
      title: "Gallery",
      description: "Images and moments worth remembering.",
      metric: galleryCount > 0 ? `${galleryCount} ${galleryCount === 1 ? "memory" : "memories"}` : "No media yet",
      icon: Images,
      span: 3,
      preview: <GalleryPreview images={galleryImages} />,
      href: `${base}/gallery`,
    },
    {
      key: "tributes",
      title: "Tributes",
      description: "Messages celebrating shared experiences and memories.",
      metric: tributeCount > 0 ? `${tributeCount} ${tributeCount === 1 ? "tribute" : "tributes"}` : "No tributes yet",
      icon: Flower2,
      span: 3,
      preview: <TributesPreview authors={tributeAuthors} />,
      href: `${base}/tributes`,
    },
    {
      key: "favorites",
      title: "Favorites",
      description: "People who carry deep meaning — kept close, always.",
      metric: favorites.length > 0 ? `${favorites.length} ${favorites.length === 1 ? "Favorite" : "Favorites"}` : "No favorites yet",
      icon: Heart,
      span: 3,
      preview: <FavoritesPreview favorites={favorites} />,
      href: `${base}/favorites`,
    },
    {
      key: "guardian",
      title: "Profiles I guard",
      description: "Memorials watched over with quiet care.",
      metric: memorialCount > 0
        ? `${memorialCount} ${memorialCount === 1 ? "profile" : "profiles"}`
        : "No profiles guarded yet",
      icon: BrickWall,
      span: 3,
      preview: <GuardianPreview memorials={memorials} />,
      href: `${base}/memorialized`,
    },
  ]

  const miniProfile: MiniProfile = {
    id: user.id,
    name,
    subtitle: user.birthPlace
      ? `${user.birthPlace}${user.birthCountry ? `, ${user.birthCountry}` : ""}`
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
      <main className="relative z-10">
        <ProfileBanner profile={profile} />
        <BentoGrid cards={isMemorialized ? memorializedCards : livingCards} />
      </main>
    </div>
  )
}
