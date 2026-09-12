import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SUN THEORY — AI Energy Forecasting",
  description: "AI-powered 72-hour renewable energy generation forecasting for grid operators",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
