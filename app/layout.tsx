import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Steady Hand",
  description: "Lift the piece out without touching the rim.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
