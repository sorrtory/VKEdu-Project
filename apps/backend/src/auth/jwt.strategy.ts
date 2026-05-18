import { Injectable, UnauthorizedException } from "@nestjs/common"
import { PassportStrategy } from "@nestjs/passport"
import { ExtractJwt, Strategy, StrategyOptions } from "passport-jwt"
import { ConfigService } from "@nestjs/config"
import { UsersService } from "../users/users.service"
import type { AuthUser } from "./types/auth-user.type"
import type { JwtPayload } from "./types/jwt-payload.type"
import { getJwtSecret } from "./jwt-config"

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    _config: ConfigService,
    private readonly usersService: UsersService,
  ) {
    const options: StrategyOptions = {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: getJwtSecret(),
    }

    super(options)
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    const user = await this.usersService.findById(payload.sub)
    if (!user) {
      throw new UnauthorizedException()
    }

    return {
      userId: user.userId,
      email: user.email,
      nickname: user.nickname,
    }
  }
}
