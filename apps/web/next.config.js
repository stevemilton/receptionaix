/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@receptionalx/ui', '@receptionalx/types'],
  experimental: {
    serverComponentsExternalPackages: ['@supabase/supabase-js'],
  },
};

module.exports = nextConfig;
