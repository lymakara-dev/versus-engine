import path from "node:path";
import { Config } from "@remotion/cli/config";

// Asset paths in the VideoInput contract (e.g. "assets/music/x.mp3") are
// relative to the monorepo root's shared assets/ folder, not this app.
// (Remotion evaluates this config as CJS, so import.meta isn't available —
// resolve relative to the CLI's cwd, which is this package's directory.)
Config.setPublicDir(path.resolve(process.cwd(), "..", ".."));

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
Config.setConcurrency(2);
