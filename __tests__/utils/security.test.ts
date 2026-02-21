import {
  isPrivateUrl,
  isSafeOutboundUrl,
  escapeXml,
  redactUrl,
  replacePlaceholders,
  sanitizeTileHeaders,
} from "../../src/utils/security"

describe("isPrivateUrl", () => {
  test.each([
    ["http://localhost/tiles", "localhost"],
    ["http://127.0.0.1/tiles", "127.0.0.1"],
    ["http://0.0.0.0/tiles", "0.0.0.0"],
    ["http://10.0.0.1/tiles", "10.x.x.x"],
    ["http://10.255.255.255/tiles", "10.x.x.x upper"],
    ["http://172.16.0.1/tiles", "172.16.x.x"],
    ["http://172.31.255.255/tiles", "172.31.x.x upper"],
    ["http://192.168.1.1/tiles", "192.168.x.x"],
    ["http://169.254.1.1/tiles", "169.254.x.x link-local"],
    ["http://0.0.0.1/tiles", "0.x.x.x"],
    ["http://myhost.local/tiles", ".local domain"],
    ["http://myhost.internal/tiles", ".internal domain"],
    ["ftp://example.com/tiles", "non-http scheme"],
    ["gopher://example.com/tiles", "non-http scheme"],
    ["not-a-url", "invalid URL"],
  ])("blocks %s (%s)", (url) => {
    expect(isPrivateUrl(url)).toBe(true)
  })

  test.each([
    ["https://tile.openstreetmap.org/0/0/0.png", "public tile server"],
    ["https://example.com/tiles", "public domain"],
    ["http://8.8.8.8/tiles", "public IP"],
    ["https://172.15.0.1/tiles", "172.15 is not private"],
    ["https://172.32.0.1/tiles", "172.32 is not private"],
  ])("allows %s (%s)", (url) => {
    expect(isPrivateUrl(url)).toBe(false)
  })

  test("blocks decimal IP encoding", () => {
    expect(isPrivateUrl("http://2130706433/tiles")).toBe(true)
  })

  test("blocks hex IP encoding", () => {
    expect(isPrivateUrl("http://0x7f000001/tiles")).toBe(true)
  })
})

describe("isSafeOutboundUrl", () => {
  test("returns true for public URLs", () => {
    expect(isSafeOutboundUrl("https://example.com/img.png")).toBe(true)
  })

  test("returns false for private URLs", () => {
    expect(isSafeOutboundUrl("http://127.0.0.1/img.png")).toBe(false)
  })
})

describe("escapeXml", () => {
  test("escapes XML special characters", () => {
    expect(escapeXml('<script>alert("xss")</script>')).toBe(
      "&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;"
    )
  })

  test("escapes ampersand and apostrophe", () => {
    expect(escapeXml("A & B's")).toBe("A &amp; B&apos;s")
  })

  test("strips control characters", () => {
    expect(escapeXml("hello\x00\x07world")).toBe("helloworld")
  })

  test("preserves normal text", () => {
    expect(escapeXml("normal text 123")).toBe("normal text 123")
  })
})

describe("redactUrl", () => {
  test("redacts api_key query parameter", () => {
    expect(redactUrl("/api?api_key=secret123&width=800")).toBe(
      "/api?api_key=[REDACTED]&width=800"
    )
  })

  test("redacts API_KEY query parameter", () => {
    expect(redactUrl("/api?API_KEY=secret123")).toBe("/api?API_KEY=[REDACTED]")
  })

  test("redacts case-insensitively", () => {
    expect(redactUrl("/api?Api_Key=secret")).toBe("/api?Api_Key=[REDACTED]")
  })

  test("preserves URL without api_key", () => {
    expect(redactUrl("/api?width=800")).toBe("/api?width=800")
  })
})

describe("replacePlaceholders", () => {
  test("replaces all known tile placeholders", () => {
    const url = "https://tile.example.com/{z}/{x}/{y}.png?s={s}&r={r}"
    expect(replacePlaceholders(url)).toBe(
      "https://tile.example.com/0/0/0.png?s=a&r="
    )
  })

  test("replaces quadkey placeholder", () => {
    expect(replacePlaceholders("https://tile.example.com/{quadkey}")).toBe(
      "https://tile.example.com/0"
    )
  })

  test("returns unchanged URL if no placeholders", () => {
    const url = "https://tile.example.com/0/0/0.png"
    expect(replacePlaceholders(url)).toBe(url)
  })
})

describe("sanitizeTileHeaders", () => {
  test("allows whitelisted headers", () => {
    const result = sanitizeTileHeaders({
      "user-agent": "MyApp/1.0",
      accept: "image/png",
    })
    expect(result).toEqual({
      "user-agent": "MyApp/1.0",
      accept: "image/png",
    })
  })

  test("strips non-whitelisted headers", () => {
    const result = sanitizeTileHeaders({
      "user-agent": "MyApp/1.0",
      authorization: "Bearer token",
      cookie: "session=abc",
    })
    expect(result).toEqual({ "user-agent": "MyApp/1.0" })
  })

  test("rejects header values with CRLF", () => {
    const result = sanitizeTileHeaders({
      "user-agent": "MyApp\r\nX-Injected: true",
    })
    expect(result).toEqual({})
  })

  test("returns empty object for undefined/null input", () => {
    expect(sanitizeTileHeaders(undefined)).toEqual({})
    expect(sanitizeTileHeaders(null as any)).toEqual({})
  })
})
