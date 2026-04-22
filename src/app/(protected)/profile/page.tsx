import { redirect } from "next/navigation"
import { verifySession } from "@/lib/dal"

export default async function ProfilePage() {
  const session = await verifySession()
  redirect(`/profile/${session.user.id}`)
}
