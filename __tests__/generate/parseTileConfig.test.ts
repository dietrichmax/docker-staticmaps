import { getTileUrl } from "../../src/generate/generateParams"
import logger from "../../src/utils/logger"

jest.mock("../../src/utils/logger")

describe("getTileUrl SSRF protection", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("blocks localhost tile URLs", () => {
    const result = getTileUrl("http://localhost:8080/{z}/{x}/{y}.png", null)
    expect(result.url).toBe("")
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining("Blocked private/internal tile URL")
    )
  })

  it("blocks 127.0.0.1 tile URLs", () => {
    const result = getTileUrl("http://127.0.0.1/{z}/{x}/{y}.png", null)
    expect(result.url).toBe("")
  })

  it("blocks ::1 tile URLs", () => {
    const result = getTileUrl("http://[::1]/{z}/{x}/{y}.png", null)
    expect(result.url).toBe("")
  })

  it("blocks 10.x.x.x private IPs", () => {
    const result = getTileUrl("http://10.0.0.1/{z}/{x}/{y}.png", null)
    expect(result.url).toBe("")
  })

  it("blocks 172.16-31.x.x private IPs", () => {
    expect(getTileUrl("http://172.16.0.1/{z}/{x}/{y}.png", null).url).toBe("")
    expect(getTileUrl("http://172.31.255.255/{z}/{x}/{y}.png", null).url).toBe("")
  })

  it("allows 172.15.x.x (not private)", () => {
    const result = getTileUrl("http://172.15.0.1/{z}/{x}/{y}.png", null)
    expect(result.url).toBe("http://172.15.0.1/{z}/{x}/{y}.png")
  })

  it("blocks 192.168.x.x private IPs", () => {
    const result = getTileUrl("http://192.168.1.1/{z}/{x}/{y}.png", null)
    expect(result.url).toBe("")
  })

  it("blocks 169.254.x.x link-local IPs", () => {
    const result = getTileUrl("http://169.254.1.1/{z}/{x}/{y}.png", null)
    expect(result.url).toBe("")
  })

  it("blocks .local domains", () => {
    const result = getTileUrl("http://tiles.local/{z}/{x}/{y}.png", null)
    expect(result.url).toBe("")
  })

  it("blocks .internal domains", () => {
    const result = getTileUrl("http://tiles.internal/{z}/{x}/{y}.png", null)
    expect(result.url).toBe("")
  })

  it("allows legitimate public tile URLs", () => {
    const result = getTileUrl("https://tile.openstreetmap.org/{z}/{x}/{y}.png", null)
    expect(result.url).toBe("https://tile.openstreetmap.org/{z}/{x}/{y}.png")
  })

  it("blocks malformed URLs", () => {
    const result = getTileUrl("not-a-url", null)
    expect(result.url).toBe("")
  })
})
