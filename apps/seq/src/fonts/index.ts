import { Geist, Spectral } from 'next/font/google'

// Corpo / UI — sans humanista, limpa e moderna
export const geist = Geist({
  subsets: ['latin'],
  variable: '--font-sans',
})

// Títulos — serifada elegante (Editorial)
export const spectral = Spectral({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-spectral',
})
