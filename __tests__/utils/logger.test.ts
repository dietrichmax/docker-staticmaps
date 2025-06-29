import logger from "../../src/utils/logger"
import util from "util"

describe("logger", () => {
  let consoleLogSpy: jest.SpyInstance

  beforeEach(() => {
    // Spy on console.log to test log outputs
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
    // Reset environment variable after each test
    delete process.env.LOG_LEVEL
  })

  // Helper to extract log message without ANSI colors
  const stripAnsi = (str: string) => str.replace(/\x1b\[[0-9;]*m/g, "")

  it("should set currentLogLevel to 'INFO' if env LOG_LEVEL is invalid or missing", () => {
    delete process.env.LOG_LEVEL
    jest.resetModules()
    const mod = require("../../src/utils/logger")
    expect(mod.currentLogLevel).toBe("INFO")

    process.env.LOG_LEVEL = "INVALID"
    jest.resetModules()
    const mod2 = require("../../src/utils/logger")
    expect(mod2.currentLogLevel).toBe("INFO")
  })

  it("should set currentLogLevel to valid env LOG_LEVEL", () => {
    process.env.LOG_LEVEL = "DEBUG"
    jest.resetModules()
    const mod = require("../../src/utils/logger")
    expect(mod.currentLogLevel).toBe("DEBUG")

    process.env.LOG_LEVEL = "WARN"
    jest.resetModules()
    const mod2 = require("../../src/utils/logger")
    expect(mod2.currentLogLevel).toBe("WARN")
  })

  describe("log level filtering", () => {
    it("should not log messages below currentLogLevel", () => {
      process.env.LOG_LEVEL = "WARN"
      jest.resetModules()
      const mod = require("../../src/utils/logger")
      const { default: localLogger } = mod

      localLogger.debug("debug message")
      localLogger.info("info message")

      expect(consoleLogSpy).not.toHaveBeenCalled()
    })

    it("should log messages at or above currentLogLevel", () => {
      process.env.LOG_LEVEL = "INFO"
      jest.resetModules()
      const mod = require("../../src/utils/logger")
      const { default: localLogger } = mod

      localLogger.info("info message")
      localLogger.warn("warn message")
      localLogger.error("error message")

      expect(consoleLogSpy).toHaveBeenCalledTimes(3)
    })
  })

  describe("log message format", () => {
    it("should include timestamp, level, and message", () => {
      logger.info("test message")

      expect(consoleLogSpy).toHaveBeenCalledTimes(1)
      const calledWith = consoleLogSpy.mock.calls[0][0]

      // Remove colors for test stability
      const plain = stripAnsi(calledWith)
      expect(plain).toMatch(
        /\[\d{4}-\d{2}-\d{2}T.*Z\] \| \[INFO\] \| test message/
      )
    })

    it("should include inspected meta object if provided", () => {
      const meta = { user: "alice", count: 42 }
      logger.info("with meta", meta)

      const calledWith = consoleLogSpy.mock.calls[0][0]
      expect(calledWith).toContain("with meta")

      const inspectedMeta = util.inspect(meta, {
        depth: null,
        colors: true,
        compact: false,
      })

      expect(calledWith).toContain(inspectedMeta)
    })

    it("should not include meta if empty or undefined", () => {
      logger.info("no meta", {})
      logger.info("no meta passed")

      const firstCall = consoleLogSpy.mock.calls[0][0]
      const secondCall = consoleLogSpy.mock.calls[1][0]

      const emptyMeta = util.inspect(
        {},
        {
          depth: null,
          colors: true,
          compact: false,
        }
      )

      expect(firstCall).not.toContain(emptyMeta)
      expect(secondCall).not.toContain(emptyMeta)
    })
  })

  describe("logger methods", () => {
    it("debug calls log with level DEBUG", () => {
      process.env.LOG_LEVEL = "DEBUG"
      jest.resetModules()
      const mod = require("../../src/utils/logger")
      const logger = mod.default

      logger.debug("debug msg")
      const call = consoleLogSpy.mock.calls[0][0]
      expect(call).toContain("[DEBUG]")
      expect(call).toContain("debug msg")
    })

    it("info calls log with level INFO", () => {
      process.env.LOG_LEVEL = "INFO"
      jest.resetModules()
      const mod = require("../../src/utils/logger")
      const logger = mod.default

      logger.info("info msg")
      const call = consoleLogSpy.mock.calls[0][0]
      expect(call).toContain("[INFO]")
      expect(call).toContain("info msg")
    })

    it("warn calls log with level WARN", () => {
      process.env.LOG_LEVEL = "WARN"
      jest.resetModules()
      const mod = require("../../src/utils/logger")
      const logger = mod.default

      logger.warn("warn msg")
      const call = consoleLogSpy.mock.calls[0][0]
      expect(call).toContain("[WARN]")
      expect(call).toContain("warn msg")
    })

    describe("error method", () => {
      it("logs error string message", () => {
        process.env.LOG_LEVEL = "ERROR"
        jest.resetModules()
        const mod = require("../../src/utils/logger")
        const logger = mod.default

        logger.error("string error message")

        const call = consoleLogSpy.mock.calls[0][0]
        expect(call).toContain("[ERROR]")
        expect(call).toContain("string error message")
      })

      it("logs Error object with message, stack, and name in meta", () => {
        const err = new Error("error object message")
        logger.error(err)

        const call = consoleLogSpy.mock.calls[0][0]
        expect(call).toContain("[ERROR]")
        expect(call).toContain("error object message")
        expect(call).toContain(err.name)
        // Stack traces are multi-line, so check one line is present
        expect(call).toContain(err.stack?.split("\n")[0].trim())
      })

      it("includes additional meta with Error object", () => {
        const err = new Error("error with meta")
        const meta = { foo: "bar" }
        logger.error(err, meta)

        const call = consoleLogSpy.mock.calls[0][0]
        expect(call).toContain("foo")
        expect(call).toContain("bar")
        expect(call).toContain("error with meta")
      })
    })
  })
})
