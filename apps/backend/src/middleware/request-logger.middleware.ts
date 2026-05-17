import { Injectable, Logger, NestMiddleware } from "@nestjs/common"
import type { Request, Response, NextFunction } from "express"

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger("HTTPLoggingMiddleware")

  use(req: Request, res: Response, next: NextFunction): void {
    const startedAt = Date.now()

    res.on("finish", () => {
      const durationMs = Date.now() - startedAt

      this.logger.log(
        `${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs}ms`,
      )
    })

    next()
  }
}
