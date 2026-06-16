import type { Metadata } from "next";
import { Inter, Instrument_Serif } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "EarthIQ — Intelligent Climate Companion",
  description:
    "EarthIQ transforms your sustainability data into personalized decisions, explainable AI recommendations, and a measurable 30-day action plan.",
  keywords: ["sustainability", "carbon footprint", "climate", "AI", "emissions"],
  openGraph: {
    title: "EarthIQ — Intelligent Climate Companion",
    description:
      "Understand your carbon story. Get AI-powered, explainable recommendations grounded in your real data.",
    type: "website",
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
      className={`${inter.variable} ${instrumentSerif.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
