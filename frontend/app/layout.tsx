import type { Metadata } from "next";
import { Sora, Geist, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const sora = Sora({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-sora",
  display: "swap",
});

const geist = Geist({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-geist",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Trace | Into the Void — Diagrams to Reality",
  description:
    "Trace transforms your architectural diagrams into executable logic with a cinematic workspace designed for elite developers. Neural mapping meets glassmorphism.",
  keywords: ["AI", "diagrams", "developer tools", "Trace", "architecture", "node mapping"],
  openGraph: {
    title: "Trace — Diagrams to Reality",
    description: "A cinematic workspace for architects of digital systems.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${sora.variable} ${geist.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <head />
      <body className="antialiased" style={{ background: '#000', color: '#e2e2e2' }}>
        {children}
      </body>
    </html>
  );
}
