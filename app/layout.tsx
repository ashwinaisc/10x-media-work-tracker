import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Studio — Work tracker",
  description: "Creative tasks, monthly targets, and a calendar gallery of completed work.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
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
