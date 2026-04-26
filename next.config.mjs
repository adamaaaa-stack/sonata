/** @type {import('next').NextConfig} */
const isMobile = process.env.NEXT_PUBLIC_PLATFORM === 'mobile';

const nextConfig = {
  ...(isMobile ? { output: 'export' } : {}),
  trailingSlash: true,
  images: { unoptimized: true },

};

export default nextConfig;
