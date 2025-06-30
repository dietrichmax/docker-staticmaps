// TileManager.ts
import { getCachedTile, setCachedTile } from "../utils/cache"
import { workOnQueue } from "./utils"
import logger from "../utils/logger"
import { TileServerOptions, TileServerConfigOptions } from "../types/types"

/**
 * Class to configure tile server URLs and subdomains.
 */
export class TileServerConfig {
  /** The URL template for the tile server */
  public readonly tileUrl: string
  /** List of subdomains for the tile server */
  public readonly tileSubdomains: string[]

  /**
   * Create a TileServerConfig instance.
   * @param {TileServerOptions} options - Configuration options for the tile server.
   */
  constructor(private options: TileServerOptions) {
    this.tileUrl =
      options.tileUrl ?? "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
    this.tileSubdomains = options.tileSubdomains ?? options.subdomains ?? []
  }
}

// TileManager class handles fetching tiles with caching, concurrency, and support checks
export class TileManager {
  tileLayers: TileServerConfig[]
  tileRequestTimeout?: number
  tileRequestHeader?: any
  tileRequestLimit: number
  reverseY: boolean

  constructor(options: {
    tileLayers: TileServerConfig[]
    tileRequestTimeout?: number
    tileRequestHeader?: any
    tileRequestLimit?: number
    reverseY?: boolean
  }) {
    this.tileLayers = options.tileLayers
    this.tileRequestTimeout = options.tileRequestTimeout
    this.tileRequestHeader = options.tileRequestHeader
    this.tileRequestLimit = options.tileRequestLimit || 2
    this.reverseY = options.reverseY || false
  }

  /**
   * Fetches a single tile image from a given URL.
   *
   * @param {TileData} data - The tile data containing the URL and other information.
   * @returns {Promise<TileFetchResult>}
   */
  async getTile(data: any) {
    const cacheKey = `GET:${data.url}`

    const cached = getCachedTile(cacheKey)
    if (cached) {
      return {
        success: true,
        tile: {
          url: data.url,
          box: data.box,
          body: cached,
        },
      }
    }

    const options = {
      method: "GET",
      headers: this.tileRequestHeader || {},
      timeout: this.tileRequestTimeout,
    }

    try {
      const res = await fetch(data.url, options)

      if (!res.ok) {
        throw new Error(`Failed to fetch tile: ${res.statusText}`)
      }

      logger.debug(`Fetched tile: ${data.url}`)

      const contentType = res.headers.get("content-type")
      if (contentType && !contentType.startsWith("image/")) {
        throw new Error("Tiles server response with wrong data")
      }

      const arrayBuffer = await res.arrayBuffer()
      const body = Buffer.from(arrayBuffer)

      setCachedTile(cacheKey, body)

      return {
        success: true,
        tile: {
          url: data.url,
          box: data.box,
          body,
        },
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || error,
      }
    }
  }

  /**
   *  Fetching tiles and limit concurrent connections
   */
  async getTiles(baseLayers: Object[]) {
    const limit = this.tileRequestLimit

    // Limit concurrent connections to tiles server
    // https://operations.osmfoundation.org/policies/tiles/#technical-usage-requirements
    if (Number(limit)) {
      const aQueue = []
      const tiles: string[] = []
      for (let i = 0, j = baseLayers.length; i < j; i += limit) {
        const chunks = baseLayers.slice(i, i + limit)
        const sQueue: any = []
        aQueue.push(async () => {
          chunks.forEach((r) => {
            sQueue.push(
              (async () => {
                const tile: any = await this.getTile(r)
                tiles.push(tile)
              })()
            )
          })
          await Promise.all(sQueue)
        })
      }
      await workOnQueue(aQueue)
      return tiles
    }

    // Do not limit concurrent connections at all
    const tilePromises: any[] = []
    baseLayers.forEach((r) => {
      tilePromises.push(this.getTile(r))
    })
    return Promise.all(tilePromises)
  }
}
