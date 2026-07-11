import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Providers } from './providers';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: {
    default: 'Zatoshi',
    template: '%s | Zatoshi',
  },
  description:
    'Zatoshi — premium e-commerce platform offering quality products with exceptional customer service. Shop the latest collection online.',
  keywords: ['ecommerce', 'shop', 'store', 'online shopping'],
  openGraph: {
    title: 'Zatoshi',
    description: 'Zatoshi — premium e-commerce platform offering quality products.',
    type: 'website',
    locale: 'en_US',
    siteName: 'Zatoshi',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="flex min-h-screen flex-col">
        <Providers>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
