import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider, themeBootScript } from "@/lib/theme";

export const metadata: Metadata = {
  title: "UPSC PREP OS — The AI-Powered Cognitive Operating System for Elite UPSC Preparation",
  description:
    "Build deep mastery using intelligent revision systems, AI mentorship, current-affairs intelligence, strategic analytics, and AIR-1 level preparation workflows.",
  applicationName: "UPSC PREP OS",
  keywords: [
    "UPSC", "Civil Services", "IAS", "Prelims", "Mains", "Interview",
    "Preparation OS", "AI Mentor", "Current Affairs", "Revision Engine",
  ],
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,500&family=JetBrains+Mono:wght@400;500&display=swap"
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
