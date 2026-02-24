import type { Metadata } from "next";
import { Inter, Geist } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-inter",
  display: "swap",
});

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Trace – Turn Diagrams into Reality",
  description: "Trace transforms your diagrams and sketches into working code and real implementations instantly. The AI-powered diagramming tool for builders.",
  keywords: ["AI", "diagrams", "code generation", "developer tools", "Trace"],
  openGraph: {
    title: "Trace – Turn Diagrams into Reality",
    description: "Transform diagrams into working code instantly with AI.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${geist.variable}`}>
      <body className={`antialiased noise-overlay ${inter.className}`}>
        {children}
      </body>
    </html>
  );
}

