import StaticMaps from "../staticmaps/staticmaps"
import { basemaps } from "../utils/basemaps"
import logger from "../utils/logger"
import { Request, Response } from "express"
import IconMarker from "../staticmaps/marker"
import Polyline from "../staticmaps/polyline"
import Circle from "../staticmaps/circle"
import Text from "../staticmaps/text"
import polyline from "@mapbox/polyline"

/**
 * Custom Request type for map requests.
 * Query params can be strings, arrays of strings, or undefined.
 */
export interface MapRequest extends Request {
  query: { [key: string]: string | string[] | undefined };
  body: Record<string, any>; // if you use body for POST requests, define as needed
}

/**
 * Handle a map request to generate a static map image.
 *
 * @param req - The incoming HTTP request (with typed query and body).
 * @param res - The HTTP response.
 */
export async function handleMapRequest(
  req: MapRequest,
  res: Response
): Promise<void> {
  // Use query params for GET, body params for POST/others
  const params: Record<string, any> =
    req.method === "GET" ? req.query : req.body;

  // getMapParams expects a Record<string, any>, so cast accordingly
  const { missingParams, options } = getMapParams(params);

  if (missingParams.length > 0) {
    logger.warn("Missing parameters", { missingParams });
    res.status(422).json({ error: "Missing parameters", missingParams });
    return;
  }

  logger.debug("Request params:", { params });

  try {
    const img = await generateMap(options);
    logger.info("Image successfully rendered", {
      format: options.format,
      size: img.length,
    });

    res
      .set({
        "Content-Type": `image/${options.format}`,
        "Content-Length": img.length.toString(),
      })
      .end(img);
  } catch (error) {
    logger.error("Error rendering image", { error });
    res.status(500).json({ error: "Internal Server Error" });
  }
}

// --- Helpers ---

/**
 * Parses a list of items to extract parameters and leftover coordinates.
 *
 * @param {string[]} items - Array of strings representing the items to parse.
 * @param {string[]} paramsList - List of parameter keys that can be extracted from the items.
 * @returns {{extracted: ExtractedParams, coordinates: string[]}} - An object containing the extracted parameters and leftover coordinates.
 */

interface ExtractedParams {
  color?: string;
  weight?: number;
  fill?: string;
  radius?: number;
  width?: number;
  img?: string;
  height?: number;
  [key: string]: any; // Allow other properties dynamically if needed
}

function extractParams(
  items: string[],
  paramsList: string[]
): { extracted: ExtractedParams; coordinates: string[] } {
  const allowedColors = new Set([
    "blue",
    "green",
    "red",
    "yellow",
    "orange",
    "purple",
    "black",
    "white",
  ]);

  const result = items.reduce(
    (acc, item) => {
      let matched = false;

      for (const param of paramsList) {
        const prefix = `${param}:`;
        if (item.startsWith(prefix)) {
          const rawValue = item.slice(prefix.length);
          const value = decodeURIComponent(rawValue);

          logger.debug(`Parsing param: ${param} with raw value: ${rawValue} decoded as: ${value}`);

          if (param === "color" || param === "fill") {
            acc.extracted[param] = allowedColors.has(value.toLowerCase())
              ? value.toLowerCase()
              : `#${value}`;
          } else if (["weight", "radius", "width"].includes(param)) {
            const parsedInt = parseInt(value, 10);
            if (!isNaN(parsedInt)) {
              acc.extracted[param] = parsedInt;
            } else {
              logger.warn(`Failed to parse integer for param '${param}': ${value}`);
            }
          } else {
            acc.extracted[param] = value;
          }

          matched = true;
          break;
        }
      }

      if (!matched) {
        logger.debug(`Item treated as coordinate: ${item}`);
        acc.coordinates.push(item);
      }

      return acc;
    },
    { extracted: {} as ExtractedParams, coordinates: [] as string[] }
  );

  logger.debug("Extraction result", result);

  return result;
}

/**
 * Parses multiple shapes for a given key if provided as an array in the params.
 *
 * @param {string} key - The key corresponding to the shape in the params object.
 * @param {Record<string, any>} defaults - Default properties for the shape.
 * @param {Record<string, any>} params - An object containing all parameters.
 * @returns {Array<Record<string, any>>} - An array of parsed feature objects.
 */
function parseMultipleShapes(
  key: string,
  defaults: Record<string, any>,
  params: Record<string, any>
): Array<Record<string, any>> {
  const raw = params[key];
  if (!raw) return [];

  const applyDefaultsAndFixCoords = (shape: Record<string, any>) => {
    const adjusted = { ...defaults, ...shape };
    const coords = adjusted.coords;

    if (!coords) {
      adjusted.coords = [];
      return adjusted;
    }

    // Case 1: coords is [number, number] — wrap in array
    if (
      Array.isArray(coords) &&
      coords.length === 2 &&
      typeof coords[0] === "number" &&
      typeof coords[1] === "number"
    ) {
      adjusted.coords = [coords];
    }
    // Case 2: coords is an array of strings (e.g., encoded polylines or coordinate strings)
    else if (Array.isArray(coords) && typeof coords[0] === "string") {
      // Keep as is; parseCoordinates will handle parsing
      adjusted.coords = parseCoordinates(coords);
    }
    // Case 3: coords is an array of arrays (e.g., [[lon, lat], [lon, lat]])
    else if (Array.isArray(coords) && Array.isArray(coords[0])) {
      adjusted.coords = coords;
    }
    // Case 4: coords is an object with lat/lon properties (single coordinate)
    else if (
      coords &&
      typeof coords === "object" &&
      coords.lat !== undefined &&
      coords.lon !== undefined
    ) {
      adjusted.coords = [[coords.lon, coords.lat]];
    }
    // Fallback: unrecognized format
    else {
      adjusted.coords = [];
    }

    return adjusted;
  };


  if (typeof raw === "object" && !Array.isArray(raw)) {
    return [applyDefaultsAndFixCoords(raw)];
  }

  if (Array.isArray(raw) && typeof raw[0] === "object") {
    return raw.map(applyDefaultsAndFixCoords);
  }

  // Otherwise fallback to string parsing (e.g. polyline=48.1,10.1|48.2,10.2|color=red)
  const shapeValues: string[] = Array.isArray(raw) ? raw : [raw];

  return shapeValues.map((valueString) => {
    const items = valueString.split("|");
    const { extracted, coordinates } = extractParams(items, [
      "color",
      "weight",
      "fill",
      "radius",
      "width",
      "img",
      "height",
      "text",
      "size",
      "font",
      "anchor",
      "offsetX",
      "offsetY",
    ]);

    logger.debug("Extracted params", extracted);

    return {
      ...defaults,
      ...extracted,
      coords: parseCoordinates(coordinates),
    };
  });
}

/**
 * Safely parses a value using the provided parser.
 *
 * @param {*} value - The value to be parsed.
 * @param {Function} [parser=(v) => v] - A function to parse the value. Defaults to an identity function.
 * @returns {*} - The parsed value, or null if the input value is falsy.
 */
function safeParse(value: any, parser: Function = (v: any) => v): any {
  return value ? parser(value) : null
}

/**
 * Determines whether a given array of strings likely represents an encoded polyline.
 * Encoded polylines contain characters outside digits, commas, pipes, hyphens, and spaces.
 *
 * @param coords - Array of coordinate strings.
 * @returns True if the strings likely represent an encoded polyline.
 */
export function isEncodedPolyline(coords: string[]): boolean {
  return coords.some((s) => /[^0-9.,|\- ]/.test(s));
}

/**
 * Parse coordinates from various formats.
 *
 * @param {Array<Array<number>> | string[] | Object[]} coords - An array of coordinates in different formats.
 * @returns {Array<Array<number>>} - An array of parsed coordinates in [longitude, latitude] format.
 */

export function parseCoordinates(coords: any): Array<[number, number]> {
  if (!Array.isArray(coords) || coords.length === 0) return [];

  // Fallback to existing behavior if input is structured
  if (Array.isArray(coords[0]) || (typeof coords[0] === "object" && coords[0] !== null)) {
    return coords
      .map((coord) => {
        if (Array.isArray(coord) && coord.length === 2) return [coord[0], coord[1]];
        if (coord && typeof coord === "object" && coord.lat !== undefined && coord.lon !== undefined) {
          return [coord.lon, coord.lat];
        }
        return null;
      })
      .filter((coord): coord is [number, number] => coord !== null);
  }

  if (isEncodedPolyline(coords)) {
    const joined = coords.join("|");
    const encoded = joined.startsWith("{") && joined.endsWith("}")
      ? joined.slice(1, -1)
      : joined;

    try {
      return polyline.decode(encoded).map(([lat, lng]) => [lng, lat]);
    } catch (err) {
      console.error("Polyline decode error", err);
      return [];
    }
  }

  // Fallback to "lat,lon" string format
  return coords
    .map((coord: string) => {
      const [latStr, lonStr] = coord.split(",");
      const lat = Number(latStr);
      const lon = Number(lonStr);
      if (isNaN(lat) || isNaN(lon)) return null;
      return [lon, lat];
    })
    .filter((c): c is [number, number] => c !== null);
}

/**
 * Extract map parameters from the provided input.
 *
 * @param {Record<string, any>} params - An object containing all map configuration parameters.
 * @returns {{ missingParams: string[], options: Record<string, any> }} - An object with missing parameter information and parsed options.
 */
export function getMapParams(params: Record<string, any>): {
  missingParams: string[]
  options: Record<string, any>
} {
  logger.debug("Parsing map parameters", params);

  const defaultParams = {
    width: 800,
    height: 600,
    paddingX: 10,
    paddingY: 10,
    tileUrl: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    tileLayers: [],
    tileSize: 256,
    tileRequestTimeout: 5000,
    tileRequestHeader: {},
    tileRequestLimit: 4,
    zoomRange: [1, 18],
    zoom: 10,
    reverseY: false,
    format: "png",
  };

  // Define defaults for each feature
  const shapeDefaults = {
    polyline: { weight: 5, color: "blue" },
    polygon: { color: "#4874db", weight: 3, fill: "#00FF003F" },
    circle: { color: "#4874db", width: 3, fill: "#0000bb", radius: 10 },
    markers: { img: "./public/images/marker-28.png", width: 28, height: 28 },
    text: {
      color: "#000000BB",
      width: 1,
      fill: "#000000",
      size: 12,
      font: "Arial",
      anchor: "start",
    },
  };

  // Parse each feature from the request parameters.
  const features: Record<string, any> = {};

  features["polyline"] = parseMultipleShapes("polyline", shapeDefaults.polyline, params);
  logger.debug("Parsed polylines:", features["polyline"]);
  console.log("Parsed polylines:", features["polyline"])

  features["polygon"] = parseMultipleShapes("polygon", shapeDefaults.polygon, params);
  logger.debug("Parsed polygons:", features["polygon"]);

  features["circle"] = parseMultipleShapes("circle", shapeDefaults.circle, params);
  logger.debug("Parsed circles:", features["circle"]);

  features["text"] = parseMultipleShapes("text", shapeDefaults.text, params);
  logger.debug("Parsed texts:", features["text"]);

  features["markers"] = parseMultipleShapes("markers", shapeDefaults.markers, params);
  logger.debug("Parsed markers:", features["markers"]);

  // Check that at least one coordinate source is provided.
  const center = safeParse(params.center, (val: any) => {
    if (typeof val === "string") {
      const [lat, lon] = val.split(",").map(Number);
      return [lat, lon];
    } else if (
      Array.isArray(val) &&
      val.length === 2 &&
      typeof val[0] === "number" &&
      typeof val[1] === "number"
    ) {
      // val is an array of numbers, so this branch is valid
      return [val[1], val[0]];
    } else if (
      val &&
      typeof val === "object" &&
      !Array.isArray(val) && // add this check to exclude arrays here
      val.lat !== undefined &&
      val.lon !== undefined
    ) {
      return [val.lon, val.lat];
    }
    return null;
  });

  const missingParams: string[] = [];
  const hasCoordinates = Object.values(features).some((feature) =>
    feature &&
    ((Array.isArray(feature) && feature.some((f) => f.coords && f.coords.length)) ||
     (!Array.isArray(feature) && feature.coords && feature.coords.length))
  );

  if (!center && !hasCoordinates) {
    missingParams.push("{center} or {coordinates}");
    logger.debug("Missing required parameters: center or coordinates");
  }

  const options = {
    ...defaultParams,
    width: parseInt(params.width, 10) || 300,
    height: parseInt(params.height, 10) || 300,
    paddingX: parseInt(params.paddingX, 10),
    paddingY: parseInt(params.paddingY, 10),
    tileUrl: getTileUrl(params.tileUrl, params.basemap),
    tileSubdomains: params.tileSubdomains,
    tileLayers: params.tileLayers,
    tileSize: parseInt(params.tileSize, 10) || 256,
    tileRequestTimeout: params.tileRequestTimeout,
    tileRequestHeader: params.tileRequestHeader,
    tileRequestLimit: params.tileRequestLimit,
    zoomRange: params.zoomRange,
    zoom: parseInt(params.zoom, 10),
    reverseY: params.reverseY,
    format: params.format || "png",
    center,
    ...features,
  };

  logger.debug("Final parsed options:", options);

  return {
    missingParams,
    options,
  };
}

/**
 * Generates a static map image based on the provided options.
 *
 * @param {Record<string, any>} options - The configuration options for generating the map.
 * @returns {Promise<Buffer>} A promise that resolves to a Buffer containing the generated map image.
 */
export async function generateMap(options: any): Promise<Buffer> {
  logger.debug("Starting map generation with options:", options);

  const map = new StaticMaps(options);

  // Helper: ensure item is always an array
  const toArray = (item: any) => (Array.isArray(item) ? item : item ? [item] : []);

  // MARKERS
  toArray(options.markers).forEach((markerOpt: any, i: number) => {
    (markerOpt.coords || []).forEach((coord: any, j: number) => {
      logger.debug(`Adding marker [${i}][${j}]`, { coord, img: markerOpt.img });
      const marker = new IconMarker({
        coord,
        img: markerOpt.img,
        width: markerOpt.width,
        height: markerOpt.height,
        offsetX: 13.6,
        offsetY: 27.6,
      });
      map.addMarker(marker);
    });
  });

  // POLYLINES
  toArray(options.polyline).forEach((line: any, i: number) => {
    if (line.coords?.length > 1) {
      logger.debug(`Adding polyline [${i}]`, { coordsCount: line.coords.length, color: line.color, width: line.weight });
      const polyline = new Polyline({
        coords: line.coords,
        color: line.color,
        width: line.weight,
      });
      map.addLine(polyline);
    } else {
      logger.debug(`Skipping polyline [${i}] due to insufficient coordinates`, { coords: line.coords });
    }
  });

  // POLYGONS
  toArray(options.polygon).forEach((poly: any, i: number) => {
    if (poly.coords?.length > 1) {
      logger.debug(`Adding polygon [${i}]`, { coordsCount: poly.coords.length, color: poly.color, width: poly.weight, fill: poly.fill });
      const polygon = new Polyline({
        coords: poly.coords,
        color: poly.color,
        width: poly.weight,
        fill: poly.fill,
      });
      map.addPolygon(polygon);
    } else {
      logger.debug(`Skipping polygon [${i}] due to insufficient coordinates`, { coords: poly.coords });
    }
  });

  // CIRCLES
  toArray(options.circle).forEach((circ: any, i: number) => {
    if (circ.coords?.length) {
      logger.debug(`Adding circle [${i}]`, { coord: circ.coords[0], radius: circ.radius, color: circ.color });
      const circle = new Circle({
        coord: circ.coords[0],
        radius: circ.radius,
        color: circ.color,
        width: circ.width,
        fill: circ.fill,
      });
      map.addCircle(circle);
    } else {
      logger.debug(`Skipping circle [${i}] due to missing coordinates`);
    }
  });

  // TEXTS
  toArray(options.text).forEach((txt: any, i: number) => {
    if (txt.coords?.length) {
      logger.debug(`Adding text [${i}]`, { coord: txt.coords[0], text: txt.text, font: txt.font, size: txt.size });
      const text = new Text({
        coord: txt.coords[0],
        text: txt.text,
        color: txt.color,
        width: txt.width,
        fill: txt.fill,
        size: txt.size,
        font: txt.font,
        anchor: txt.anchor,
        offsetX: parseInt(txt.offsetX, 10) || 0,
        offsetY: parseInt(txt.offsetY, 10) || 0,
      });
      map.addText(text);
    } else {
      logger.debug(`Skipping text [${i}] due to missing coordinates`);
    }
  });

  logger.debug("Rendering map with center and zoom", { center: options.center, zoom: options.zoom });
  await map.render(options.center, options.zoom);

  if (!map.image) {
    const errMsg = "Map image is undefined after rendering";
    logger.error(errMsg);
    throw new Error(errMsg);
  }

  const imageBuffer = await map.image.buffer(`image/${options.format}`, { quality: 100 });
  logger.debug("Map image generated successfully", { size: imageBuffer.length, format: options.format });

  return imageBuffer;
}

/**
 * Generates a tile URL based on the provided custom URL and basemap.
 *
 * @param {string|null} [customUrl] - A custom URL template for the tiles.
 * @param {string|null} [basemap] - The desired base map type (e.g., "osm", "topo").
 * @returns {string} The tile URL string.
 */
export function getTileUrl(customUrl: string | null, basemap: string | null) {
  if (customUrl) return customUrl
  if (basemap) {
    const tile = basemaps.find(({ basemap: b }) => b === basemap)
    if (!tile) {
      logger.error(
        `Unsupported basemap: "${basemap}"! Use "osm", "topo" or remove the "basemap" parameter.`
      )
      return ""
    }
    return tile.url
  }
  return "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
}
