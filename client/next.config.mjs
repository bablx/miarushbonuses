/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'kick.com' },
      { protocol: 'https', hostname: 'ui-avatars.com' }
    ]
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self' 'unsafe-eval'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com blob:; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com; img-src 'self' data: https://kick.com https://ui-avatars.com https://cdn.jsdelivr.net blob:; font-src 'self' https://cdn.jsdelivr.net https://fonts.gstatic.com; connect-src 'self' http://localhost:3001 https://kick.com http://127.0.0.1:3001 ws://localhost:3001 ws://127.0.0.1:3001; frame-src 'self' https://id.kick.com https://player.kick.com blob:; worker-src 'self' blob:;"
          }
        ]
      }
    ]
  }
};

export default nextConfig;
