import util from "util"

/**
 * Represents different levels of logging.
 */
type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR"

const isValidLogLevel = (level: any): level is LogLevel => {
  return ["DEBUG", "INFO", "WARN", "ERROR"].includes(level)
}

const envLogLevel = process.env.LOG_LEVEL

// Set the current log level from the environment (defaults to "INFO")
export const currentLogLevel: LogLevel = isValidLogLevel(envLogLevel)
  ? envLogLevel
  : "INFO"

// Define priorities for each log level
const levelPriority: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
}

/**
 * Logs a message to the console with a given level and timestamp, if the level meets the threshold.
 *
 * @param level - The log level (DEBUG, INFO, WARN, ERROR).
 * @param message - The message to log.
 * @param meta - Optional metadata object for additional context.
 */
const log = (
  level: LogLevel,
  message: string,
  meta?: Record<string, unknown>
): void => {
  // Only log if the message's level is at or above the configured level
  if (levelPriority[level] < levelPriority[currentLogLevel]) {
    return
  }

  const timestamp = new Date().toISOString()
  const colorMap: Record<LogLevel, string> = {
    DEBUG: "\x1b[34m", // Blue
    INFO: "\x1b[32m", // Green
    WARN: "\x1b[33m", // Yellow
    ERROR: "\x1b[31m", // Red
  }

  let logMessage = `${colorMap[level]}[${timestamp}] | [${level}]\x1b[0m | ${message}`
  if (meta && Object.keys(meta).length > 0) {
    logMessage += ` ${util.inspect(meta, { depth: null, colors: true, compact: false })}`
  }

  console.log(logMessage)
}

/**
 * Logger object that provides methods for logging at different levels.
 */
const logger = {
  debug: (message: string, meta?: Record<string, unknown>): void =>
    log("DEBUG", message, meta),
  info: (message: string, meta?: Record<string, unknown>): void =>
    log("INFO", message, meta),
  warn: (message: string, meta?: Record<string, unknown>): void =>
    log("WARN", message, meta),
  error: (err: Error | string, meta?: Record<string, unknown>): void => {
    if (typeof err === "string") {
      log("ERROR", err, meta)
    } else {
      const errorMeta = {
        ...meta,
        message: err.message,
        stack: err.stack?.split("\n").map((line) => line.trim()),
        name: err.name,
      }
      log("ERROR", err.message, errorMeta)
    }
  },
}

export default logger
