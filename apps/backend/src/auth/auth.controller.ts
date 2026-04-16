import { Controller, Post, Body, UseGuards, Req, Get } from "@nestjs/common"
import { AuthService } from "./auth.service"
import { CreateUserDto } from "../users/dto/create-user.dto"
import { RefreshTokenDto } from "./dto/refresh-token.dto"
import { LocalAuthGuard } from "./local-auth.guard"
import { JwtAuthGuard } from "./jwt-auth.guard"
import { UsersService } from "../users/users.service"
import { UserDto } from "../users/dto/user.dto"
import type { RequestWithUser } from "./types/request-with-user.type"

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Post("register")
  async register(@Body() dto: CreateUserDto) {
    return this.authService.register(dto)
  }

  @UseGuards(LocalAuthGuard)
  @Post("login")
  async login(@Req() req: RequestWithUser) {
    return this.authService.login(req.user)
  }

  @Post("refresh")
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken)
  }

  @Post("logout")
  async logout(@Body() dto: RefreshTokenDto) {
    return this.authService.logout(dto.refreshToken)
  }

  @UseGuards(JwtAuthGuard)
  @Get("me")
  async getMe(@Req() req: RequestWithUser): Promise<UserDto> {
    return this.usersService.findOne(req.user.userId)
  }
}
