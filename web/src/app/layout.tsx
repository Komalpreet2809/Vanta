import type { Metadata } from "next";
import { JetBrains_Mono, Crimson_Pro, Bebas_Neue } from "next/font/google";
import "./globals.css";

// Body / labels — narrow vintage display
const bebas = Bebas_Neue({
  weight: "400",
  variable: "--font-display",
  subsets: ["latin"],
});

// Editorial body copy — feels like the tan-paper note in the reference
const crimson = Crimson_Pro({
  variable: "--font-serif",
  subsets: ["latin"],
});

// Telemetry / numbers
const jetbrains = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VANTA — voice isolation engine",
  description:
    "Isolate one voice from a noisy recording. Upload a 5-second reference clip of the target speaker and the messy audio — Vanta extracts the voice and returns it clean.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${bebas.variable} ${crimson.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
