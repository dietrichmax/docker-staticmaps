import TileServerConfig from "../../src/staticmaps/tileserverconfig"

describe("TileServerConfig", () => {
  it("should instantiate with default tile URL and empty subdomains", () => {
    const config = new TileServerConfig({})
    expect(config.tileUrl).toBe(
      "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
    )
    expect(config.tileSubdomains).toEqual([])
  })

  it("should instantiate with custom tile URL and subdomains", () => {
    const customUrl = "https://custom.tileserver.org/{z}/{x}/{y}.png"
    const subdomains = ["a", "b", "c"]
    const config = new TileServerConfig({
      tileUrl: customUrl,
      tileSubdomains: subdomains,
    })
    expect(config.tileUrl).toBe(customUrl)
    expect(config.tileSubdomains).toEqual(subdomains)
  })

  it("should fallback to default tile URL when no tile URL is provided", () => {
    const config = new TileServerConfig({ tileSubdomains: ["a", "b"] })
    expect(config.tileUrl).toBe(
      "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
    )
  })

  it("should fallback to empty subdomains when no subdomains are provided", () => {
    const config = new TileServerConfig({
      tileUrl: "https://example.com/{z}/{x}/{y}.png",
    })
    expect(config.tileSubdomains).toEqual([])
  })

  it("should prioritize tileSubdomains over subdomains for backward compatibility", () => {
    const config = new TileServerConfig({
      tileUrl: "https://example.com/{z}/{x}/{y}.png",
      tileSubdomains: ["a", "b"],
      subdomains: ["x", "y"],
    })
    expect(config.tileSubdomains).toEqual(["a", "b"])
  })

  it("should use subdomains if tileSubdomains is not provided", () => {
    const config = new TileServerConfig({
      tileUrl: "https://example.com/{z}/{x}/{y}.png",
      subdomains: ["x", "y"],
    })
    expect(config.tileSubdomains).toEqual(["x", "y"])
  })

  it("should handle an empty object for options and still provide default values", () => {
    const config = new TileServerConfig({})
    expect(config.tileUrl).toBe(
      "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
    )
    expect(config.tileSubdomains).toEqual([])
  })
})
