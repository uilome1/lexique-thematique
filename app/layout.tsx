// app/layout.tsx

import type { Metadata } from "next";
// Importez le ClerkProvider ici
import { ClerkProvider } from '@clerk/nextjs'; 
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Inter } from 'next/font/google'

export const dynamic = 'force-dynamic'

const inter = Inter({ subsets: ['latin'] })

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lexique Thématique",
  description: "Diagnostic mode",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    // AJOUTEZ CETTE PROPRIÉTÉ (PROP)
    <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}> 
      <html lang="fr">
        <body className={inter.className}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}