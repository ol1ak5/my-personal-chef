import type { Metadata } from "next";
import { Fredoka } from "next/font/google";
import "./globals.css";

// The reference sets *everything* — headline, badge, bubble, placeholder — in
// one heavy rounded family. Measured against the reference image, Fredoka at
// ~60px reproduces its headline metrics almost exactly (cap-height 42px,
// "What can we make" = 513px vs the reference's 516px).
const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Personal Chef",
  description: "Your AI personal chef — tell it what's in your fridge, or show it a photo.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${fredoka.variable} h-full`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
