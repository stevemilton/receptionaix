/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@receptionalx/ui', '@receptionalx/types', '@receptionalx/shared'],
  experimental: {
    serverComponentsExternalPackages: ['@supabase/supabase-js'],
  },
};

module.exports = nextConfig;
