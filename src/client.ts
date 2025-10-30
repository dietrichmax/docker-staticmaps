import "ol/ol.css"
import Map from "ol/Map"
import View from "ol/View"
import TileLayer from "ol/layer/Tile"
import OSM from "ol/source/OSM"
import XYZ from "ol/source/XYZ"
import LayerGroup from "ol/layer/Group"
import { fromLonLat, toLonLat } from "ol/proj"
import { basemaps } from "./utils/basemaps"

let map: Map
let currentBasemap: string = "osm"
const center: [number, number] = [0, 20]
const zoom = 1
const height = 400
let isLoading = false
let staticMapImgElement: HTMLImageElement | null = null
let layerGroup: LayerGroup

function initializeMap() {
  const initialLayer = new TileLayer({ source: new OSM() })
  layerGroup = new LayerGroup({ layers: [initialLayer] })

  map = new Map({
    target: "map",
    layers: [layerGroup],
    view: new View({
      center: fromLonLat(center),
      zoom,
      projection: "EPSG:3857",
    }),
  })

  map.on("moveend", () => {
    const centerAndZoom = getMapCenterAndZoom()
    if (!centerAndZoom) return
    const { center, zoom } = centerAndZoom
    updateStaticMapUrl(center, zoom, currentBasemap)
  })

  window.addEventListener("resize", () => map.updateSize())

  populateBasemapDropdown()
}

// Get current map center and zoom as [lon, lat] and zoom number
function getMapCenterAndZoom(): { center: [number, number]; zoom: number } | null {
  const view = map.getView()
  if (!view) return null

  const center = view.getCenter()
  if (!center) return null

  const [lon, lat] = toLonLat(center)
  const zoom = view.getZoom() ?? 1
  return { center: [lon, lat], zoom }
}

// Populate dropdown with basemaps
function populateBasemapDropdown() {
  const select = document.getElementById("basemapSelect") as HTMLSelectElement
  basemaps.forEach((b) => {
    const option = document.createElement("option")
    option.value = b.basemap
    option.text = b.basemap
    select.appendChild(option)
  })

  select.value = currentBasemap
  select.addEventListener("change", (e) => {
    const target = e.target as HTMLSelectElement
    switchBasemap(target.value)
  })
}

// Switch basemap
function switchBasemap(basemapKey: string) {
  const basemap = basemaps.find((b) => b.basemap === basemapKey)
  if (!basemap) return

  layerGroup.getLayers().clear()
  const newLayer = new TileLayer({ source: new XYZ({ url: basemap.url }) })
  layerGroup.getLayers().push(newLayer)

  currentBasemap = basemap.basemap

  const centerAndZoom = getMapCenterAndZoom()
  if (!centerAndZoom) return
  const { center, zoom } = centerAndZoom
  updateStaticMapUrl(center, zoom, currentBasemap)
}

// Update static map URL
function updateStaticMapUrl(centerLonLat: [number, number], zoom: number, basemap: string) {
  const mapWidth = document.getElementById("map")!.offsetWidth
  const [lon, lat] = centerLonLat
  const staticMapUrl = `/staticmaps?width=${mapWidth}&height=${height}&center=${encodeURIComponent(`${lat},${lon}`)}&zoom=${Math.round(zoom)}&basemap=${basemap}`
  document.getElementById("staticMapUrlDisplay")!.textContent = staticMapUrl
}

// Generate static map
async function generateStaticMap() {
  if (isLoading) return
  isLoading = true

  const centerAndZoom = getMapCenterAndZoom()
  if (!centerAndZoom) return
  const { center, zoom } = centerAndZoom
  
  const currentZoom = Math.round(zoom)
  const mapWidth = document.getElementById("map")!.offsetWidth
  const staticMapUrl = `/demo-map?width=${mapWidth}&height=${height}&center=${encodeURIComponent(`${center[1]},${center[0]}`)}&zoom=${currentZoom}&basemap=${currentBasemap}`

  document.getElementById("staticMapUrlDisplay")!.textContent = staticMapUrl

  try {
    const response = await fetch(staticMapUrl)
    const blob = await response.blob()
    const imgURL = URL.createObjectURL(blob)

    if (staticMapImgElement) {
      staticMapImgElement.src = imgURL
    } else {
      staticMapImgElement = document.createElement("img")
      staticMapImgElement.src = imgURL
      staticMapImgElement.style.width = "100%"
      staticMapImgElement.style.height = `${height}px`
      staticMapImgElement.className = "static-map"
      document.body.appendChild(staticMapImgElement)
    }
  } catch (err) {
    console.error("Error generating static map:", err)
  } finally {
    isLoading = false
  }
}

// Event listener for generate button
document.getElementById("generateStaticMap")!.addEventListener("click", generateStaticMap)
window.addEventListener("load", initializeMap)
