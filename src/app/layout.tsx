import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "MineAI – Create Anyone. Chat Anything.",
  description:
    "MineAI lets you create AI characters, choose personas, and roleplay anything. Free and premium AI chat platform.",
  icons: {
    icon: "/logo-icon.png",
    apple: "/logo-icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-zinc-950 text-white antialiased">
        {children}
      </body>
    </html>
  );
}
