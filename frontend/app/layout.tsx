import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "PayAzzure Analytical Agent",
  description: "AI-powered document analysis and dashboards",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
