import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers  from "@/utils/provider";
import NavBar from "@/components/NavBar";
import { Bricolage_Grotesque } from "next/font/google";
const geistSans = Bricolage_Grotesque({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Bricolage_Grotesque({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FigMint: Figma to Story IP Minting",
  description: "FigMint : Unleashing the superpower of Story Protocol to turn Figma designs into living IP mint, license, and earn royalties as your creativity evolves on-chain.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          <div>
            {/* Global navbar available on all pages (fixed) */}
            <NavBar />
            {/* spacer matching navbar height so page content doesn't sit under it */}

            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
