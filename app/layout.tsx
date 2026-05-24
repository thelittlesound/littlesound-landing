import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Little Sound | Family Activity Planning Platform',
  description: 'Discover, plan, and book kids\' activities in one place. Less searching. More living. Families first.',
  keywords: 'kids activities, camps, Seattle, family planning, activity booking',
  openGraph: {
    title: 'Little Sound',
    description: 'Discover, plan, and book kids\' activities in one place.',
    url: 'https://thelittlesound.com',
    siteName: 'Little Sound',
    images: [
      {
        url: 'https://thelittlesound.com/og-image.png',
        width: 1200,
        height: 630,
      },
    ],
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Google Analytics */}
        <script
          async
          src={`https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX`}
        ></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-XXXXXXXXXX', {
                page_path: window.location.pathname,
              });
            `,
          }}
        ></script>
        
        {/* Favicon */}
        <link rel="icon" href="/favicon.ico" />
        
        {/* Fonts are loaded via CSS @import */}
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
