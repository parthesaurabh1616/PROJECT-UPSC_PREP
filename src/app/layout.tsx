import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider, themeBootScript } from "@/lib/theme";

export const metadata: Metadata = {
  title: "Conquer Capital — AI-Powered UPSC Preparation Platform",
  description:
    "Build deep mastery for UPSC Civil Services through AI mentorship, current-affairs intelligence, spaced revision, and strategic analytics. conquercapital.in",
  applicationName: "Conquer Capital",
  keywords: [
    "UPSC", "Civil Services", "IAS", "Prelims", "Mains", "Interview",
    "Conquer Capital", "AI Mentor", "Current Affairs", "Revision Engine", "conquercapital.in",
  ],
  metadataBase: new URL("https://conquercapital.in"),
  openGraph: {
    title: "Conquer Capital — AI-Powered UPSC Preparation",
    description: "The intelligence platform for serious UPSC aspirants.",
    url: "https://conquercapital.in",
    siteName: "Conquer Capital",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className="bg-bg text-ink antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
