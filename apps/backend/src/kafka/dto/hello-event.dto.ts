import { IsString } from "class-validator"
import { ApiProperty } from "@nestjs/swagger"

export class HelloEventDto {
  @ApiProperty({ example: "Test message from /emit endpoint" })
  @IsString()
  message!: string
}
