// Helper: truncate long strings for logging
export const truncate = (str: string, maxLength = 500): string =>
  str.length > maxLength ? `${str.substring(0, maxLength)}...` : str

// Remove IPv4-mapped IPv6 prefix
export function normalizeIp(ip: string): string {
  if (ip.startsWith("::ffff:")) {
    return ip.substring(7)
  }
  return ip
}

export function isDev() {
  return process.env.NODE_ENV === "development"
}