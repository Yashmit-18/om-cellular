import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import GlobalProviders from "./Providers";
import ToastContainer from "@/components/ui/toast";
import FloatingWhatsApp from "@/components/ui/FloatingWhatsApp";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "OM Cellular - Your Trusted Mobile Partner",
    template: "%s | OM Cellular",
  },
  description:
    "Buy, sell, exchange, and repair mobile phones at OM Cellular. Expert repairs, genuine parts, competitive prices, and trusted service.",
  keywords: [
    "mobile phones",
    "phone repair",
    "buy phone",
    "sell phone",
    "exchange phone",
    "OM Cellular",
    "genuine parts",
    "screen repair",
    "battery replacement",
  ],
  openGraph: {
    type: "website",
    locale: "en_IN",
    siteName: "OM Cellular",
    title: "OM Cellular - Your Trusted Mobile Partner",
    description:
      "Buy, sell, exchange, and repair mobile phones with expert service and genuine parts.",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <GlobalProviders>
          {children}
          <ToastContainer />
          <FloatingWhatsApp />
        </GlobalProviders>
      </body>
    </html>
  );
}
