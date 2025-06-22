import { TileServerOptions } from "src/types/types"

/**
 * Class to configure Tile Server settings.
 */
class TileServerConfig {
  /**
   * The URL template for the tile server.
   */
  public readonly tileUrl: string

  /**
   * The array of subdomains to use in the tile server URL.
   */
  public readonly tileSubdomains: string[]

  /**
   * Constructor for the TileServerConfig class.
   * @param options - Options for configuring the tile server including URL and subdomains.
   */
  constructor(private options: TileServerOptions) {
    this.tileUrl =
      options.tileUrl ?? "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
    this.tileSubdomains = options.tileSubdomains ?? options.subdomains ?? []
  }
}

export default TileServerConfig
