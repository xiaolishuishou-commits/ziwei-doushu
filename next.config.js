/** @type {import('next').NextConfig} */
const isGithubPages = process.env.PAGES_EXPORT === '1';

const nextConfig = {
  transpilePackages: ['lunar-javascript'],
  ...(isGithubPages
    ? {
        output: 'export',
        basePath: '/ziwei-doushu',
        assetPrefix: '/ziwei-doushu/',
        images: { unoptimized: true },
        trailingSlash: true,
      }
    : {}),
};

module.exports = nextConfig;
