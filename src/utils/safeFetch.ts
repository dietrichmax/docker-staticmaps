/**
 * @module utils/safeFetch
 * Outbound HTTP(S) fetch for untrusted URLs.
 */

import http from "node:http"
import https from "node:https"
import dns from "node:dns"
import net, { type LookupFunction } from "node:net"
import { isPrivateIp, allowsPrivateAddress } from "./security"
import logger from "./logger"

/**
 * Sent when the caller supplies no User-Agent. Tile servers such as
 * OpenStreetMap serve a "blocked" placeholder tile to unidentified clients,
 * so an anonymous request looks like a success but renders the wrong image.
 * Override per-deployment with TILE_USER_AGENT.
 */
const DEFAULT_USER_AGENT =
  "docker-staticmaps (+https://github.com/dietrichmax/docker-staticmaps)"

/** Minimal fetch-like response surface used by the tile and marker fetchers. */
export interface SafeResponse {
  status: number
  statusText: string
  ok: boolean
  headers: { get(name: string): string | null }
  arrayBuffer(): Promise<ArrayBuffer>
}

/**
 * DNS lookup that refuses to hand back a private address.
 *
 * Resolves all records, blocks if any is private, then returns a single
 * validated address so the socket connects to exactly what was checked.
 * Hosts in ALLOW_PRIVATE_TILE_HOSTS skip the private-address check.
 */
export const pinnedLookup: LookupFunction = (hostname, options, callback) => {
  dns.lookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err, "", 0)

    const list = addresses as dns.LookupAddress[]
    if (!list.length) {
      return callback(new Error(`No addresses resolved for ${hostname}`), "", 0)
    }

    if (!allowsPrivateAddress(hostname)) {
      const blocked = list.find((a) => isPrivateIp(a.address))
      if (blocked) {
        logger.warn(
          `Blocked outbound request: ${hostname} resolves to private address ${blocked.address}`
        )
        return callback(
          new Error(`Blocked private address for host ${hostname}`),
          "",
          0
        )
      }
    }

    // autoSelectFamily (on by default since Node 20) passes all:true and
    // expects the array back. Every entry is already validated.
    if (options.all) return callback(null, list)

    callback(null, list[0].address, list[0].family)
  })
}

/**
 * GETs an untrusted URL.
 *
 * Redirects are not followed; 3xx comes back as-is for the caller to reject.
 * The body is capped while streaming, since Content-Length can be understated
 * or omitted entirely.
 */
export function safeFetch(
  urlString: string,
  opts: {
    headers?: Record<string, string>
    signal?: AbortSignal
    maxBytes?: number
  } = {}
): Promise<SafeResponse> {
  return new Promise((resolve, reject) => {
    let url: URL
    try {
      url = new URL(urlString)
    } catch {
      return reject(new Error(`Invalid URL: ${urlString}`))
    }

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return reject(new Error(`Blocked non-HTTP(S) scheme: ${url.protocol}`))
    }

    // Node skips DNS when the host is already an IP, so pinnedLookup never
    // runs for literals - they have to be checked here instead.
    const host = url.hostname.replace(/^\[|\]$/g, "")
    if (net.isIP(host) && !allowsPrivateAddress(host) && isPrivateIp(host)) {
      logger.warn(`Blocked outbound request to private address ${host}`)
      return reject(new Error(`Blocked private address ${host}`))
    }

    const transport = url.protocol === "https:" ? https : http
    const maxBytes = opts.maxBytes ?? 10 * 1024 * 1024

    const headers = { ...opts.headers }
    if (!Object.keys(headers).some((h) => h.toLowerCase() === "user-agent")) {
      headers["User-Agent"] = DEFAULT_USER_AGENT
    }

    const req = transport.request(
      url,
      { method: "GET", headers, lookup: pinnedLookup },
      (res) => {
        const chunks: Buffer[] = []
        let total = 0

        res.on("data", (chunk: Buffer) => {
          total += chunk.length
          if (total > maxBytes) {
            req.destroy()
            reject(new Error(`Response too large: exceeded ${maxBytes} bytes`))
            return
          }
          chunks.push(chunk)
        })

        res.on("end", () => {
          const body = Buffer.concat(chunks)
          const status = res.statusCode ?? 0
          resolve({
            status,
            statusText: res.statusMessage ?? "",
            ok: status >= 200 && status < 300,
            headers: {
              get(name: string): string | null {
                const value = res.headers[name.toLowerCase()]
                return Array.isArray(value) ? value.join(", ") : (value ?? null)
              },
            },
            arrayBuffer: async () =>
              body.buffer.slice(
                body.byteOffset,
                body.byteOffset + body.byteLength
              ) as ArrayBuffer,
          })
        })

        res.on("error", reject)
      }
    )

    req.on("error", reject)

    if (opts.signal) {
      if (opts.signal.aborted) {
        req.destroy()
        return reject(new Error("Request aborted"))
      }
      opts.signal.addEventListener(
        "abort",
        () => req.destroy(new Error("Request aborted")),
        { once: true }
      )
    }

    req.end()
  })
}
