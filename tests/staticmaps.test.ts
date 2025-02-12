import request from 'supertest'
import { handleMapRequest } from '../src/controllers/staticmaps.controller'
import express from 'express'

const staticmapsEndoint = "/api/staticmaps"

jest.mock('../src/staticmaps/staticmaps', () => {
  return jest.fn().mockImplementation(() => {
    return {
      addMarker: jest.fn(),
      addLine: jest.fn(),
      addPolygon: jest.fn(),
      addCircle: jest.fn(),
      render: jest.fn().mockResolvedValue(),
      image: {
        buffer: jest.fn().mockResolvedValue(Buffer.from('fake image data'))
      }
    }
  })
})

jest.mock('../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}))

// Initialize the express app for testing
const app = express()
app.use(express.json())
app.use(staticmapsEndoint, handleMapRequest)

describe('handleMapRequest', () => {
  it('should return 422 if parameters are missing', async () => {
    const response = await request(app).get(staticmapsEndoint)
    expect(response.status).toBe(422)
    expect(response.body.error).toBe('Missing parameters')
    expect(response.body.missingParams).toContain('{center} or {coordinates}')
  })

  it('should return a map image when parameters are correct', async () => {
    const response = await request(app)
      .get(staticmapsEndoint)
      .query({
        center: '50,30',
        width: '800',
        height: '600',
        format: 'png',
        zoom: '10',
      })

    expect(response.status).toBe(200)
    expect(response.header['content-type']).toBe('image/png')
    expect(response.body.length).toBeGreaterThan(0)
  })

  it('should log missing parameters', async () => {
    await request(app).get(staticmapsEndoint)
    expect(require('../src/utils/logger').warn).toHaveBeenCalledWith('Missing parameters', expect.any(Object))
  })

  it('should log the successful image render', async () => {
    const response = await request(app)
      .get(staticmapsEndoint)
      .query({
        center: '50,30',
        width: '800',
        height: '600',
        format: 'png',
        zoom: '10',
      })
    expect(require('../src/utils/logger').info).toHaveBeenCalledWith('Image successfully rendered', expect.objectContaining({ size: expect.any(Number) }))
  })

  it('should handle GET requests with valid parameters', async () => {
    const response = await request(app)
      .get(staticmapsEndoint)
      .query({
        center: '50,30',
        width: '800',
        height: '600',
        format: 'png',
        zoom: '10',
      })
    expect(response.status).toBe(200)
    expect(response.header['content-type']).toBe('image/png')
  })

  it('should handle POST requests with valid parameters', async () => {
    const response = await request(app)
      .post(staticmapsEndoint)
      .send({
        center: '50,30',
        width: '800',
        height: '600',
        format: 'png',
        zoom: '10',
      })

    expect(response.status).toBe(200)
    expect(response.header['content-type']).toBe('image/png')
  })
})
