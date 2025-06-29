import logger from "../../src/utils/logger"

describe("logger", () => {
  const originalLog = console.log
  const originalError = console.error

  beforeEach(() => {
    jest.useFakeTimers({
      timerLimit: 1000,
      now: new Date("2025-06-22T12:34:56.789Z"),
    })
    console.log = jest.fn()
    console.error = jest.fn()
    process.env.LOG_LEVEL = "DEBUG" // reset to lowest level to allow all logs
  })

  afterEach(() => {
    jest.useRealTimers()
    console.log = originalLog
    console.error = originalError
  })

  test("error method logs stack if error is Error object", () => {
    const error = new Error("test error")
    logger.error(error)
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining("test error")
    )
    expect(console.error).toHaveBeenCalledWith(error.stack)
  })

  test("does not log messages below current LOG_LEVEL", () => {
    process.env.LOG_LEVEL = "WARN"
    jest.resetModules()
    // Re-import logger to reload currentLogLevel with new env
    const loggerNew = require("../../src/utils/logger").default

    loggerNew.debug("debug message")
    loggerNew.info("info message")
    expect(console.log).not.toHaveBeenCalled()

    loggerNew.warn("warn message")
    loggerNew.error("error message")
    expect(console.log).toHaveBeenCalledTimes(2)
  })

  test("logs meta object as JSON string", () => {
    logger.info("test message", { user: "alice", action: "login" })
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining(`{"user":"alice","action":"login"}`)
    )
  })

  describe("currentLogLevel initialization", () => {
    afterEach(() => {
      jest.resetModules() // clear module cache after each test
    })

    test("uses env LOG_LEVEL if valid", () => {
      jest.resetModules()
      process.env.LOG_LEVEL = "DEBUG"
      const { currentLogLevel } = require("../../src/utils/logger")
      expect(currentLogLevel).toBe("DEBUG")
    })

    test("falls back to INFO if env LOG_LEVEL invalid", () => {
      jest.resetModules()
      process.env.LOG_LEVEL = "INVALID_LEVEL"
      const { currentLogLevel } = require("../../src/utils/logger")
      expect(currentLogLevel).toBe("INFO")
    })

    test("falls back to INFO if env LOG_LEVEL undefined", () => {
      jest.resetModules()
      delete process.env.LOG_LEVEL
      const { currentLogLevel } = require("../../src/utils/logger")
      expect(currentLogLevel).toBe("INFO")
    })
  })
})
