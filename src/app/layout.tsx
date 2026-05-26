import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { AIConfigProvider } from "@/context/AIConfigContext";
import { BrandIdentityProvider } from "@/context/BrandIdentityContext";

export const metadata: Metadata = {
  title: "RSMedium Generatore",
  description: "Studio de generation de contenus social media et blog",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="antialiased">
        <AIConfigProvider>
          <BrandIdentityProvider>{children}</BrandIdentityProvider>
        </AIConfigProvider>
      </body>
    </html>
  );
}
