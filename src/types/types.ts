// src/types.ts
import { Request } from "express"

export interface MapRequest extends Request {
  query: { [key: string]: string | string[] | undefined }
  body: Record<string, any>
  path: string
}

export interface ClientRateLimitInfo {
  totalHits: number;       // Number of requests made in the window
  resetTime: Date;         // When the window resets
  // maybe other props depending on version
}
