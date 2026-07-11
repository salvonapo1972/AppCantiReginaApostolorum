import type { Metadata } from "next";
import { Cinzel, Lora } from "next/font/google";
import "./globals.css";
import Navbar from "./components/Navbar";

const cinzel = Cinzel({
  subsets: ["latin"],
  variable: "--font-title",
});

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "Logos",
  description: "La Parola di Dio ogni giorno",
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
      </body>
    </html>
  );
}