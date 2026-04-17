import { ApiProperty } from "@nestjs/swagger"
import { IsNotEmpty, IsString } from "class-validator"

export class CreateConferenceDto {
  @ApiProperty({
    description: "Conference name used by the legacy MVP API",
    example: "math-lesson-1",
  })
  @IsString()
  @IsNotEmpty()
  conferenceName!: string
}
