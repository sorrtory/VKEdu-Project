import { ApiProperty } from "@nestjs/swagger"
import { IsNotEmpty, IsString } from "class-validator"

export class GenerateTokenDto {
  @ApiProperty({
    description: "LiveKit room name",
    example: "math-lesson-1",
  })
  @IsString()
  @IsNotEmpty()
  roomName!: string

  @ApiProperty({
    description: "Participant identity and display name",
    example: "teacher-anna",
  })
  @IsString()
  @IsNotEmpty()
  participantName!: string
}
