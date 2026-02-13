import {
  truncate,
  normalizeIp,
  measureTextWidth,
  formatBytes,
} from "../../src/utils/helpers"

describe("truncate", () => {
  it("returns the original string if under max length", () => {
    const str = "Short string"
    expect(truncate(str)).toBe(str)
  })

  it("truncates and adds ellipsis if string is too long", () => {
    const str = "a".repeat(600)
    expect(truncate(str).endsWith("...")).toBe(true)
    expect(truncate(str).length).toBe(503)
  })

  it("truncates with custom max length", () => {
    const str = "a".repeat(100)
    expect(truncate(str, 50)).toBe(`${"a".repeat(50)}...`)
  })
})

describe("normalizeIp", () => {
  it("removes ::ffff: prefix from IPv4-mapped IPv6 address", () => {
    expect(normalizeIp("::ffff:192.168.1.1")).toBe("192.168.1.1")
  })

  it("returns normal IP unchanged", () => {
    expect(normalizeIp("127.0.0.1")).toBe("127.0.0.1")
  })
})

describe("measureTextWidth", () => {
  it("returns a positive number for non-empty string", () => {
    const width = measureTextWidth("Hello world", 12)
    expect(typeof width).toBe("number")
    expect(width).toBeGreaterThan(0)
  })

  it("returns 0 for empty string", () => {
    const width = measureTextWidth("", 12)
    expect(width).toBe(0)
  })

  it("returns wider value for larger font size", () => {
    const small = measureTextWidth("Test", 10)
    const large = measureTextWidth("Test", 30)
    expect(large).toBeGreaterThan(small)
  })
})

describe("formatBytes", () => {
  it("returns '0 Bytes' for 0", () => {
    expect(formatBytes(0)).toBe("0 Bytes")
  })

  it("formats bytes less than 1 KB correctly", () => {
    expect(formatBytes(512)).toBe("512 Bytes")
  })

  it("formats values in KB correctly", () => {
    expect(formatBytes(1024)).toBe("1 KB")
    expect(formatBytes(1234)).toBe("1.21 KB")
  })

  it("formats values in MB correctly", () => {
    expect(formatBytes(1048576)).toBe("1 MB")
    expect(formatBytes(1572864)).toBe("1.5 MB")
  })

  it("formats values in GB correctly", () => {
    expect(formatBytes(1073741824)).toBe("1 GB")
    expect(formatBytes(1610612736)).toBe("1.5 GB")
  })

  it("formats values in TB correctly", () => {
    expect(formatBytes(1099511627776)).toBe("1 TB")
    expect(formatBytes(1649267441664)).toBe("1.5 TB")
  })

  it("rounds values to 2 decimal places", () => {
    expect(formatBytes(123456789)).toBe("117.74 MB")
  })
})
