/**
 * @module config/authConfig
 * Handles authentication configuration for the API.
 */

import logger from "../utils/logger"

/**
 * Authentication configuration class.
 * Reads environment variables once at startup and caches values.
 */
class AuthConfig {
  /** API key value from environment */
  static apiKey?: string

  /** Whether API key authentication is required */
  static requireAuth: boolean = false

  /**
   * Initialize the auth configuration.
   * Logs whether API key authentication is enabled.
   * Should be called once at server startup.
   */
  static init(): void {
    this.apiKey = process.env.API_KEY
    this.requireAuth = Boolean(this.apiKey)

    if (this.requireAuth) {
      logger.info("🔑 API key authentication enabled")
    } else {
      logger.info("No API key set - running in keyless mode")
    }
  }
}

export default AuthConfig
