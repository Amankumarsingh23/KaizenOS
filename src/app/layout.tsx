import type { Metadata, Viewport } from "next";
import { Newsreader, DM_Sans, JetBrains_Mono } from "next/font/google";
import { Providers } from "@/components/Providers";
import "./globals.css";

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title:       "KaizenOS",
  description: "Your personal growth operating system — continuous improvement, every day.",
  applicationName: "KaizenOS",
  manifest: "/manifest.json",
  appleWebApp: {
    capable:          true,
    statusBarStyle:   "default",
    title:            "KaizenOS",
    startupImage:     "/icon-apple.png",
  },
  icons: {
    icon:        [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple:       [{ url: "/icon-apple.png", sizes: "180x180" }],
    shortcut:    "/icon.svg",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor:           "#6B8F71",
  width:                "device-width",
  initialScale:          1,
  maximumScale:          1,
  userScalable:          false,
  viewportFit:          "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${newsreader.variable} ${dmSans.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <head>
        {/* Theme — runs synchronously before paint to prevent flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('kaizen-theme')||'light';document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`,
          }}
        />
        {/* PWA */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="KaizenOS" />
        <link rel="apple-touch-icon" href="/icon-apple.png" />
        <meta name="apple-touch-fullscreen" content="yes" />
      </head>
      <body className="min-h-full flex flex-col bg-cream text-ink">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
