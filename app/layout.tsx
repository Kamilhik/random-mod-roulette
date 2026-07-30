import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Random Mod Roulette",
  description: "Крути рулетку и находи случайные Minecraft-моды с Modrinth"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
