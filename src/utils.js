import StaticMaps from "./staticmaps/staticmaps.js"
import basemaps from "./basemaps.js"

// Helper function to extract specific parameters (color, weight, fill, etc.)
function extractParams(array, paramsList) {
  const extracted = {};
  const coordinates = [];

  array.forEach((item) => {
    const param = paramsList.find((p) => item.startsWith(`${p}:`));
    if (param) {
      extracted[param] = param === "weight" || param === "radius" || param === "width"
        ? parseInt(item.replace(`${param}:`, ""))
        : item.replace(`${param}:`, param === "color" || param === "fill" ? "#" : "");
    } else {
      coordinates.push(item);
    }
  });

  return { extracted, coordinates };
}

export function validateParams(query) {
  const missingParams = [];
  let center = query.center ? query.center.split(",").map(Number) : null;

  const parseShape = (key, defaultValues) => {
    if (!query[key]) return false;
    const { extracted, coordinates } = extractParams(query[key].split("|"), ["color", "weight", "fill", "radius", "width"]);
    const coords = parseCoordinates(coordinates);
    return { ...defaultValues, ...extracted, coords };
  };

  const polyline = parseShape("polyline", { weight: 5, color: "blue" });
  const polygon = parseShape("polygon", { color: "blue", weight: 3, fill: "green" });
  const markers = query.markers ? { coords: parseCoordinates(query.markers.split("|")) } : false;
  const circle = parseShape("circle", { color: "#0000bb", width: 3, fill: "#AA0000" });

  if (!query.center && !polyline.coords && !markers.coords && !circle.coords && !polygon.coords) {
    missingParams.push("{center or coordinates}");
  }

  return {
    missingParams,
    options: {
      width: parseInt(query.width) || 300,
      height: parseInt(query.height) || 300,
      zoom: parseInt(query.zoom),
      center,
      markers,
      polyline,
      circle,
      polygon,
      tileUrl: getTileUrl(query.tileUrl, query.basemap),
      format: query.format || "png",
    },
  };
}

export async function render(options) {
  const map = new StaticMaps({
    width: options.width,
    height: options.height,
    tileLayers: [{ tileUrl: options.tileUrl }],
    tileSize: 256,
  });

  if (options.markers?.coords?.length) {
    options.markers.coords.forEach((coord) =>
      map.addMarker({
        coord,
        img: "./public/images/marker-28.png",
        width: 42,
        height: 42,
        offsetX: 13.6,
        offsetY: 27.6,
      })
    );
  }

  if (options.polyline?.coords?.length > 1) {
    map.addLine({
      coords: options.polyline.coords,
      color: options.polyline.color,
      width: options.polyline.weight,
    });
  }

  if (options.polygon?.coords?.length > 1) {
    map.addPolygon({
      coords: options.polygon.coords,
      color: options.polygon.color,
      width: options.polygon.weight,
      fill: options.polygon.fill,
    });
  }

  if (options.circle?.coords?.length) {
    map.addCircle({
      coord: options.circle.coords[0],
      radius: options.circle.radius,
      color: options.circle.color,
      fill: options.circle.fill,
      width: options.circle.width,
    });
  }

  await map.render(options.center, options.zoom);
  return map.image.buffer(`image/${options.format}`, { quality: 80 });
}

export function getTileUrl(reqTileUrl, reqBasemap) {
  if (reqTileUrl) return reqTileUrl;
  
  if (reqBasemap) {
    const tile = basemaps.find(({ basemap }) => basemap === reqBasemap);
    if (!tile) {
      throw new Error(`Unsupported basemap: ${reqBasemap}`);
    }
    return tile.url;
  }

  return "https://tile.openstreetmap.org/{z}/{x}/{y}.png"; // Default URL
}


export function parseCoordinates(coordString) {
  if (!coordString) return []

  return Object.keys(coordString).map((key) => {
    const [lat, lon] = coordString[key].split(",").map(Number)
    return [lon, lat] // Convert to [longitude, latitude] format
  })
}
