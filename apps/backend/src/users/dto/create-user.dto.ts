import { ApiProperty } from "@nestjs/swagger"
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator"

export class CreateUserDto {
  @ApiProperty({
    example: "student@example.com",
    description: "Unique user email address",
  })
  @IsEmail()
  email!: string

  @ApiProperty({
    example: "strong-pass-123",
    description: "Plain password that will be stored as a hash",
    minLength: 6,
  })
  @IsNotEmpty()
  @MinLength(6)
  password!: string

  @ApiProperty({
    example: "math_mentor",
    description: "Display name visible in the product",
    minLength: 2,
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  nickname!: string
}
