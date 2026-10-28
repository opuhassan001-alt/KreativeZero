import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KreativeZero",
  description: "KreativeZero - AI-Powered Automated Marketing Campaign & Brand Creative Suite",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
