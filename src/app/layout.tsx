import type { Metadata } from "next";
import { ClerkProvider } from '@clerk/nextjs'
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
        <head>
          {/* Google Translate — free, auto-detects user language */}
          <script type="text/javascript" src="//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit" async />
          <script dangerouslySetInnerHTML={{ __html: `
            function googleTranslateElementInit() {
              new google.translate.TranslateElement({
                pageLanguage: 'en',
                autoDisplay: true,
                layout: google.translate.TranslateElement.InlineLayout.SIMPLE,
                multilanguagePage: true
              }, 'google_translate_element');
            }
          `}} />
        </head>
        <body className="h-full antialiased" style={{ background: '#0A0F1E', color: '#fff' }}>
          {/* Hidden translate anchor — Google auto-shows the bar when language differs from browser */}
          <div id="google_translate_element" style={{ position: 'absolute', top: 0, right: 0, zIndex: 9999, opacity: 0, pointerEvents: 'none', height: 0, overflow: 'hidden' }} />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
