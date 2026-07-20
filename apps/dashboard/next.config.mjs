/** @type {import('next').NextConfig} */
const nextConfig = {
  // Workspace packages are consumed as raw TS source (pnpm workspace:* links,
  // no prebuild step yet) — Next needs to run them through its own compiler.
  transpilePackages: ["studio", "@versus-engine/comparison", "@versus-engine/db", "@versus-engine/shared"],
  webpack: (config) => {
    // Workspace packages use TS's ESM convention of ".js"-suffixed relative
    // imports that resolve to ".ts" source files — webpack needs to be told
    // to try that extension too (tsc/tsx/vitest already do this natively).
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      ".js": [".ts", ".tsx", ".js"],
    };
    return config;
  },
};

export default nextConfig;
