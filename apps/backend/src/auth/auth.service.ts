import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async validateUser(email: string, pass: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) return null;
    const valid = await bcrypt.compare(pass, user.password);
    if (valid) {
      // Exclude password
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...result } = user as any;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { sub: user.id, email: user.email };
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    });

    // store hashed refresh token
    const hashed = await bcrypt.hash(refreshToken, 10);
    await this.prisma.refreshToken.create({
      data: {
        token: hashed,
        userId: user.id,
        expiresAt: null,
      },
    });

    return { accessToken, refreshToken };
  }

  async register(email: string, password: string, name?: string) {
    const user = await this.usersService.create({ email, password, name });
    return this.login(user);
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
      }) as any;
      const userId = payload.sub;
      const tokens = await this.prisma.refreshToken.findMany({ where: { userId, revoked: false } });
      // compare hashed tokens
      for (const t of tokens) {
        const match = await bcrypt.compare(refreshToken, t.token);
        if (match) {
          // rotate: revoke old token and create new
          await this.prisma.refreshToken.update({ where: { id: t.id }, data: { revoked: true } });
          const newPayload = { sub: payload.sub, email: payload.email };
              const accessToken = this.jwtService.sign(newPayload, {
                expiresIn: process.env.JWT_EXPIRES_IN || '15m',
              });
              const newRefreshToken = this.jwtService.sign(newPayload, {
                expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
              });
          const hashed = await bcrypt.hash(newRefreshToken, 10);
          await this.prisma.refreshToken.create({ data: { token: hashed, userId, expiresAt: null } });
          return { accessToken, refreshToken: newRefreshToken };
        }
      }
      throw new UnauthorizedException('Invalid refresh token');
    } catch (e) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(refreshToken: string) {
    // mark refresh token revoked if present
    const tokens = await this.prisma.refreshToken.findMany({ where: { revoked: false } });
    for (const t of tokens) {
      const match = await bcrypt.compare(refreshToken, t.token);
      if (match) {
        await this.prisma.refreshToken.update({ where: { id: t.id }, data: { revoked: true } });
        return true;
      }
    }
    return false;
  }
}
