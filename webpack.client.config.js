import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default {
  entry: "./src/client.ts", // or .js
  target: "web",
  mode: "production",
  output: {
    filename: "ol.js",
    path: path.resolve(__dirname, "public"),
    clean: false, // keep your other static files
  },
  resolve: {
    extensions: [".ts", ".js"],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
      {
        test: /\.css$/i,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
}
