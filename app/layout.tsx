import type { Metadata, Viewport } from "next";
import {
  Plus_Jakarta_Sans,
  Inter,
  Fraunces,
  Noto_Sans_Devanagari,
} from "next/font/google";
import { getTheme } from "@/lib/theme";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

/**
 * The serif exists for one job: names. A printed community directory sets its
 * families in a serif, and that association — not decoration — is what makes
 * the profile and household heroes read as a yearbook page rather than a
 * form readout. It is deliberately absent from buttons, chips and body text.
 */
const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-fraunces",
  display: "swap",
});

/**
 * Jakarta and Inter carry Latin only. Committee names, meeting titles and
 * announcements get typed in Hindi, and without a Devanagari face in the
 * stack those glyphs fall back to whatever the OS picks — a different
 * typeface appearing mid-name. Noto Sans Devanagari is drawn to sit beside
 * Inter, and next/font self-hosts the subset, so the fix costs one request
 * at build time and nothing at runtime.
 */
const devanagari = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-devanagari",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sadharmik",
  description:
    "The private member directory of Shri Jain Shwetambar (Murtipujak) Marwadi Samaj, Indore. Find members and discover what they do.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "Sadharmik",
    statusBarStyle: "default",
  },
  // A private community directory must never be indexed
  robots: { index: false, follow: false, nocache: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Zoom deliberately left enabled
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fdf8f1" },
    { media: "(prefers-color-scheme: dark)", color: "#16110e" },
  ],
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const theme = await getTheme();

  return (
    // Rendered on the server, so the right theme is in the first byte of HTML
    // and there is never a flash of the wrong colours.
    //
    // The font variables live on <html>, not <body>. The @theme tokens are
    // declared at :root, and Chrome resolves the var() chains inside them at
    // :root too — with the variables one level down on <body>, every token
    // computed to invalid and the whole app silently fell back to system
    // fonts. On <html> the chain resolves where it is read.
    <html
      lang="en"
      data-theme={theme}
      className={`${jakarta.variable} ${inter.variable} ${fraunces.variable} ${devanagari.variable}`}
    >
      <head>
        {/* Only runs for members who chose "Match my phone". Resolves to a
            concrete theme before first paint, which keeps the CSS to a single
            dark block. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var r=document.documentElement;if(r.dataset.theme==='system'){r.dataset.theme=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}}catch(e){}})()`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
