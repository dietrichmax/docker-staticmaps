// __tests__/handleMapRequest.test.ts

import { handleMapRequest, getMapParams, parseCoordinates, isEncodedPolyline } from "../../src/controllers/staticmaps.controller"
import { Request, Response } from "express"
import StaticMaps from "../../src/staticmaps/staticmaps"
import * as cache from "../../src/utils/cache"
import logger from "../../src/utils/logger"

jest.mock("../../src/staticmaps/staticmaps")
jest.mock("../../src/utils/cache")
jest.mock("../../src/utils/logger")

describe("handleMapRequest", () => {
  let req: Partial<Request>
  let res: Partial<Response>

  beforeEach(() => {
    req = { method: "GET", query: {} }
    res = {
      type: jest.fn().mockReturnThis(),
      send: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      end: jest.fn(),
    }
    jest.clearAllMocks()
  })

  it("serves cached tile if available", async () => {
    jest.spyOn(cache, "getCachedTile").mockReturnValue(Buffer.from("mockImage"))
    jest.spyOn(cache, "createCacheKeyFromRequest").mockReturnValue("cache-key")

    await handleMapRequest(req as any, res as Response)

    expect(res.type).toHaveBeenCalledWith("image/png")
    expect(res.send).toHaveBeenCalledWith(Buffer.from("mockImage"))
  })

  it("responds with 422 if required params are missing", async () => {
    jest.spyOn(cache, "getCachedTile").mockReturnValue(undefined)
    jest.spyOn(cache, "createCacheKeyFromRequest").mockReturnValue("cache-key")

    const query = { center: undefined }
    req.query = query

    await handleMapRequest(req as any, res as Response)

    expect(res.status).toHaveBeenCalledWith(422)
    expect(res.json).toHaveBeenCalledWith({
      error: "Missing parameters",
      missingParams: ["{center} or {coordinates}"],
    })
  })

it("responds with an image if all is valid", async () => {
  jest.spyOn(cache, "getCachedTile").mockReturnValue(undefined);
  jest.spyOn(cache, "createCacheKeyFromRequest").mockReturnValue("key");
  jest.spyOn(cache, "setCachedTile").mockImplementation(() => {});

  const imageBuffer = Buffer.from("image");

  // Mock StaticMaps methods properly
  const renderMock = jest.fn().mockResolvedValue(undefined);
  const bufferMock = jest.fn().mockResolvedValue(imageBuffer);

  jest.spyOn(StaticMaps.prototype, "render").mockImplementation(renderMock);
  Object.defineProperty(StaticMaps.prototype, "image", {
    get: () => ({
      buffer: bufferMock,
    }),
  });

  const req = {
    method: "GET",
    query: {
      center: "48.8566,2.3522",
      width: "256",
      height: "256",
      zoom: "12",
    },
  };

  const res = {
    set: jest.fn().mockReturnThis(),
    end: jest.fn(),
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };

  await handleMapRequest(req as any, res as any);

  expect(res.set).toHaveBeenCalledWith({
    "Content-Type": "image/png",
    "Content-Length": imageBuffer.length.toString(),
  });
  expect(res.end).toHaveBeenCalledWith(imageBuffer);
});

  it("handles errors in rendering gracefully", async () => {
    jest.spyOn(cache, "getCachedTile").mockReturnValue(undefined)
    jest.spyOn(cache, "createCacheKeyFromRequest").mockReturnValue("key")
    ;(StaticMaps.prototype.render as jest.Mock).mockRejectedValue(new Error("render fail"))

    req.query = {
      center: "48.1,11.6",
      width: "400",
      height: "300",
    }

    await handleMapRequest(req as any, res as Response)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ error: "Internal Server Error" })
  })
})

describe("isEncodedPolyline", () => {
  it("detects encoded polylines", () => {
    expect(isEncodedPolyline(["_p~iF~ps|U_ulLnnqC_mqNvxq`@"]))
      .toBe(true)
  })

  it("returns false for lat/lon strings", () => {
    expect(isEncodedPolyline(["48.1,11.6"])).toBe(false)
  })
})

describe("parseCoordinates", () => {
  it("parses encoded polyline", () => {
    const coords = parseCoordinates(["_p~iF~ps|U_ulLnnqC_mqNvxq`@"])
    expect(coords[0]).toHaveLength(2)
  })

  it("parses lat,lon strings", () => {
    const coords = parseCoordinates(["48.1,11.6"])
    expect(coords).toEqual([[11.6, 48.1]])
  })

  it("parses coordinate objects", () => {
    const coords = parseCoordinates([{ lat: 48.1, lon: 11.6 }])
    expect(coords).toEqual([[11.6, 48.1]])
  })
})
