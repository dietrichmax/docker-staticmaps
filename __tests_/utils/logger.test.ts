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

  test.each([
    ["DEBUG", "debug", "debug message", { key: "value" }],
    ["INFO", "info", "info message", { user: "test" }],
    ["WARN", "warn", "warn message", {}],
    ["ERROR", "error", "error message", undefined],
  ])("logs %s messages with %s method", (level, method, msg, meta) => {
    // @ts-ignore
    logger[method](msg, meta)
    expect(console.log).toHaveBeenCalledTimes(1)

    const expectedPrefix = `\x1b[${
      {
        DEBUG: 34,
        INFO: 32,
        WARN: 33,
        ERROR: 31,
      }[level]
    }m[2025-06-22T12:34:56.789Z] | [${level}]\x1b[0m | ${msg}`

    const callArg = (console.log as jest.Mock).mock.calls[0][0]

    expect(callArg).toContain(expectedPrefix)
    if (meta && Object.keys(meta).length > 0) {
      expect(callArg).toContain(JSON.stringify(meta))
    }
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
})
