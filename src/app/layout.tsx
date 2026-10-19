import { SiteBody, SkipLink, Main } from "@sd/ui";
import type { Metadata } from "next";
import { Inter, Montserrat, Geist_Mono } from "next/font/google";
import { AnnouncementBar } from "@/components/layout/announcement-bar";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import "./globals.css";

const geistSans = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const headingFont = Montserrat({ variable: "--font-heading", subsets: ["latin"], weight: ["500", "600", "700", "800"] });

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PappyLummy | Football Jerseys Nigeria",
  description:
    "Shop football jerseys, club kits, international shirts and retro football jerseys in Nigeria.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${headingFont.variable}`}>
      <SiteBody>
        <SkipLink />
        <AnnouncementBar />
        <Header />
        <Main>{children}</Main>
        <Footer />
      </SiteBody>
    </html>
  );
}
