/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  reactStrictMode: true,
  transpilePackages: [
    '@localpilot/config',
    '@localpilot/contracts',
    '@localpilot/domain',
    '@localpilot/db',
    '@localpilot/ui',
    '@localpilot/integrations'
  ],
  webpack: (config) => {
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.jsx': ['.tsx', '.jsx'],
    };
    return config;
  }
};

export default nextConfig;

