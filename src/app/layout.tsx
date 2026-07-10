import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ALC CI/BI and Credit Scorecard System",
  description: "Agusan Lending Corporation CI/BI and 5C credit decisioning"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
