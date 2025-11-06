import type {NextConfig} from 'next';
import webpack from 'webpack';
import path from 'path';

const wasmAliasTarget = 'mediainfo.js/dist/MediaInfoModule.wasm';

const nextConfig: NextConfig = {
  transpilePackages: ['mediainfo.js'],
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  webpack: (config) => {
    config.plugins.push(new webpack.IgnorePlugin({
      resourceRegExp: /MediaInfoModule\.wasm$/,
    }));

    config.resolve = config.resolve ?? {};
    config.resolve.alias = {
      ...config.resolve.alias,
      'mediainfo.js/dist/esm-bundle/index.js': path.resolve(
        __dirname,
        'src/lib/mediainfo-alias.js',
      ),
      'MediaInfoModule.wasm': wasmAliasTarget,
    };

    return config;
  },
  turbopack: {
    resolveAlias: {
      'mediainfo.js/dist/esm-bundle/index.js': './src/lib/mediainfo-alias.js',
      'MediaInfoModule.wasm': wasmAliasTarget,
    },
  },
};

export default nextConfig;
