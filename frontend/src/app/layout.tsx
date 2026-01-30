import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'WokTalk 鑊氣 | AI Cooking Assistant',
  description: 'AI-powered cooking assistant that transforms YouTube cooking videos into localized Hong Kong Cantonese learning experiences.',
  keywords: ['cooking', 'cantonese', 'language learning', 'AI', 'recipe', 'Hong Kong'],
  authors: [{ name: 'WokTalk' }],
  manifest: '/manifest.json',
  icons: {
    icon: '/icon.svg',
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#1A1A2E',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Prevent accidental zoom while cooking
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
