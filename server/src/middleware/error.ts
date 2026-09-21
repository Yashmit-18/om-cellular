import { Request, Response, NextFunction } from 'express'
import { env } from '../config/env'

export class AppError extends Error {
  statusCode: number
  constructor(message: string, statusCode: number) {
    super(message)
    this.statusCode = statusCode
    this.name = 'AppError'
  }
}

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  console.error('Error:', err.message)

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    })
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: err.message,
    })
  }

  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format',
    })
  }

  if ((err as any).code === 11000) {
    return res.status(409).json({
      success: false,
      message: 'Duplicate entry',
    })
  }

  // Malformed JSON bodies from body-parser (e.g. truncated or non-JSON input)
  // are a client error → 400. Detect via body-parser's error marker rather
  // than the generic SyntaxError name so real server-side throws keep 500.
  if ((err as any).type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON body',
    })
  }

  return res.status(500).json({
    success: false,
    message: env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  })
}
