import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host") ??
    "draftline.openai.site";
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host.includes("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;

  return {
    metadataBase: new URL(origin),
    title: "Draftline — Turn a repository into a story",
    description:
      "Turn a public GitHub repository into a polished, publishable build article.",
    openGraph: {
      title: "Your repository already has a story.",
      description: "From code to a publishable build article.",
      type: "website",
      images: [{ url: `${origin}/og.png`, width: 1672, height: 941 }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Your repository already has a story.",
      description: "From code to a publishable build article.",
      images: [`${origin}/og.png`],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geist.variable}`}>{children}</body>
    </html>
  );
}
