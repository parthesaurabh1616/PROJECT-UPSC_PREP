/** @type {import('next').NextConfig} */
const nextConfig = {
  // Build output lives outside OneDrive — stops OneDrive sync from hanging Next.js startup
  distDir: "C:/Users/saura/AppData/Local/upsc-prep-os/.next",
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: false },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
    ],
  },
};

export default nextConfig;
