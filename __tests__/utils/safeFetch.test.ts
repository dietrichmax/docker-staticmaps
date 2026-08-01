import dns from "node:dns"
import { pinnedLookup, safeFetch } from "../../src/utils/safeFetch"

jest.mock("node:dns", () => ({
  __esModule: true,
  default: { lookup: jest.fn() },
}))

jest.mock("../../src/utils/logger", () => ({
  __esModule: true,
  default: {
    warn: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}))

const lookupMock = dns.lookup as unknown as jest.Mock

/** Makes dns.lookup resolve `hostname` to the given addresses. */
function mockResolve(addresses: Array<{ address: string; family: number }>) {
  lookupMock.mockImplementation((_host: string, _opts: any, cb: any) =>
    cb(null, addresses)
  )
}

/** Runs pinnedLookup and captures its callback arguments. */
function runLookup(
  hostname: string
): Promise<{ err: Error | null; address: string }> {
  return new Promise((resolve) => {
    pinnedLookup(hostname, {}, (err: any, address: any) =>
      resolve({ err, address: address as string })
    )
  })
}

afterEach(() => {
  delete process.env.ALLOW_PRIVATE_TILE_HOSTS
  lookupMock.mockReset()
})

describe("pinnedLookup", () => {
  it("blocks a public hostname that resolves to a private address", async () => {
    // The hostname is neither a literal IP nor on any deny-list, so nothing
    // about the string itself reveals where it points. Only resolving does.
    mockResolve([{ address: "127.0.0.1", family: 4 }])

    const { err } = await runLookup("tiles.example.com")

    expect(err).toBeInstanceOf(Error)
    expect(err?.message).toMatch(/Blocked private address/)
  })

  it("blocks when only one of several records is private", async () => {
    // Accepting the host because one record is public would still leave the
    // connection free to use the private one.
    mockResolve([
      { address: "93.184.216.34", family: 4 },
      { address: "169.254.169.254", family: 4 },
    ])

    const { err } = await runLookup("multi.example.com")

    expect(err).toBeInstanceOf(Error)
    expect(err?.message).toMatch(/Blocked private address/)
  })

  it("pins the connection to the address it validated", async () => {
    // Returning a concrete IP rather than the hostname avoids a second
    // resolution, so the connection uses the address that was checked.
    mockResolve([{ address: "93.184.216.34", family: 4 }])

    const { err, address } = await runLookup("example.com")

    expect(err).toBeNull()
    expect(address).toBe("93.184.216.34")
  })

  it("allows private addresses for allowlisted hosts", async () => {
    // Self-hosted tile servers on a Docker network must keep working.
    process.env.ALLOW_PRIVATE_TILE_HOSTS = "tileserver"
    mockResolve([{ address: "172.20.0.5", family: 4 }])

    const { err, address } = await runLookup("tileserver")

    expect(err).toBeNull()
    expect(address).toBe("172.20.0.5")
  })

  it("fails closed when resolution errors", async () => {
    // A resolution failure says nothing about where the host points, so it
    // must not be read as "not private".
    lookupMock.mockImplementation((_host: string, _opts: any, cb: any) =>
      cb(new Error("ENOTFOUND"), [])
    )

    const { err } = await runLookup("broken.example.com")

    expect(err).toBeInstanceOf(Error)
  })

  it("fails closed when resolution returns no records", async () => {
    mockResolve([])

    const { err } = await runLookup("empty.example.com")

    expect(err).toBeInstanceOf(Error)
    expect(err?.message).toMatch(/No addresses resolved/)
  })
})

describe("safeFetch", () => {
  it("rejects non-HTTP(S) schemes before any connection is attempted", async () => {
    await expect(safeFetch("file:///etc/passwd")).rejects.toThrow(
      /Blocked non-HTTP\(S\) scheme/
    )
    expect(lookupMock).not.toHaveBeenCalled()
  })

  it("rejects a malformed URL", async () => {
    await expect(safeFetch("not-a-url")).rejects.toThrow(/Invalid URL/)
  })

  // Node skips DNS when the host is already an IP literal, so pinnedLookup
  // never fires for these. Without an explicit check they connect unguarded.
  it.each([
    ["http://127.0.0.1:8080/x.png", "IPv4 loopback"],
    ["http://[::1]:8080/x.png", "IPv6 loopback"],
    ["http://169.254.169.254/latest/meta-data/", "cloud metadata"],
    ["http://192.168.1.1/x.png", "RFC1918"],
  ])("blocks literal private address %s (%s)", async (url) => {
    await expect(safeFetch(url)).rejects.toThrow(/Blocked private address/)
    expect(lookupMock).not.toHaveBeenCalled()
  })

  it("allows a literal private address when the host is allowlisted", async () => {
    process.env.ALLOW_PRIVATE_TILE_HOSTS = "127.0.0.1"
    // Port 1 refuses the connection, so this still rejects - but with a
    // network error rather than the guard, proving the guard let it through.
    const err = await safeFetch("http://127.0.0.1:1/x.png").catch((e) => e)
    expect(String(err.message)).not.toMatch(/Blocked private address/)
  })
})
