import type { Metadata } from "next";
import { ClerkProvider } from '@clerk/nextjs'
import Script from 'next/script'
import "./globals.css";

export const metadata: Metadata = {
  title: "Airportr Academy",
  description: "Airportr's learning management platform — courses, guides, and training content.",
  icons: { icon: '/logo.png' },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Airportr Academy',
  },
  themeColor: '#001228',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" className="h-full">
        <head />
        <body className="h-full antialiased" style={{ background: '#0A0F1E', color: '#fff' }}>
          {/* Hidden translate anchor */}
          <div id="google_translate_element" style={{ position: 'absolute', top: 0, right: 0, zIndex: 9999, opacity: 0, pointerEvents: 'none', height: 0, overflow: 'hidden' }} />
          {children}
          {/* Google Translate */}
          <Script id="google-translate-init" strategy="beforeInteractive">{`
            function googleTranslateElementInit() {
              new google.translate.TranslateElement({
                pageLanguage: 'en',
                autoDisplay: true,
                layout: google.translate.TranslateElement.InlineLayout.SIMPLE,
                multilanguagePage: true
              }, 'google_translate_element');
            }
          `}</Script>
          <Script src="//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit" strategy="afterInteractive" />
        </body>
      </html>
    </ClerkProvider>
  );
}
