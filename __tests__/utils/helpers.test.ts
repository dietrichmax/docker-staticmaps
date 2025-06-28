import { truncate, normalizeIp, isDev, measureTextWidth } from "../../src/utils/helpers"

describe('truncate', () => {
  it('returns the original string if under max length', () => {
    const str = 'Short string'
    expect(truncate(str)).toBe(str)
  })

  it('truncates and adds ellipsis if string is too long', () => {
    const str = 'a'.repeat(600)
    expect(truncate(str).endsWith('...')).toBe(true)
    expect(truncate(str).length).toBe(503)
  })

  it('truncates with custom max length', () => {
    const str = 'a'.repeat(100)
    expect(truncate(str, 50)).toBe(`${'a'.repeat(50)}...`)
  })
})

describe('normalizeIp', () => {
  it('removes ::ffff: prefix from IPv4-mapped IPv6 address', () => {
    expect(normalizeIp('::ffff:192.168.1.1')).toBe('192.168.1.1')
  })

  it('returns normal IP unchanged', () => {
    expect(normalizeIp('127.0.0.1')).toBe('127.0.0.1')
  })
})

describe('isDev', () => {
  const OLD_ENV = process.env

  beforeEach(() => {
    process.env = { ...OLD_ENV }
  })

  afterEach(() => {
    process.env = OLD_ENV
  })

  it('returns true if NODE_ENV is development', () => {
    process.env.NODE_ENV = 'development'
    expect(isDev()).toBe(true)
  })

  it('returns false if NODE_ENV is not development', () => {
    process.env.NODE_ENV = 'production'
    expect(isDev()).toBe(false)
  })
})

describe('measureTextWidth', () => {
  it('returns a positive number for non-empty string', () => {
    const width = measureTextWidth('Hello world', 12)
    expect(typeof width).toBe('number')
    expect(width).toBeGreaterThan(0)
  })

  it('returns 0 for empty string', () => {
    const width = measureTextWidth('', 12)
    expect(width).toBe(0)
  })

  it('returns wider value for larger font size', () => {
    const small = measureTextWidth('Test', 10)
    const large = measureTextWidth('Test', 30)
    expect(large).toBeGreaterThan(small)
  })
})
