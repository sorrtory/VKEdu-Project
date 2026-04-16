import { Injectable, UnauthorizedException } from "@nestjs/common"
import { UsersService } from "../users/users.service"
import { JwtService } from "@nestjs/jwt"
import * as bcrypt from "bcrypt"
import { SignOptions } from "jsonwebtoken"
import { PrismaService } from "../prisma/prisma.service"
import { CreateUserDto } from "../users/dto/create-user.dto"
import { AuthUser } from "./types/auth-user.type"
import { JwtPayload } from "./types/jwt-payload.type"
import { getJwtSecret } from "./jwt-config"

type TokenPair = {
  accessToken: string
  refreshToken: string
}

type JwtExpiresIn = NonNullable<SignOptions["expiresIn"]>

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async validateUser(email: string, pass: string): Promise<AuthUser | null> {
    const user = await this.usersService.findByEmail(email)
    if (!user) return null
    const valid = await bcrypt.compare(pass, user.passwordHash)
    if (valid) {
      return {
        userId: user.userId,
        email: user.email,
        nickname: user.nickname,
      }
    }
    return null
  }

  async login(user: AuthUser) {
    const payload: JwtPayload = { sub: user.userId, email: user.email }

    return this.issueTokenPair(payload)
  }

  async register(dto: CreateUserDto) {
    const user = await this.usersService.create(dto)
    return this.login(user)
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: getJwtSecret(),
      })
      const activeTokens = await this.findActiveRefreshTokens(payload.sub)

      for (const storedToken of activeTokens) {
        const match = await bcrypt.compare(refreshToken, storedToken.token)
        if (match) {
          await this.revokeRefreshToken(storedToken.refreshTokenId)
          return this.issueTokenPair(payload)
        }
      }

      throw new UnauthorizedException("Invalid refresh token")
    } catch {
      throw new UnauthorizedException("Invalid refresh token")
    }
  }

  async logout(refreshToken: string) {
    const activeTokens = await this.findActiveRefreshTokens()

    for (const storedToken of activeTokens) {
      const match = await bcrypt.compare(refreshToken, storedToken.token)
      if (match) {
        await this.revokeRefreshToken(storedToken.refreshTokenId)
        return true
      }
    }

    return false
  }

  private async issueTokenPair(payload: JwtPayload): Promise<TokenPair> {
    const accessToken = this.signToken(
      payload,
      this.getExpiresIn("BACKEND_JWT_EXPIRES_IN", "15m"),
    )
    const refreshToken = this.signToken(
      payload,
      this.getExpiresIn("BACKEND_JWT_REFRESH_EXPIRES_IN", "7d"),
    )

    await this.storeRefreshToken(payload.sub, refreshToken)

    return { accessToken, refreshToken }
  }

  private signToken(payload: JwtPayload, expiresIn: JwtExpiresIn): string {
    return this.jwtService.sign(payload, { expiresIn })
  }

  private getExpiresIn(
    envName: "BACKEND_JWT_EXPIRES_IN" | "BACKEND_JWT_REFRESH_EXPIRES_IN",
    fallback: JwtExpiresIn,
  ): JwtExpiresIn {
    const value = process.env[envName]
    if (!value) {
      return fallback
    }

    const numericValue = Number(value)
    if (Number.isInteger(numericValue) && `${numericValue}` === value) {
      return numericValue
    }

    return value as JwtExpiresIn
  }

  private async storeRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<void> {
    const hashedToken = await bcrypt.hash(refreshToken, 10)

    await this.prisma.refreshToken.create({
      data: {
        token: hashedToken,
        userId,
        expiresAt: null,
      },
    })
  }

  private findActiveRefreshTokens(userId?: string) {
    return this.prisma.refreshToken.findMany({
      where: {
        revoked: false,
        ...(userId ? { userId } : {}),
      },
    })
  }

  private async revokeRefreshToken(refreshTokenId: number): Promise<void> {
    await this.prisma.refreshToken.update({
      where: { refreshTokenId },
      data: { revoked: true },
    })
  }
}
