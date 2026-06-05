import type { Metadata } from "next";
import { ClerkProvider } from '@clerk/nextjs'
import "./globals.css";

export const metadata: Metadata = {
  title: "Airportr Academy",
  description: "Airportr's learning management platform — courses, guides, and training content.",
  icons: { icon: '/logo.png' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" className="h-full">
        <body className="h-full antialiased" style={{ background: '#0A0F1E', color: '#fff' }}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
