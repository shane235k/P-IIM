import type { Metadata } from "next";
import Navbar from "./Navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "P-IIM",
  description: "Falsifiable investment thesis analysis engine",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
