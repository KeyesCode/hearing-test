import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hearing Check - Screening Tool",
  description: "A non-medical hearing screening tool using Web Audio API",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}

