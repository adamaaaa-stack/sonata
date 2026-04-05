import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sonata",
  description: "Learn to read piano sheet music",
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Outfit:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ margin: 0, padding: 0, background: "#0C0A09" }}>
        {children}
      </body>
    </html>
  );
}
