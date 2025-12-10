// app/layout.tsx (CORRIGÉ)

import type { Metadata } from "next";
import { ClerkProvider } from '@clerk/nextjs'; 
// ✅ Supprimé : import { Geist, Geist_Mono } from "next/font/google"; 
import "./globals.css";
import { Inter } from 'next/font/google' // <-- Seule l'importation Inter est conservée

export const dynamic = 'force-dynamic'

const inter = Inter({ subsets: ['latin'] })

// ❌ Supprimé : const geistSans = Geist({ ... });
// ❌ Supprimé : const geistMono = Geist_Mono({ ... });

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
    <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}> 
      <html lang="fr">
        <body className={inter.className}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}