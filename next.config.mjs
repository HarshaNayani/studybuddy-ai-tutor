/** @type {import('next').NextConfig} */
const nextConfig = {
  // Make sure the study notes are bundled with the serverless function on Vercel
  outputFileTracingIncludes: {
    "/api/chat": ["./data/notes/**/*"],
  },
};

export default nextConfig;
