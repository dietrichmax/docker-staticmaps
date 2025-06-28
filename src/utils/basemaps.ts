import { Basemaps } from "src/types/types"

/**
 * A collection of predefined basemaps with their corresponding URLs.
 */
export const basemaps: Basemaps[] = [
  {
    basemap: "streets",
    url: "https://services.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
    attribution:
      "Esri, HERE, Garmin, USGS, Intermap, INCREMENT P, NRCan, Esri Japan, METI, Mapwithyou, NOSTRA, © OpenStreetMap contributors, and the GIS User Community",
  },
  {
    basemap: "satellite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution:
      "Esri, USGS | Esri, TomTom, FAO, NOAA, USGS | Earthstar Geographics",
  },
  {
    basemap: "topo",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
    attribution:
      "Esri, USGS | Esri, TomTom, FAO, NOAA, USGS | Esri, HERE, FAO, NOAA",
  },
  {
    basemap: "gray-background",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
    attribution: "Esri, HERE, Garmin, USGS, EPA, NPS | Esri, HERE, NPS",
  },
  {
    basemap: "hillshade",
    url: "https://services.arcgisonline.com/arcgis/rest/services/Elevation/World_Hillshade/MapServer/tile/{z}/{y}/{x}",
    attribution: "Esri, USGS | Esri, TomTom, Garmin, FAO, NOAA, USGS",
  },
  {
    basemap: "national-geographic",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/{z}/{y}/{x}",
    attribution: "Esri, USGS | Esri, TomTom, FAO, NOAA, USGS",
  },
  {
    basemap: "osm",
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "© OpenStreetMap contributors",
  },
  {
    basemap: "otm",
    url: "https://tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: "© OpenStreetMap contributors, SRTM | © OpenTopoMap",
  },
  {
    basemap: "carto-light",
    url: "https://cartodb-basemaps-a.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png",
    attribution: "© CARTO",
  },
  {
    basemap: "carto-dark",
    url: "https://cartodb-basemaps-a.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png",
    attribution: "© CARTO",
  },
  {
    basemap: "carto-voyager",
    url: "https://cartodb-basemaps-a.global.ssl.fastly.net/rastertiles/voyager/{z}/{x}/{y}.png",
    attribution: "© CARTO",
  },
]
