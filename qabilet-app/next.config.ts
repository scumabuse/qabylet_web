import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '500mb',
    },
  },
  // Clean production config
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https://*.supabase.co https://*.amazonaws.com https://img.youtube.com https://i.ytimg.com; connect-src 'self' https://*.supabase.co https://cdn.jsdelivr.net https://*.peerjs.com wss://*.peerjs.com; worker-src 'self' blob:; frame-src 'self' https://www.youtube.com; media-src 'self' blob: data: https://*.supabase.co https://*.amazonaws.com;"
          }
        ]
      }
    ];
  }
};

export default nextConfig;
