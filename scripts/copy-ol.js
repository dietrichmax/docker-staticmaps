// scripts/copy-ol.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const srcOlJs = path.resolve(__dirname, "../node_modules/ol/dist/ol.js");
const srcOlCss = path.resolve(__dirname, "../node_modules/ol/ol.css");

const destDir = path.resolve(__dirname, "../public");
const destOlJs = path.join(destDir, "ol.js");
const destOlCss = path.join(destDir, "ol.css");

// ensure public dir exists
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

// copy files
fs.copyFileSync(srcOlJs, destOlJs);
fs.copyFileSync(srcOlCss, destOlCss);

console.log("✔ OpenLayers assets copied to /public");
