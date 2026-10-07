import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(92);
Config.setOverwriteOutput(true);
// h264 + yuv420p = compatibile con WhatsApp e con tutti i telefoni
Config.setCodec("h264");
Config.setPixelFormat("yuv420p");
Config.setCrf(20);
