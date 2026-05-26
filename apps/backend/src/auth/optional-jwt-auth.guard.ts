import { Injectable, UnauthorizedException } from "@nestjs/common"
import { AuthGuard } from "@nestjs/passport"
import type { AuthUser } from "./types/auth-user.type"

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard("jwt") {
  handleRequest<TUser = AuthUser | null>(
    err: unknown,
    user: TUser | false,
  ): TUser | null {
    if (err) {
      throw err instanceof Error ? err : new UnauthorizedException()
    }

    return user || null
  }
}
