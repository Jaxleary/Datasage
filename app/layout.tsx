import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DataSage | Friendly data insights",
  description: "Upload a CSV and understand what it is telling you.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
