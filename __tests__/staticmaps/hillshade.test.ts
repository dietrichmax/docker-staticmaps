import sharp from "sharp"
import { terrariumToHillshade } from "../../src/staticmaps/hillshade"

// Synthesize a Terrarium-encoded PNG tile from a flat elevation array.
// elev = (R*256 + G + B/256) - 32768
async function makeTerrariumTile(
  width: number,
  height: number,
  elevations: Float32Array
): Promise<Buffer> {
  const raw = Buffer.alloc(width * height * 3)
  for (let i = 0; i < width * height; i++) {
    const v = elevations[i] + 32768 // shift into encodable range
    const total = Math.round(v * 256)
    const r = (total >> 16) & 0xff
    const g = (total >> 8) & 0xff
    const b = total & 0xff
    raw[i * 3] = r
    raw[i * 3 + 1] = g
    raw[i * 3 + 2] = b
  }
  return sharp(raw, { raw: { width, height, channels: 3 } })
    .png()
    .toBuffer()
}

describe("terrariumToHillshade", () => {
  it("returns a PNG buffer of the same dimensions", async () => {
    const w = 16
    const h = 16
    const elev = new Float32Array(w * h).fill(1000)
    const input = await makeTerrariumTile(w, h, elev)

    const out = await terrariumToHillshade(input, 10)

    const meta = await sharp(out).metadata()
    expect(meta.width).toBe(w)
    expect(meta.height).toBe(h)
    expect(meta.format).toBe("png")
  })

  it("produces a flat illumination on flat terrain", async () => {
    const w = 8
    const h = 8
    const elev = new Float32Array(w * h).fill(1000)
    const input = await makeTerrariumTile(w, h, elev)

    const out = await terrariumToHillshade(input, 10)
    const { data } = await sharp(out)
      .raw()
      .toBuffer({ resolveWithObject: true })

    // Center pixel R-channel — flat ground, slope=0, illum=cos(zenith)
    const cx = Math.floor(w / 2)
    const cy = Math.floor(h / 2)
    const idx = (cy * w + cx) * 4
    const center = data[idx]

    // Every interior pixel on flat terrain should have the same gray value.
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const j = (y * w + x) * 4
        expect(data[j]).toBe(center)
        expect(data[j + 1]).toBe(center)
        expect(data[j + 2]).toBe(center)
      }
    }
  })

  it("respects intensity (lower intensity = brighter shadows)", async () => {
    const w = 8
    const h = 8
    // Half flat + half steeply sloped to ensure some shadowed pixels.
    const elev = new Float32Array(w * h)
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        elev[y * w + x] = x * 200
      }
    }
    const input = await makeTerrariumTile(w, h, elev)

    const dim = await terrariumToHillshade(input, 10, { intensity: 0.9 })
    const subtle = await terrariumToHillshade(input, 10, { intensity: 0.2 })

    const sum = async (buf: Buffer) => {
      const { data } = await sharp(buf)
        .raw()
        .toBuffer({ resolveWithObject: true })
      let s = 0
      for (let i = 0; i < data.length; i += 4) s += data[i]
      return s
    }

    // Lower intensity preserves more brightness overall.
    expect(await sum(subtle)).toBeGreaterThan(await sum(dim))
  })

  it("rejects oversize tiles", async () => {
    const w = 1100
    const h = 1100
    const elev = new Float32Array(w * h).fill(0)
    const input = await makeTerrariumTile(w, h, elev)

    await expect(terrariumToHillshade(input, 10)).rejects.toThrow(
      /Hillshade input tile too large/
    )
  })
})

describe("HILLSHADE_TILE_URL", () => {
  const ORIGINAL_ENV = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...ORIGINAL_ENV }
  })

  afterAll(() => {
    process.env = ORIGINAL_ENV
  })

  it("defaults to AWS Open Data Terrarium endpoint when env var is unset", async () => {
    delete process.env.HILLSHADE_TILE_URL
    const mod = await import("../../src/staticmaps/hillshade")
    expect(mod.HILLSHADE_TILE_URL).toBe(
      "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"
    )
  })

  it("uses the env var when set to a public URL", async () => {
    process.env.HILLSHADE_TILE_URL = "https://example.com/dem/{z}/{x}/{y}.png"
    const mod = await import("../../src/staticmaps/hillshade")
    expect(mod.HILLSHADE_TILE_URL).toBe(
      "https://example.com/dem/{z}/{x}/{y}.png"
    )
  })

  it("falls back to the default when env var is a private URL", async () => {
    process.env.HILLSHADE_TILE_URL = "http://127.0.0.1/dem/{z}/{x}/{y}.png"
    const mod = await import("../../src/staticmaps/hillshade")
    expect(mod.HILLSHADE_TILE_URL).toBe(
      "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"
    )
  })
})
