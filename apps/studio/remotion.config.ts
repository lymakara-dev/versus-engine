import { Config } from "@remotion/cli/config";

// Asset paths in the VideoInput contract (e.g. "assets/music/x.mp3") are
// relative to the monorepo root's shared assets/ folder, not this app. Rather
// than pointing publicDir at the whole repo root (which self-includes this
// app's own build/ output on every "remotion bundle" run — an infinite
// recursive copy), `public/assets` is a symlink to the repo-root assets/
// folder and we just use Remotion's default public dir convention.

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
Config.setConcurrency(2);

// The schema now re-exports from @versus-engine/shared, whose relative
// imports use TS's ESM ".js"-suffixed convention (resolves to ".ts" under
// tsc/tsx/vitest). Webpack needs to be told to try that extension too.
Config.overrideWebpackConfig((config) => ({
  ...config,
  resolve: {
    ...config.resolve,
    extensionAlias: {
      ...config.resolve?.extensionAlias,
      ".js": [".ts", ".tsx", ".js"],
    },
  },
}));
