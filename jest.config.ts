module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  transform: {
    "^.+\\.(ts|tsx)$": "babel-jest",
    "^.+\\.js$": "babel-jest", // Also transpile JS files using Babel
  },
  transformIgnorePatterns: [
    "/node_modules/(?!sharp)/", // Ensure that Jest processes 'sharp' and 'got' since they use ESM
  ],
  roots: ["./tests"], // Change this to your tests directory if it's not the default
  testMatch: [
    "**/tests/**/*.test.ts", // Match .test.ts files under the tests directory
    "**/tests/**/*.spec.ts", // Match .spec.ts files under the tests directory
  ],
  testPathIgnorePatterns: ["/node_modules/", "/dist/"],
}
