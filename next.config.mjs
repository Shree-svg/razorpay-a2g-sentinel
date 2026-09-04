/** @type {import('next').NextConfig} */
const nextConfig = {
  // Increase API body size limit from default 1MB to 2MB.
  // Multi-turn LLM conversations (with catalog context) can exceed the default.
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
