/**
 * Note: When using the Node.JS APIs, the config file
 * doesn't apply. Instead, pass options directly to the APIs.
 *
 * All configuration options: https://remotion.dev/docs/config
 */

import { Config } from "@remotion/cli/config";

Config.setRspack(true);
Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(95);
Config.setOverwriteOutput(true);
Config.setDefaultPremountInSeconds(1);
// Three.js necesita WebGL. "angle" usa la placa de video si existe;
// en servidores sin GPU se puede pasar --gl=swangle por línea de comandos.
Config.setChromiumOpenGlRenderer("angle");
