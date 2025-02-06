import server from "../src/server"
import request from "supertest"
import dotenv from 'dotenv'
import { validateParams, getTileUrl, parseCoordinates } from "../src/utils"
dotenv.config()

const endpoint = process.env.PORT ? process.env.ENDPOINT : "/staticmaps?"
const port = process.env.PORT ? parseInt(process.env.PORT) : 3000

describe("Parameter Validation", () => {
  it("should validate correct params", () => {
    const params = { center: '-119.49280,37.81084', zoom: '9' }
    const { missingParams, options } = validateParams(params)
    expect(missingParams.length).toBe(0)
  })

  it("should detect missing params", () => {
    const params = { basemap: 'osm', zoom: '9' }
    const { missingParams, options } = validateParams(params)
    expect(missingParams.length).toBeGreaterThan(0)
  })
})

describe("Tile URL Generation", () => {
  it("should return predefined basemap URL", () => {
    const url = getTileUrl(null, "national-geographic")
    expect(url).toBe("https://server.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/{z}/{y}/{x}")
  })

  it("should return custom tile URL", () => {
    const url = getTileUrl("https://localhost/tilepath/tile/{z}/{y}/{x}", null)
    expect(url).toBe("https://localhost/tilepath/tile/{z}/{y}/{x}")
  })
})

describe("Coordinate Parsing", () => {
  it("should parse coordinate array correctly", () => {
    const array = parseCoordinates([
      '41.891169,12.491691',
      '41.890633,12.493697',
      '41.889012,12.492989',
      '41.889467,12.490811',
      '41.891169,12.491691'
    ])
    expect(Array.isArray(array)).toBe(true)
    expect(Array.isArray(array[0])).toBe(true)
  })
})

const imageTest = (params, description) => {
  it(description, async () => {
    const query = endpoint + params
    const res = await request(server).get(query)

    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toBe("image/png")
  })
}

describe("Image Generation", () => {
  imageTest("center=-119.49280,37.81084&zoom=9", "should return simple image")
  imageTest("center=-119.49280,37.81084&zoom=9&basemap=topo", "should return specific basemap image")
  imageTest("width=600&height=600&polyline=weight:6|color:0000ff|48.726304979176675,-3.9829935637739382|48.72623035828412,-3.9829726446543385", "should return polyline image")
  imageTest("width=600&height=600&polygon=color:4874db|weight:7|fill:eb7a34|41.891169,12.491691|41.890633,12.493697|41.889012,12.492989|41.889467,12.490811|41.891169,12.491691", "should return polygon image")
  imageTest("width=600&height=600&markers=48.726304979176675,-3.9829935637739382|48.724117073204575,-3.9820862134785551", "should return marker image")
  imageTest("width=600&height=600&basemap=osm&circle=radius:100|48.726304979176675,-3.9829935637739382", "should return circle image")
  imageTest("?width=600&height=600&polyline=weight:6|color:0000ff|48.726304979176675,-3.9829935637739382|48.72623035828412,-3.9829726446543385|48.726126671101639,-3.9829546542797467|48.725965124843256,-3.9829070729298808&markers=48.726304979176675,-3.9829935637739382|48.724117073204575,-3.9820862134785551", "should return marker and polyline image")
})

