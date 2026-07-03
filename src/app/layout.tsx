import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { UserProvider } from "@/lib/context/user-context";
import { ThemeProvider } from "@/lib/context/theme-context";
import { ExperienceModeProvider } from "@/lib/context/experience-mode-context";
import { ExperienceGate } from "@/components/experience/experience-mode-picker";
import { SplashIntro } from "@/components/lifecycle/splash-intro";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Andex AI — Product Operating System",
  description:
    "AI Councils coordinate the full product lifecycle. Humans approve every important decision.",
  icons: {
    icon: "/andex-logo.png",
    apple: "/andex-logo.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("andex-theme");document.documentElement.classList.add(t==="light"?"light":"dark")}catch(e){document.documentElement.classList.add("dark")}})();`,
          }}
        />
      </head>
      <body className={`${inter.variable} font-sans`}>
        <ThemeProvider>
          <UserProvider>
            <ExperienceModeProvider>
              <ExperienceGate>
                <SplashIntro />
                {children}
              </ExperienceGate>
            </ExperienceModeProvider>
          </UserProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
