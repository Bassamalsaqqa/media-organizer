import type { Metadata } from 'next';
import './globals.css';
import { APP_NAME, APP_DESCRIPTION } from '@/config/constants';
import { Toaster } from '@/components/ui/toaster';

export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_DESCRIPTION,
};

import { GlobalErrorHandler } from '@/components/error-handler';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&family=Source+Code+Pro&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased">
        <GlobalErrorHandler>{children}</GlobalErrorHandler>
        <Toaster />
      </body>
    </html>
  );
}
