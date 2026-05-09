import { ApiPropertyOptional, PartialType } from "@nestjs/swagger"
import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator"
import { CreateUserDto } from "./create-user.dto"

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiPropertyOptional({
    example: "updated@example.com",
    description: "Updated unique email address",
  })
  @IsOptional()
  @IsEmail()
  email?: string

  @ApiPropertyOptional({
    example: "new-strong-pass-123",
    description: "New plain password that will be stored as a hash",
    minLength: 6,
  })
  @IsOptional()
  @MinLength(6)
  password?: string

  @ApiPropertyOptional({
    example: "physics_mentor",
    description: "Updated display nickname",
    minLength: 2,
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  nickname?: string
}
