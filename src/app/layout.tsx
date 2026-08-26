import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { POPIS, ZNACKA } from "@/lib/brand";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-app",
});

export const metadata: Metadata = {
  title: {
    default: ZNACKA,
    template: `%s · ${ZNACKA}`,
  },
  description: POPIS,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: ZNACKA,
  },
  icons: {
    icon: "/icons/icon.svg",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf7f2" },
    { media: "(prefers-color-scheme: dark)", color: "#1c1a17" },
  ],
};

/**
 * Ruční volba tématu se propíše třídou na <html> ještě před prvním
 * vykreslením. Bez uložené volby rozhoduje `prefers-color-scheme` v CSS,
 * takže tmavý režim funguje i s vypnutým JavaScriptem.
 */
const THEME_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem('rp-theme');
    if (stored === 'dark' || stored === 'light') {
      document.documentElement.classList.add(stored);
    }
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="cs"
      className={inter.variable}
      // Next jinak varuje, že plynulé rolování rozbíjí přechody mezi stránkami.
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
