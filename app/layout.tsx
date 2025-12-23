import type { Metadata } from "next";
import { ClerkProvider } from '@clerk/nextjs';
import { frFR } from '@clerk/localizations';
import "./globals.css";

export const metadata: Metadata = {
  title: "Lexique Thematique",
  description: "Mon lexique personnel",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
 return (
    <ClerkProvider localization={frFR}>
      <html lang="fr" suppressHydrationWarning> 
        <body suppressHydrationWarning> 
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}