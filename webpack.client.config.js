import path from "path"
import { fileURLToPath } from "url"
import MiniCssExtractPlugin from "mini-css-extract-plugin"

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
        use: [MiniCssExtractPlugin.loader, "css-loader"],
      },
    ],
  },
  plugins: [new MiniCssExtractPlugin({ filename: "ol.css" })],
}
