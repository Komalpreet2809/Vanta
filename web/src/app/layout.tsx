import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Vanta — target speaker extraction",
  description:
    "Upload a 5-second reference clip of one voice and a messy recording — Vanta isolates that voice and returns it without everything else.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="page-bg min-h-full">{children}</body>
    </html>
  );
}
