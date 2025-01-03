import server from "../src/server"
import request from "supertest"
import dotenv from 'dotenv'
import { validateParams, getTileUrl, parseCoordinates } from "../src/utils"
dotenv.config()

const endpoint = process.env.PORT ? process.env.ENDPOINT : "/staticmaps?"
const port = process.env.PORT ? parseInt(process.env.PORT) : 3000

describe("validate correct params", () => {
    it("should return a options object and no missingParams", () => {
      const params = { center: '-119.49280,37.81084', zoom: '9' }
      const { missingParams, options } = validateParams(params)
      expect(missingParams.length).toBe(0)
    })
})

describe("validate incorrect params", () => {
    it("should return a options object and no missingParams", () => {
      const params = { basemap: 'osm', zoom: '9' }
      const { missingParams, options } = validateParams(params)
      expect(missingParams.length).toBe(1)
    })
})

describe("get predefined basemap", () => {
    it("should return a basemap url", () => {
      const url = getTileUrl(null, "national-geographic")
      expect(url).toBe("https://server.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/{z}/{y}/{x}")
    })
})

describe("get custom tileurl", () => {
    it("should return a tileurl url", () => {
      const url = getTileUrl("https://localhost/tilepath/tile/{z}/{y}/{x}", null)
      expect(url).toBe("https://localhost/tilepath/tile/{z}/{y}/{x}")
    })
})

describe("parse coordinates array", () => {
    it("should return a array of coordinates", () => {
      const array = parseCoordinates([
        '41.891169,12.491691',
        '41.890633,12.493697',
        '41.889012,12.492989',
        '41.889467,12.490811',
        '41.891169,12.491691'
      ])
      expect(typeof array).toBe(typeof [])
      expect(typeof array[0]).toBe(typeof [])
    })
})

// simple check
describe("get simple image", () => {
    it("should return 200 and a png", async () => {
      const params = "center=-119.49280,37.81084&zoom=9"
      const query = endpoint + params

      const res = await request(server).get(query)
    
      expect(res.status).toBe(200)
      expect(res.headers['content-type']).toBe("image/png")
    })
})


// basemap check
describe("get specific basemap", () => {
    it("should return 200 and a png", async () => {
      const params = "center=-119.49280,37.81084&zoom=9&basemap=topo"
      const query = endpoint + params

      const res = await request(server).get(query)

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe("image/png")
    });
});

// polyline check
describe("get polyline image", () => {
    it("should return 200 and a png", async () => {
      const params = "width=600&height=600&polyline=weight:6|color:0000ff|48.726304979176675,-3.9829935637739382|48.72623035828412,-3.9829726446543385|48.726126671101639,-3.9829546542797467|48.725965124843256,-3.9829070729298808|48.725871429380568,-3.9828726793245273|48.725764250990267,-3.9828064532306628|48.725679557682362,-3.9827385375789146|48.72567025076134,-3.9827310750289113|48.725529844164292,-3.9826617613709225|48.725412537198615,-3.9826296635284164|48.725351694726704,-3.9826201452878531|48.725258599474508,-3.9826063049230411|48.725157520450125,-3.9825900299314232|48.725077863838543,-3.9825779905509102|48.724930435729831,-3.9825514102373938|48.724815578113535,-3.9825237355887291|48.724760905376989,-3.9825013965800564|48.724677938456551,-3.9824534296566916|48.724379435330384,-3.9822469276001118|48.724304509274596,-3.9821850264836076|48.7242453124599,-3.9821320570321772|48.724206187829317,-3.9821063430223207|48.724117073204575,-3.9820862134785551"
      const query = endpoint + params

      const res = await request(server).get(query)

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe("image/png")
    });
});

// polygon check
describe("get polygon image", () => {
    it("should return 200 and a png", async () => {
      const params = "width=600&height=600&polygon=color:4874db|weight:7|fill:eb7a34|41.891169,12.491691|41.890633,12.493697|41.889012,12.492989|41.889467,12.490811|41.891169,12.491691"
      const query = endpoint + params

      const res = await request(server).get(query)

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe("image/png")
    });
});
  
// marker check
describe("get marker image", () => {
    it("should return 200 and a png", async () => {
      const params = "width=600&height=600&markers=48.726304979176675,-3.9829935637739382|48.724117073204575,-3.9820862134785551"
      const query = endpoint + params

      const res = await request(server).get(query)

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe("image/png")
    });
});

// circle check
describe("get circle image", () => {
    it("should return 200 and a png", async () => {
      const params = "width=600&height=600&basemap=osm&circle=radius:100|48.726304979176675,-3.9829935637739382"
      const query = endpoint + params

      const res = await request(server).get(query)

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe("image/png")
    });
});

// marker and polygon check
describe("get marker and polygon image", () => {
    it("should return 200 and a png", async () => {
      const params = "?width=600&height=600&polyline=weight:6|color:0000ff|48.726304979176675,-3.9829935637739382|48.72623035828412,-3.9829726446543385|48.726126671101639,-3.9829546542797467|48.725965124843256,-3.9829070729298808|48.725871429380568,-3.9828726793245273|48.725764250990267,-3.9828064532306628|48.725679557682362,-3.9827385375789146|48.72567025076134,-3.9827310750289113|48.725529844164292,-3.9826617613709225|48.725412537198615,-3.9826296635284164|48.725351694726704,-3.9826201452878531|48.725258599474508,-3.9826063049230411|48.725157520450125,-3.9825900299314232|48.725077863838543,-3.9825779905509102|48.724930435729831,-3.9825514102373938|48.724815578113535,-3.9825237355887291|48.724760905376989,-3.9825013965800564|48.724677938456551,-3.9824534296566916|48.724379435330384,-3.9822469276001118|48.724304509274596,-3.9821850264836076|48.7242453124599,-3.9821320570321772|48.724206187829317,-3.9821063430223207|48.724117073204575,-3.9820862134785551&markers=48.726304979176675,-3.9829935637739382|48.724117073204575,-3.9820862134785551"
      const query = endpoint + params

      const res = await request(server).get(query)

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe("image/png")
    });
});
  

