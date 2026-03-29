import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ActiveDocumentProvider } from "@/components/providers/active-document-provider";
import { AuthProvider } from "@/components/providers/auth-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "iTECity",
  description: "AI-Augmented Collaborative Sandbox",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background">
        <ThemeProvider>
          <AuthProvider>
            <ActiveDocumentProvider>
              <div className="pointer-events-none fixed right-4 top-4 z-[80]">
                <div className="pointer-events-auto rounded-full border border-border bg-card/85 p-1 shadow-lg backdrop-blur">
                  <ThemeToggle />
                </div>
              </div>
              {children}
            </ActiveDocumentProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
