const nextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ['sql.js'],
  async headers() {
    return [{source: '/:path*', headers: [
      {key: 'X-Content-Type-Options', value: 'nosniff'},
      {key: 'X-Frame-Options', value: 'DENY'},
      {key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin'},
    ]}];
  },
};
export default nextConfig;
