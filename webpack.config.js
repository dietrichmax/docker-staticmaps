import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default {
  entry: "./src/server.ts",
  target: "node",
  mode: "production",
  externals: [
    ({ request }, callback) =>
      // Keep bare specifiers (node builtins and node_modules) as runtime requires
      /^[a-z@]/.test(request ?? "")
        ? callback(null, `commonjs ${request}`)
        : callback(),
  ],
  output: {
    filename: "server.cjs",
    path: path.resolve(__dirname, "dist"),
    clean: true,
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
    ],
  },
}
