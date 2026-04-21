import { notFound } from "next/navigation"
import { TreePine, BookOpen, Images, Heart, Flower2, BrickWall } from "lucide-react"
import { verifySession } from "@/lib/dal"
import { getProfileById } from "@/queries/profile"
import { ProfileBanner, type ProfileData } from "@/components/profile-banner"
import { BentoGrid, type SectionCard } from "@/components/bento-grid"
import { AuroraBackdrop } from "@/components/aurora-backdrop"
import {
  TreePreview,
  BioPreview,
  GalleryPreview,
  TributesPreview,
  FavoritesPreview,
  GuardianPreview,
} from "@/components/card-previews"

const galleryImages = ["/cover-living.jpg", "/avatar-living.jpg", "/cover-memorial.jpg", "/avatar-memorial.jpg"]

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
}

export default async function ProfilePage() {
  const session = await verifySession()
  const user = await getProfileById(session.user.id)

  if (!user) notFound()

  const name = `${user.firstName} ${user.lastName}`
  const initials = `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()

  const profile: ProfileData = {
    id: user.id,
    name,
    initials,
    type: "living",
    avatarUrl: user.avatarUrl,
    birth: user.birthDate
      ? { date: formatDate(user.birthDate), place: user.birthPlace ?? "", country: user.birthCountry }
      : null,
    death: null,
    tributes: 0,
    favoritedBy: 0,
    mediaTotal: 0,
    isOwn: true,
  }

  const cards: SectionCard[] = [
    {
      key: "tree",
      title: "Family Tree",
      description: "Roots, branches and the quiet ties that bind generations.",
      metric: "0 generations • 0 profiles",
      icon: TreePine,
      span: 4,
      preview: <TreePreview />,
      href: "/profile/tree",
    },
    {
      key: "bio",
      title: "Biography",
      description: "A life told in chapters — moments, places and turning points.",
      metric: "0 chapters",
      icon: BookOpen,
      span: 2,
      preview: <BioPreview />,
      href: "/profile/bio",
    },
    {
      key: "gallery",
      title: "Gallery",
      description: "Images and moments worth remembering.",
      metric: "0 memories",
      icon: Images,
      span: 3,
      preview: <GalleryPreview images={galleryImages} />,
      href: "/profile/gallery",
    },
    {
      key: "tributes",
      title: "Tributes",
      description: "Messages celebrating shared experiences and memories.",
      metric: "0 tributes",
      icon: Flower2,
      span: 3,
      preview: <TributesPreview />,
      href: "/profile/tributes",
    },
    {
      key: "favorites",
      title: "Favorites",
      description: "People who carry deep meaning — kept close, always.",
      metric: "0 favorited profiles",
      icon: Heart,
      span: 3,
      preview: <FavoritesPreview />,
      href: "/favorites",
    },
    {
      key: "guardian",
      title: "Profiles I guard",
      description: "Memorials watched over with quiet care.",
      metric: "0 profiles",
      icon: BrickWall,
      span: 3,
      preview: <GuardianPreview />,
      href: "/memorialized",
    },
  ]

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      <AuroraBackdrop variant="page" intensity="bold" />
      <main className="relative z-10">
        <ProfileBanner profile={profile} />
        <BentoGrid cards={cards} />
      </main>
    </div>
  )
}
