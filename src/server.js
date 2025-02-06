import express from "express";
import dotenv from "dotenv";
import { render, validateParams } from "./utils.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const ENDPOINT = process.env.ENDPOINT || "/staticmaps";

// Custom async error handler middleware
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

app.get(
  ENDPOINT,
  asyncHandler(async (req, res) => {
    const { missingParams, options } = validateParams(req.query);

    if (missingParams.length > 0) {
      return res.status(422).json({
        error: "Missing parameters",
        missingParams,
      });
    }

    const img = await render(options);
    res.set({
      "Content-Type": `image/${options.format}`,
      "Content-Length": img.length,
    });
    res.end(img);
  })
);

// Global error handler
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}${ENDPOINT}`);
});

export default app;
