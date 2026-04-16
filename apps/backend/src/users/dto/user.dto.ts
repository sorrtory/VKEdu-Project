import { ApiProperty } from "@nestjs/swagger"
import type { User } from "../../generated/prisma/client"

export class UserDto {
  @ApiProperty({
    example: "6ab7b1e8-0687-4f78-9c13-a5a2e249fafe",
    description: "User identifier",
  })
  userId!: string

  @ApiProperty({
    example: "student@example.com",
    description: "Unique user email address",
  })
  email!: string

  @ApiProperty({
    example: "math_mentor",
    description: "Display nickname",
  })
  nickname!: string

  @ApiProperty({
    example: "2026-04-14T08:30:00.000Z",
    description: "Creation timestamp",
  })
  createdAt!: Date

  @ApiProperty({
    example: "2026-04-14T08:30:00.000Z",
    description: "Last update timestamp",
  })
  updatedAt!: Date

  constructor(data?: Partial<UserDto>) {
    Object.assign(this, data)
  }

  static fromModel(
    user: Pick<
      User,
      "userId" | "email" | "nickname" | "createdAt" | "updatedAt"
    >,
  ): UserDto {
    return new UserDto({
      userId: user.userId,
      email: user.email,
      nickname: user.nickname,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    })
  }
}
