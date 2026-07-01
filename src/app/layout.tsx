import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { UserProvider } from "@/lib/context/user-context";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Andex AI — GitHub for Engineering Decisions",
  description:
    "Version control engineering decisions, maintain institutional knowledge, and keep engineering teams aligned as projects evolve.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <UserProvider>{children}</UserProvider>
      </body>
    </html>
  );
}
