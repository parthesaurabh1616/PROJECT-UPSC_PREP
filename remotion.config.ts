import { Config } from "@remotion/cli/config";

/* H.264 in an MP4 so the file plays in a browser <video> with no plugin.
   JPEG frames keep the render fast; the content is flat vector-ish UI, so
   the quality difference against PNG is not visible. */
Config.setVideoImageFormat("jpeg");
Config.setCodec("h264");
Config.setOverwriteOutput(true);
