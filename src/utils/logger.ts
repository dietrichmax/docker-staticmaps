/**
 * Represents different levels of logging.
 */
type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR"

/**
 * Logs a message to the console with a given level and timestamp.
 *
 * @param level - The log level (DEBUG, INFO, WARN, ERROR).
 * @param message - The message to log.
 * @param meta - Optional metadata object for additional context.
 */
const log = (level: LogLevel, message: string, meta?: Record<string, unknown>): void => {
  const timestamp = new Date().toISOString();
  let colorCode = "";

  switch (level) {
    case "DEBUG":
      colorCode = "\x1b[34m"; // Blue
      break;
    case "INFO":
      colorCode = "\x1b[32m"; // Green
      break;
    case "WARN":
      colorCode = "\x1b[33m"; // Yellow
      break;
    case "ERROR":
      colorCode = "\x1b[31m"; // Red
      break;
  }

  let logMessage = `${colorCode}[${timestamp}] [${level}]\x1b[0m ${message}`;
  if (meta && Object.keys(meta).length > 0) {
    logMessage += ` ${JSON.stringify(meta, null, 2)}`;
  }

  console.log(logMessage);
};

/**
 * Logger object that provides methods for logging at different levels.
 */
const logger = {
  debug: (message: string, meta?: Record<string, unknown>): void => log("DEBUG", message, meta),
  info: (message: string, meta?: Record<string, unknown>): void => log("INFO", message, meta),
  warn: (message: string, meta?: Record<string, unknown>): void => log("WARN", message, meta),
  error: (error: Error | string, meta?: Record<string, unknown>): void => {
    if (typeof error === "string") {
      log("ERROR", error, meta);
    } else {
      log("ERROR", error.message, meta);
      console.error(error.stack); // Log the stack trace for better debugging
    }
  },
};

export default logger;
