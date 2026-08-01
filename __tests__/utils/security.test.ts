import {
  isPrivateUrl,
  isSafeOutboundUrl,
  isPrivateIp,
  allowsPrivateAddress,
  escapeXml,
  redactUrl,
  replacePlaceholders,
  sanitizeTileHeaders,
} from "../../src/utils/security"

afterEach(() => {
  delete process.env.ALLOW_PRIVATE_TILE_HOSTS
})

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

  test.each([
    ["https://ffmpeg.org/logo.png", "ff- prefix is not multicast"],
    ["https://fcbarcelona.com/tile.png", "fc- prefix is not ULA"],
    ["https://fdroid.link/tile.png", "fd- prefix is not ULA"],
    ["https://fe80.example.com/tile.png", "fe80- prefix is not link-local"],
  ])("allows real domain %s (%s)", (url) => {
    // IPv6 range checks must only apply to IPv6 literals, otherwise these
    // perfectly ordinary domains get rejected.
    expect(isPrivateUrl(url)).toBe(false)
  })

  test.each([
    ["http://[fd00::1]/tiles", "ULA literal"],
    ["http://[fe80::1]/tiles", "link-local literal"],
    ["http://[ff02::1]/tiles", "multicast literal"],
    ["http://[::1]/tiles", "loopback literal"],
    ["http://[0::1]/tiles", "non-canonical loopback"],
    ["http://[::ffff:127.0.0.1]/tiles", "IPv4-mapped loopback"],
  ])("still blocks IPv6 literal %s (%s)", (url) => {
    expect(isPrivateUrl(url)).toBe(true)
  })

  test("allows a public IPv6 literal", () => {
    expect(isPrivateUrl("http://[2606:4700:4700::1111]/tiles")).toBe(false)
  })

  test("blocks CGNAT range 100.64/10", () => {
    // Looks routable but is internal, same exposure as RFC1918.
    expect(isPrivateUrl("http://100.64.0.1/tiles")).toBe(true)
    expect(isPrivateUrl("http://100.127.255.255/tiles")).toBe(true)
    expect(isPrivateUrl("http://100.63.0.1/tiles")).toBe(false)
    expect(isPrivateUrl("http://100.128.0.1/tiles")).toBe(false)
  })

  test("allows literal private IPs only when explicitly allowlisted", () => {
    // Running your own tile server on the LAN is a normal setup, so there
    // has to be a way to opt back in.
    expect(isPrivateUrl("http://192.168.1.50:8080/tiles")).toBe(true)
    process.env.ALLOW_PRIVATE_TILE_HOSTS = "192.168.1.50"
    expect(isPrivateUrl("http://192.168.1.50:8080/tiles")).toBe(false)
  })

  test("allowlist never permits non-HTTP(S) schemes", () => {
    // The exemption covers addresses, not protocols - otherwise it would
    // reopen file:// and gopher://.
    process.env.ALLOW_PRIVATE_TILE_HOSTS = "evil.test"
    expect(isPrivateUrl("gopher://evil.test/x")).toBe(true)
    expect(isPrivateUrl("file://evil.test/x")).toBe(true)
  })
})

describe("allowsPrivateAddress", () => {
  test("is case-insensitive and ignores surrounding whitespace", () => {
    process.env.ALLOW_PRIVATE_TILE_HOSTS = " TileServer , other.host "
    expect(allowsPrivateAddress("tileserver")).toBe(true)
    expect(allowsPrivateAddress("other.host")).toBe(true)
    expect(allowsPrivateAddress("unlisted.host")).toBe(false)
  })

  test("denies everything when unset", () => {
    expect(allowsPrivateAddress("tileserver")).toBe(false)
  })

  test("picks up env changes without a restart", () => {
    // The parsed set is cached, so make sure the cache actually invalidates.
    expect(allowsPrivateAddress("tileserver")).toBe(false)
    process.env.ALLOW_PRIVATE_TILE_HOSTS = "tileserver"
    expect(allowsPrivateAddress("tileserver")).toBe(true)
  })
})

describe("isPrivateIp", () => {
  // Runs on addresses coming back from DNS, so the input is always a
  // canonical literal rather than something a caller typed.
  test.each([
    ["127.0.0.1", "IPv4 loopback"],
    ["10.1.2.3", "RFC1918 10/8"],
    ["172.20.0.5", "Docker default bridge range"],
    ["192.168.0.1", "RFC1918 192.168/16"],
    ["169.254.169.254", "cloud metadata endpoint"],
    ["100.64.0.1", "CGNAT"],
    ["::1", "IPv6 loopback"],
    ["fd00::1", "IPv6 ULA"],
    ["fe80::1", "IPv6 link-local"],
    ["ff02::1", "IPv6 multicast"],
    ["::ffff:127.0.0.1", "IPv4-mapped loopback"],
    ["fe80::1%eth0", "zone-indexed link-local"],
    // Not routable on the public internet, so a host resolving here is
    // either misconfigured or pointing at something local.
    ["192.0.0.1", "IETF protocol assignments 192.0.0.0/24"],
    ["198.18.0.1", "benchmarking 198.18/15"],
    ["198.19.255.255", "benchmarking 198.18/15 upper"],
    ["224.0.0.1", "IPv4 multicast"],
    ["239.255.255.250", "SSDP multicast"],
    ["240.0.0.1", "reserved 240.0.0.0/4"],
    ["255.255.255.255", "broadcast"],
  ])("blocks %s (%s)", (ip) => {
    expect(isPrivateIp(ip)).toBe(true)
  })

  test.each([
    ["8.8.8.8", "public IPv4"],
    ["151.101.1.140", "public IPv4"],
    ["2606:4700:4700::1111", "public IPv6"],
    ["::ffff:8.8.8.8", "IPv4-mapped public"],
    // Boundaries of the reserved ranges above - these are ordinary routable
    // addresses and must keep working, or public tile servers break.
    ["192.0.1.1", "just past 192.0.0.0/24"],
    ["198.17.255.255", "just below 198.18/15"],
    ["198.20.0.1", "just past 198.18/15"],
    ["223.255.255.255", "just below multicast"],
  ])("allows %s (%s)", (ip) => {
    expect(isPrivateIp(ip)).toBe(false)
  })

  test("fails closed on an unparseable IPv6 address", () => {
    expect(isPrivateIp("::zzzz")).toBe(true)
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
      "accept": "image/png",
    })
    expect(result).toEqual({
      "user-agent": "MyApp/1.0",
      "accept": "image/png",
    })
  })

  test("strips non-whitelisted headers", () => {
    const result = sanitizeTileHeaders({
      "user-agent": "MyApp/1.0",
      "authorization": "Bearer token",
      "cookie": "session=abc",
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
