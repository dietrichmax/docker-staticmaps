import { truncate, normalizeIp, isDev } from "../../src/utils/helpers"

describe("truncate", () => {
  test("returns original string if shorter than maxLength", () => {
    const input = "short string"
    expect(truncate(input, 600)).toBe(input) // test with explicit > 500
  })

  test("truncates and appends ellipsis if longer than maxLength", () => {
    const input = "a".repeat(600)
    const truncated = truncate(input, 500)
    expect(truncated).toHaveLength(503) // 500 chars + "..."
    expect(truncated.endsWith("...")).toBe(true)
  })

  test("uses default maxLength of 500", () => {
    const input = "a".repeat(600)
    const truncated = truncate(input)
    expect(truncated).toHaveLength(503)
  })
})

describe("normalizeIp", () => {
  test("removes IPv4-mapped IPv6 prefix", () => {
    expect(normalizeIp("::ffff:192.168.0.1")).toBe("192.168.0.1")
  })

  test("returns IP unchanged if no prefix", () => {
    expect(normalizeIp("192.168.0.1")).toBe("192.168.0.1")
    expect(normalizeIp("::1")).toBe("::1")
  })
})

describe("isDev", () => {
  const OLD_ENV = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...OLD_ENV }
  })

  afterAll(() => {
    process.env = OLD_ENV
  })

  test("returns true if NODE_ENV is 'development'", () => {
    process.env.NODE_ENV = "development"
    expect(isDev()).toBe(true)
  })

  test("returns false if NODE_ENV is not 'development'", () => {
    process.env.NODE_ENV = "production"
    expect(isDev()).toBe(false)

    process.env.NODE_ENV = "test"
    expect(isDev()).toBe(false)

    delete process.env.NODE_ENV
    expect(isDev()).toBe(false)
  })
})
