import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const viewport: Viewport = {
  // Letterlight gold — affects mobile browser chrome (address bar, etc.)
  themeColor: "#C9A96E",
};

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Letterlight Co. — Marquee Letter Rentals | Indianapolis, IN",
  description:
    "Premium illuminated marquee letter rentals for weddings and events in Indianapolis and surrounding Indiana. Real-time availability, live-controlled LED lighting, white glove delivery.",
  keywords:
    "marquee letter rental Indianapolis, marquee letter rental Brownsburg, LED letter rental Indiana, wedding letter rental, marquee letters wedding",
  metadataBase: new URL("https://letterlightco.com"),
  openGraph: {
    type: "website",
    url: "https://letterlightco.com",
    siteName: "Letterlight Co.",
    title: "Letterlight Co. — Marquee Letter Rentals | Indianapolis, IN",
    description:
      "Premium illuminated marquee letter rentals for weddings and events in Indianapolis and surrounding Indiana. Real-time availability, live-controlled LED lighting, white glove delivery.",
    images: [
      {
        url: "/gallery-1.png",
        width: 1200,
        height: 630,
        alt: "Illuminated MR & MRS marquee letters at a wedding reception",
      },
    ],
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Letterlight Co. — Marquee Letter Rentals | Indianapolis, IN",
    description:
      "Premium illuminated marquee letter rentals for weddings and events in Indianapolis and surrounding Indiana.",
    images: ["/gallery-1.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${cormorant.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "LocalBusiness",
              name: "Letterlight Co.",
              description:
                "Premium illuminated marquee letter rentals for weddings and events in the Indianapolis metro area.",
              url: "https://letterlightco.com",
              telephone: "+13177278341",
              email: "mike@mrcwoodproducts.com",
              address: {
                "@type": "PostalAddress",
                addressLocality: "Brownsburg",
                addressRegion: "IN",
                addressCountry: "US",
              },
              areaServed: [
                { "@type": "City", name: "Indianapolis" },
                { "@type": "City", name: "Brownsburg" },
                { "@type": "City", name: "Carmel" },
                { "@type": "City", name: "Fishers" },
                { "@type": "City", name: "Zionsville" },
                { "@type": "City", name: "Avon" },
                { "@type": "City", name: "Plainfield" },
                { "@type": "State", name: "Indiana" },
              ],
              priceRange: "$750",
              image: "https://letterlightco.com/gallery-1.png",
              hasOfferCatalog: {
                "@type": "OfferCatalog",
                name: "Marquee Letter Rentals",
                itemListElement: [
                  {
                    "@type": "Offer",
                    itemOffered: {
                      "@type": "Service",
                      name: "MR & MRS Marquee Letter Rental",
                      description:
                        "Six illuminated LED marquee letters spelling MR & MRS. Includes delivery, setup, custom light effects, and teardown within 25 miles of Brownsburg, IN.",
                    },
                    price: "750",
                    priceCurrency: "USD",
                  },
                ],
              },
            }),
          }}
        />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
