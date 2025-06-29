import util from "util"

/**
 * Represents different levels of logging.
 */
type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR"


/**
 * Type guard to check if a given value is a valid LogLevel.
 *
 * @param {any} level - The value to check.
 * @returns {level is LogLevel} True if the value is one of the valid log levels.
 */
const isValidLogLevel = (level: any): level is LogLevel => {
  return ["DEBUG", "INFO", "WARN", "ERROR"].includes(level)
}

/**
 * Log level retrieved from environment variables.
 */
const envLogLevel = process.env.LOG_LEVEL

/**
 * The current log level used by the logger.
 * Defaults to "INFO" if the environment variable is invalid or missing.
 */
export const currentLogLevel: LogLevel = isValidLogLevel(envLogLevel)
  ? envLogLevel
  : "INFO"

/**
 * Numeric priority mapping for each log level.
 * Lower numbers indicate more verbose logging.
 */
const levelPriority: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
}

/**
 * Logs a message to the console with a specified level and timestamp, using color coding.
 * Only logs the message if its level is equal to or higher than the current logging threshold.
 *
 * @param {LogLevel} level - The severity level of the log message (e.g., DEBUG, INFO, WARN, ERROR).
 * @param {string} message - The message string to be logged.
 * @param {Record<string, unknown>} [meta] - Optional metadata object for additional context, logged with colors and full depth.
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
 * Logger object providing methods for logging messages at different levels.
 * Each method accepts a message and optional metadata.
 *
 * @property {function(string, Record<string, unknown>=): void} debug - Logs debug-level messages.
 * @property {function(string, Record<string, unknown>=): void} info - Logs informational messages.
 * @property {function(string, Record<string, unknown>=): void} warn - Logs warning messages.
 * @property {function(Error | string, Record<string, unknown>=): void} error - Logs error messages.
 *   If an Error object is provided, it extracts and logs its message, stack trace, and name.
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
