/**
 * Represents different levels of logging.
 */
type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR"

/**
 * Logs a message to the console with a given level and timestamp.
 *
 * @param level - The log level (DEBUG, INFO, WARN, ERROR).
 * @param message - The message to log.
 */
const log = (level: LogLevel, message: string): void => {
  const timestamp = new Date().toISOString()
  let colorCode = ""

  switch (level) {
    case "DEBUG":
      colorCode = "\x1b[34m" // Blue
      break
    case "INFO":
      colorCode = "\x1b[32m" // Green
      break
    case "WARN":
      colorCode = "\x1b[33m" // Yellow
      break
    case "ERROR":
      colorCode = "\x1b[31m" // Red
      break
  }

  console.log(`${colorCode}[${timestamp}] [${level}]\x1b[0m ${message}`)
}

/**
 * Logger object that provides methods for logging at different levels.
 */
const logger = {
  /**
   * Logs a debug message.
   *
   * @param message - The debug message to log.
   */
  debug: (message: string): void => log("DEBUG", message),

  /**
   * Logs an informational message.
   *
   * @param message - The informational message to log.
   */
  info: (message: string): void => log("INFO", message),

  /**
   * Logs a warning message.
   *
   * @param message - The warning message to log.
   */
  warn: (message: string): void => log("WARN", message),

  /**
   * Logs an error message.
   *
   * @param error - The error message or Error object to log.
   */
  error: (error: Error | string): void => {
    if (typeof error === "string") {
      log("ERROR", error)
    } else {
      log("ERROR", error.message)
      console.error(error.stack) // Log the stack trace for better debugging
    }
  },
}

export default logger
