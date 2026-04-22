import localFont from 'next/font/local'

export const inter = localFont({
  src: [
    {
      path: '../../public/fonts/inter/inter-latin-wght-normal.woff2',
      style: 'normal',
    },
    {
      path: '../../public/fonts/inter/inter-latin-wght-italic.woff2',
      style: 'italic',
    },
  ],
  variable: '--font-sans',
  display: 'swap',
})
