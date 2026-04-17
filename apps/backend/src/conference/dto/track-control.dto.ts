import { ApiProperty } from "@nestjs/swagger"
import { IsNotEmpty, IsString } from "class-validator"

export class TrackControlDto {
  @ApiProperty({
    description: "Conference / room name",
    example: "math-lesson-1",
  })
  @IsString()
  @IsNotEmpty()
  conferenceName!: string

  @ApiProperty({
    description: "Participant requesting the moderation action",
    example: "teacher-anna",
  })
  @IsString()
  @IsNotEmpty()
  callertName!: string

  @ApiProperty({
    description: "Participant whose media track is being changed",
    example: "student-ivan",
  })
  @IsString()
  @IsNotEmpty()
  targettName!: string
}
