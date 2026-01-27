import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "MineAI",
  description: "Character chat platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0B0B0F] text-zinc-100 antialiased">
        {children}
      </body>
    </html>
  );
}
