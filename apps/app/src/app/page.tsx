import { redirect } from 'next/navigation'

export default function RootPage() {
  // Unauthenticated visitors land on sign-in; the edge middleware bounces
  // already-authenticated users from /sign-in to /home.
  redirect('/sign-in')
}
