// src/types.ts

import { Request } from "express"
import IconMarker from "../staticmaps/marker"
import Polyline from "../staticmaps/polyline"

/**
 * Extended Express request for map-related API calls.
 */
export interface MapRequest extends Request {
  query: { [key: string]: string | string[] | undefined }
  body: Record<string, any>
  path: string
}

/**
 * Information about client rate limiting.
 */
export interface ClientRateLimitInfo {
  totalHits: number         // Number of requests made in the window
  resetTime: Date           // When the rate limit window resets
  // Additional properties may be added based on the rate limiter version
}

/**
 * Basemap configuration entry.
 */
export interface Basemaps {
  basemap: string           // Name of the basemap
  url: string               // Tile URL template
}

/**
 * Tile server options.
 */
export interface TileServerOptions {
  tileUrl?: string              // Optional tile URL template (default: "https://tile.openstreetmap.org/{z}/{x}/{y}.png")
  tileSubdomains?: string[]     // Optional subdomains for tile requests
  subdomains?: string[]         // Optional subdomains (backward compatibility)
}

/**
 * Text annotation options for maps.
 */
export interface TextOptions {
  coord?: [number, number]              // Coordinate where the text should appear
  text?: string                         // Text to display
  color?: string                        // Text color (default: "#000000BB")
  width?: number | string               // Border width (default: "1px")
  fill?: string                         // Background fill color (default: "#000000")
  size?: number                         // Font size in pixels (default: 12)
  font?: string                         // Font family (default: "Arial")
  anchor?: "start" | "middle" | "end"   // Anchor alignment (default: "start")
  offsetX?: number                      // Horizontal offset (default: 0)
  offsetY?: number                      // Vertical offset (default: 0)
}

/**
 * Output image options.
 */
export interface ImageOptions {
  width?: number        // Output image width
  height?: number       // Output image height
  quality?: number      // JPEG/WebP quality (0–100)
}

/**
 * Tile data returned from a tile server.
 */
export interface TileData {
  body: Buffer                  // Raw tile image buffer
  box: [number, number]         // Position or size reference [x, y] or [width, height]
}

/**
 * Tile part representation within a composed image.
 */
export interface TilePart {
  success: boolean                               // Indicates if tile fetch succeeded
  position?: { top: number; left: number }       // Tile position in final image
  data?: Buffer                                  // Tile buffer (if success is true)
}

/**
 * Options for rendering polylines.
 */
export interface PolylineOptions {
  coords: [number, number][]   // Line coordinates as [lon, lat] pairs
  color?: string               // Line color (default: "#000000BB")
  fill?: string                // Fill color (optional)
  width?: number               // Line width in pixels (default: 3)
}

/**
 * Options for rendering multipolygons.
 */
export interface MultiPolygonOptions {
  coords: number[][][]         // Polygon coordinates: [ [ [lon, lat], ... ], ... ]
  color?: string               // Stroke color
  fill?: boolean               // Whether to fill the polygon
  width?: number               // Border width
}

/**
 * Configuration options for icons (markers).
 */
export interface IconOptions {
  coord?: [number, number]     // Icon anchor coordinate
  img?: string                 // Image source (URL or base64)
  height?: number              // Image height
  width?: number               // Image width
  drawWidth?: number           // Final draw width
  drawHeight?: number          // Final draw height
  resizeMode?: string          // Resizing mode (e.g., "cover")
  offsetX?: number             // X offset from anchor
  offsetY?: number             // Y offset from anchor
}

/**
 * Tile layer configuration options.
 */
export interface TileServerConfigOptions {
  tileUrl?: string             // Tile URL template
  tileSubdomains?: string[]   // Subdomains used for tile sharding
}

/**
 * Options used to render the final map.
 */
export interface MapOptions {
  width: number                                      // Output image width
  height: number                                     // Output image height
  zoom: number                                       // Zoom level
  center: { lat: number; lon: number }              // Center coordinates
  markers?: IconMarker[]                            // Array of icon markers
  lines?: Array<Array<Polyline>>                    // Array of polyline groups
  tileUrl?: string                                  // Tile URL override
  tileSubdomains?: string[]                         // Subdomains for tile fetching
  tileLayers?: TileServerConfigOptions[]            // Optional array of tile layer configs
  paddingX?: number                                 // Horizontal padding
  paddingY?: number                                 // Vertical padding
  tileSize?: number                                 // Size of each tile (usually 256)
  tileRequestTimeout?: number                       // Timeout for tile requests (ms)
  tileRequestHeader?: any                           // Optional headers for tile requests
  tileRequestLimit?: number                         // Max number of tile requests
  reverseY?: boolean                                // Whether to reverse Y tile coordinates
  zoomRange?: { min?: number; max?: number }        // Allowed zoom range
}
