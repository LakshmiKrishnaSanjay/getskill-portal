import type { Metadata } from 'next'
import localFont from 'next/font/local'
import { Analytics } from '@vercel/analytics/next'
import { AppProvider } from '@/lib/app-context'
import { DataProvider } from '@/lib/data-context'
import { ThemeProvider } from '@/components/theme-provider'
import './globals.css'

const redHatDisplay = localFont({
  src: [
    {
      path: '../public/fonts/RedHatDisplay-VariableFont_wght.ttf',
      weight: '300 900',
      style: 'normal',
    },
  ],
  variable: '--font-red-hat-display',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Pixel Pluz Portal',
  description: 'Creative tech education operating system',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-mark-white.svg',
        type: 'image/svg+xml',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon-mark-colour.svg',
        type: 'image/svg+xml',
        media: '(prefers-color-scheme: light)',
      },
    ],
    apple: '/pixel-pluz-logo.svg.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${redHatDisplay.variable} font-sans antialiased bg-background text-foreground`}
      >
        <ThemeProvider>
          <AppProvider>
            <DataProvider>{children}</DataProvider>
          </AppProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}