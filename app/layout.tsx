import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Bukeng - Food Credit When You Need It',
  description: "Africa's first Buy Now Pay Later platform built exclusively for food.",
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/logo-192.png', type: 'image/png', sizes: '192x192' },
      { url: '/web-app-manifest-512x512.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Bukeng',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className={inter.className}>
        <main className="min-h-screen bg-gray-50 md:flex md:justify-center">
          <div className="md:max-w-md md:w-full md:shadow-xl md:min-h-screen md:relative">
            {children}
          </div>
        </main>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}