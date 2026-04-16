import { Module } from "@nestjs/common"
import { AuthService } from "./auth.service"
import { UsersModule } from "../users/users.module"
import { JwtModule } from "@nestjs/jwt"
import { PassportModule } from "@nestjs/passport"
import { LocalStrategy } from "./local.strategy"
import { JwtStrategy } from "./jwt.strategy"
import { AuthController } from "./auth.controller"
import { PrismaModule } from "../prisma/prisma.module"
import { ConfigModule, ConfigService } from "@nestjs/config"
import { getJwtSecret } from "./jwt-config"

@Module({
  imports: [
    ConfigModule,
    UsersModule,
    PrismaModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: getJwtSecret(),
        signOptions: {
          expiresIn: config.get("BACKEND_JWT_EXPIRES_IN") || "15m",
        },
      }),
    }),
  ],
  providers: [AuthService, LocalStrategy, JwtStrategy],
  controllers: [AuthController],
})
export class AuthModule {}
