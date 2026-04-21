import type { Metadata } from "next";
import "./globals.css";
import NativeAuthHandler from "@/components/NativeAuthHandler";

export const metadata: Metadata = {
  metadataBase: new URL("https://learnwithsonata.com"),
  title: {
    default: "Sonata — Learn to Read Piano Sheet Music",
    template: "%s | Sonata",
  },
  description:
    "Learn to read piano sheet music in days, not years. The Sonata method teaches reading by distance, not memorisation. From zero to Moonlight Sonata with 23 interactive lessons.",
  keywords: [
    "learn piano",
    "read sheet music",
    "piano lessons",
    "sight reading",
    "learn to read music",
    "piano sheet music",
    "beginner piano",
    "music theory",
    "piano for beginners",
    "interval reading",
    "learn piano online",
    "free piano lessons",
  ],
  authors: [{ name: "Adam Morris" }],
  creator: "Adam Morris",
  publisher: "Sonata",
  alternates: {
    canonical: "https://learnwithsonata.com",
  },
  openGraph: {
    title: "Sonata — Learn to Read Piano Sheet Music",
    description:
      "From zero to Moonlight Sonata. Learn to read sheet music by distance, not by memorising note names. 23 interactive lessons, a curated piano library, free to try.",
    url: "https://learnwithsonata.com",
    siteName: "Sonata",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Sonata — Learn to Read Piano Sheet Music",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sonata — Learn to Read Piano Sheet Music",
    description:
      "From zero to Moonlight Sonata in days, not years. The revolutionary interval-reading method.",
    images: ["/og-image.png"],
    creator: "@adammorris",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon.svg", sizes: "any" },
    ],
    apple: "/icon.svg",
  },
  manifest: "/manifest.json",
  category: "education",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1, user-scalable=no" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Sonata" />
        <meta name="format-detection" content="telephone=no" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,700;0,900;1,500;1,700;1,900&family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem('sonata_theme')==='parchment'){document.documentElement.classList.add('parchment');}}catch(e){}`,
          }}
        />
      </head>
      <body style={{ margin: 0, padding: 0, background: "#FFF6E4" }}>
        <NativeAuthHandler />
        {children}
      </body>
    </html>
  );
}
