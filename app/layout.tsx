import type { Metadata } from "next";
import { Cinzel, Lora } from "next/font/google";
import "./globals.css";
import ChatWidget from "./components/ChatWidget";

const cinzel = Cinzel({
  subsets: ["latin"],
  variable: "--font-title",
});

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "Canti Reginae Apostolorum alla Montagnola",
  description: "Canti Reginae Apostolorum alla Montagnola",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <body className={`${cinzel.variable} ${lora.variable}`}>
        {children}
        <ChatWidget />
      </body>
    </html>
  );
}