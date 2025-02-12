/**
 * Interface for Basemap options.
 */
interface Basemaps {
  /**
   * The name of the basemap.
   */
  basemap: string

  /**
   * The URL template for the basemap tiles.
   */
  url: string
}

/**
 * A collection of predefined basemaps with their corresponding URLs.
 */
export const basemaps: Basemaps[] = [
  {
    basemap: "streets",
    url: "https://services.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
  },
  {
    basemap: "satellite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  },
  {
    basemap: "topo",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
  },
  {
    basemap: "gray-background",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
  },
  {
    basemap: "oceans",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/Ocean_Basemap/MapServer/tile/{z}/{y}/{x}",
  },
  {
    basemap: "national-geographic",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/{z}/{y}/{x}",
  },
  { basemap: "osm", url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png" },
  { basemap: "otm", url: "https://tile.opentopomap.org/{z}/{x}/{y}.png" },
  {
    basemap: "stamen-toner",
    url: "https://stamen-tiles.a.ssl.fastly.net/toner/{z}/{x}/{y}.png",
  },
  {
    basemap: "stamen-toner-background",
    url: "https://stamen-tiles.a.ssl.fastly.net/toner-background/{z}/{x}/{y}.png",
  },
  {
    basemap: "stamen-toner-lite",
    url: "https://stamen-tiles.a.ssl.fastly.net/toner-lite/{z}/{x}/{y}.png",
  },
  {
    basemap: "stamen-terrain",
    url: "https://stamen-tiles.a.ssl.fastly.net/terrain/{z}/{x}/{y}.png",
  },
  {
    basemap: "stamen-terrain-background",
    url: "https://stamen-tiles.a.ssl.fastly.net/terrain-background/{z}/{x}/{y}.png",
  },
  {
    basemap: "stamen-watercolor",
    url: "https://stamen-tiles.a.ssl.fastly.net/watercolor/{z}/{x}/{y}.png",
  },
  {
    basemap: "carto-light",
    url: "https://cartodb-basemaps-a.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png",
  },
  {
    basemap: "carto-dark",
    url: "https://cartodb-basemaps-a.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png",
  },
  {
    basemap: "carto-voyager",
    url: "https://cartodb-basemaps-a.global.ssl.fastly.net/rastertiles/voyager/{z}/{x}/{y}.png",
  },
]
