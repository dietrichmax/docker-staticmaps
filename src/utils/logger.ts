/**
 * Represents different levels of logging.
 */
type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR"

const isValidLogLevel = (level: any): level is LogLevel => {
  return ["DEBUG", "INFO", "WARN", "ERROR"].includes(level)
}

const envLogLevel = process.env.LOG_LEVEL
// Set the current log level from the environment (defaults to "INFO")
const currentLogLevel: LogLevel = isValidLogLevel(envLogLevel)
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
    INFO: "\x1b[32m",  // Green
    WARN: "\x1b[33m",  // Yellow
    ERROR: "\x1b[31m", // Red
  }

  let logMessage = `${colorMap[level]}[${timestamp}] | [${level}]\x1b[0m | ${message}`
  if (meta && Object.keys(meta).length > 0) {
    logMessage += ` ${JSON.stringify(meta)}`
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
  error: (error: Error | string, meta?: Record<string, unknown>): void => {
    if (typeof error === "string") {
      log("ERROR", error, meta)
    } else {
      log("ERROR", error.message, meta)
      console.error(error.stack)
    }
  },
}

export default logger
